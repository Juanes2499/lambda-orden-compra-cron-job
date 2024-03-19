import { Contacto } from "./Contacto";
import { Direccion } from "./Direccion";

export interface Cliente {
  clienteId: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numerodDocuemnto: string;
  paisDocumento: string;
  contacto: Contacto;
  direccion: Direccion;
  aplicaFacturaElectronica: boolean;
}
