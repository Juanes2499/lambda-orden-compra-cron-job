import { APIGatewayEvent, Handler } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb"
import moment from "moment-timezone";
import { OrdenCompraDynamoDB } from "./models/OrdenCompraDynamoDB";
import { InputData } from "./models/InputData";
import { OrdenCompra } from "./models/OrdenCompra";

const dynamoDBClient = new DynamoDBClient({ region: "us-east-1" });
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDBClient);

const sqs = new SQSClient({ region: "us-east-1" });

export const handler: Handler = async (event: APIGatewayEvent) => {

  const inputData = event.body as unknown as InputData;

  console.info("Body: ", inputData)

  const ordenCompraProcessed: any[] = [];

  try{

    const query = {
      TableName: "DynamoDb-Orden-Compra",
      FilterExpression: "#nested.#attribute.#subAttribute = :value",
      ExpressionAttributeNames: {
        "#nested": "stages",
        "#attribute": "domiciliosProcessFailed",
        "#subAttribute": "success"
      },
      ExpressionAttributeValues: {
        ":value": { "BOOL": true }
      }
    };

    const command = new ScanCommand(query);
    const qeueryResult = await dynamoDBClient.send(command);

    console.info("Length data result: ", qeueryResult.Items?.length)

    for (const item of qeueryResult.Items || []) {

      const itemJson = unmarshall(item) as OrdenCompraDynamoDB;

      console.info(`Reprocess Orden Compra ID: ${itemJson.ordenCompraId}`);

      console.info(`Orden Compra details: ${JSON.stringify(itemJson)}`)

      try {
        const timezone = 'America/Bogota';
        const currentTime = moment().tz(timezone).format();

        const stages = item.stages?.M;
        const putInSqsDomicilios = stages?.putInSqsDomicilios?.M;
        const attempsPutInSqsDomicilios = Number(putInSqsDomicilios?.attempts?.N);
        const attempProcessed = attempsPutInSqsDomicilios + 1;

        const itemToUpdate = {
          TableName: "DynamoDb-Orden-Compra",
          Key: { ordenCompraId: itemJson.ordenCompraId },
          UpdateExpression: "SET stages.putInSqsDomicilios.attempts = :attemptsPutInSqsDomicilios, stages.putInSqsDomicilios.success = :successPutInSqsDomicilios, stages.putInSqsDomicilios.updatedAt = :updatedAtputInSqsDomicilios, stages.domiciliosProcessFailed.success = :successDomiciliosProcessFailed, stages.domiciliosProcessFailed.updatedAt = :updatedAtDomiciliosProcessFailed, mockDLQ.process = :mockDLQProcess, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":attemptsPutInSqsDomicilios": attempProcessed,
            ":successPutInSqsDomicilios": true,
            ":updatedAtputInSqsDomicilios": currentTime.toString(),
            ":successDomiciliosProcessFailed": false,
            ":updatedAtDomiciliosProcessFailed": currentTime.toString(),
            ":mockDLQProcess": inputData.mockDLQ.process,
            ":updatedAt": currentTime.toString(),
          },
        };

        await ddbDocClient.send(new UpdateCommand(itemToUpdate));

        console.info(`Orden Compra ID: ${itemJson.ordenCompraId} Updated in DynamoDB - attemps: ${attempProcessed}`);

        try{

          const params = {
            QueueUrl: "https://sqs.us-east-1.amazonaws.com/211125768545/Sqs-Domicilios",
            MessageBody: JSON.stringify({
              ordenCompraId: itemJson.ordenCompraId,
              data: {
                productos: itemJson.productos,
                cliente: itemJson.cliente,
                valorTotalPagar: itemJson.valorTotalPagar,
                mockDLQ: inputData.mockDLQ
              } as OrdenCompra
            }),
          };

          const dataSqsSent = await sqs.send(new SendMessageCommand(params));

          ordenCompraProcessed.push({...dataSqsSent.$metadata, MessageId: dataSqsSent.MessageId})

          console.info(`Orden Compra ID: ${itemJson.ordenCompraId} sent to SQS Domicilios`);

        } catch (errSqs){
          console.error("Error", errSqs);
          throw new Error(`Error pushing to SQS Domicilios - Orden Compra ID: ${itemJson.ordenCompraId}`);
        }
      } catch (errUpdatingDynamoDb) {
        console.error("Error updating record", item, errUpdatingDynamoDb);
        throw new Error(`Errors occurred updating records: ${errUpdatingDynamoDb}`);
      }
    }

    return {
      statusCode: 500,
      body: ordenCompraProcessed
    };

  }catch (errQueryDynamoDB) {
      console.error("Error query record", errQueryDynamoDB);
      throw new Error(`Errors occurred query records: ${errQueryDynamoDB}`);
  }
};