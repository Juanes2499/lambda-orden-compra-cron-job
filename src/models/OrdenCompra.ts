import { Cliente } from "./Cliente";
import { MockDLQ } from "./MockDQL";
import { Producto } from "./Producto";

export interface OrdenCompra {
  productos: Producto[];
  valorTotalPagar: string;
  cliente: Cliente;
  mockDLQ?: MockDLQ;
}
