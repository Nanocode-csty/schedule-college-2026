export interface CeldaHorario {
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
}

export interface SeleccionTemporal {
  idDocente: number;
  idComponente: number;
  idAsignacion: number;
  numeroGrupoGeneral: number;
  idGrupo: number;
  idAmbiente: number;
  modoPrueba?: boolean;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  sesionId: string;
}

export interface DisponibilidadCelda {
  diaSemana: string;
  horaInicio: string;
  estado: 'LIBRE' | 'OCUPADO' | 'SELECCION_TEMPORAL' | 'BLOQUEO_INSTITUCIONAL' | 'DOCENTE_OTRO_AMBIENTE';
  info?: {
    idAmbiente?: number;
    ambienteCodigo?: string;
    curso?: string;
    tipoComponente?: string;
    grupo?: string;
    seccion?: string;
    confirmado?: boolean;
    estadoBloque?: string;
    detalle?: string;
  };
}

export interface MatrizDisponibilidad {
  ambienteId: number;
  ambienteCodigo: string;
  filas: {
    horaInicio: string;
    horaFin: string;
    celdas: DisponibilidadCelda[];
  }[];
}

export interface ValidacionResultado {
  valido: boolean;
  conflictos: string[];
  advertencias: string[];
}

export interface ProgresoCurso {
  idAsignacion: number;
  idComponente: number;
  nombreCurso: string;
  tipoComponente: string;
  numeroGrupoGeneral: number;
  horasRequeridas: number;
  horasAsignadas: number;
}

// Añadir estos tipos al archivo existente
export interface BloqueHorario {
  id: number;
  idPeriodo: number;
  idDocente: number;
  idComponente: number;
  idGrupo: number;
  idAmbiente?: number | null;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  idVentana?: number;
}

export interface ConflictoGlobal {
  tipo: string;
  descripcion: string;
  involucrados: string[];
}

export interface RegistroAuditoria {
  id: number;
  idBloqueHorario?: number;
  tipoAccion: string;
  usuario: string;
  fecha: Date;
  detalle: string;
}
