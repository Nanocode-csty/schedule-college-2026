import { z } from 'zod';

export const crearCursoSchema = z.object({
  nombre: z.string().min(1).max(150),
  codigo: z.string().min(1).max(20),
  creditos: z.coerce.number().int().min(1).default(1),
  ciclo: z.coerce.number().int().min(1).max(10).nullable().optional(),
  horas_teoricas: z.coerce.number().int().min(0).default(0),
  horas_practica: z.coerce.number().int().min(0).default(0),
  horas_laboratorio: z.coerce.number().int().min(0).default(0),
  condicion: z.enum(['OBLIGATORIO', 'ELECTIVO', 'S']).nullable().optional(),
  id_departamento: z.number().int().positive().nullable().optional(),
  id_curricula: z.number().int().positive().nullable().optional(),
  id_sede: z.number().int().positive().nullable().optional(),
});

export const actualizarCursoSchema = crearCursoSchema.partial();
