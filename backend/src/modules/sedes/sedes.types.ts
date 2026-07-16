export interface Sede {
  id: number;
  nombre: string;
  codigo: string;
  tipo: 'CENTRAL' | 'DESCONCENTRADA';
  distrito?: string | null;
  provincia?: string | null;
  activo: boolean;
}
