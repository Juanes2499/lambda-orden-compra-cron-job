# AWS Lambda Function - Orden Compra Cron Job

## Introuction
Exmaple of AWS Lambda that is triggered by AWS API Gateway, get information from AWS DynamoDB and send data in batch to AWS SQS

## Develop in Local
- Execute npm run develop-in-local

## Prepare ZIP file to upload to lambda
- Execute npm run build-zip
- A aws-lambda-domicilios-dlq.zip is created, this is the file you will have to upload to AWS Lambda