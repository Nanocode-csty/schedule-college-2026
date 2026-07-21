export interface DisponibilidadCeldaInfo {
  idAmbiente?: number;
  ambienteCodigo?: string;
  curso?: string;
  tipoComponente?: string;
  grupo?: string;
  seccion?: string;
  ciclo?: number | null;
  detalle?: string;
  confirmado?: boolean;
  estadoBloque?: string;
  sesionId?: string;
}

export interface DisponibilidadCelda {
  diaSemana: string;
  horaInicio: string;
  estado: 'LIBRE' | 'OCUPADO' | 'SELECCION_TEMPORAL' | 'BLOQUEO_INSTITUCIONAL' | 'DOCENTE_OTRO_AMBIENTE';
  info?: DisponibilidadCeldaInfo;
}

export interface FilaDisponibilidad {
  horaInicio: string;
  horaFin: string;
  celdas: DisponibilidadCelda[];
}

export interface MatrizDisponibilidadResponse {
  ambienteId: number;
  ambienteCodigo: string;
  filas: FilaDisponibilidad[];
}