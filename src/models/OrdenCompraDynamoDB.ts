import { MockDLQ } from "./MockDQL";
import { OrdenCompra } from "./OrdenCompra";

interface Stage {
    attempts?: number;
    success: boolean;
    updatedAt: string;
}

export interface OrdenCompraDynamoDB extends OrdenCompra {
    ordenCompraId: string;
    stages: {
        putInSqsDomicilios: Stage;
        domiciliosProcessFailed: Stage;
        domiciliosProcessed: Stage;
    };
    updatedAt: string;
    createdAt: string;
    mockDLQ: MockDLQ;
}
