import { z } from 'zod';

export const restriccionesSchema = z.object({
  FRANJA_INICIO: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  FRANJA_FIN: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  HORAS_MAX_DIARIAS: z.union([z.string(), z.number()]).transform(val => Number(val)).pipe(z.number().int().min(1).max(16)).optional(),
  BLOQUEO_ALMUERZO_INICIO: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  BLOQUEO_ALMUERZO_FIN: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  TIEMPO_ATENCION_VENTANA: z.union([z.string(), z.number()]).transform(val => Number(val)).pipe(z.number().int().min(1).max(60)).optional(),
  LABORA_SABADO: z.union([z.string(), z.boolean()]).transform(val => val === 'true' || val === true).optional(),
  NUM_GRUPOS_GENERALES: z.union([z.string(), z.number()]).transform(val => Number(val)).pipe(z.number().int().min(1).max(3)).optional(),
});

export const diaNoLaborableSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  descripcion: z.string().min(1).max(200),
  tipo: z.enum(['FERIADO', 'MANTENIMIENTO']),
});

export const actualizarDiaNoLaborableSchema = diaNoLaborableSchema.partial();