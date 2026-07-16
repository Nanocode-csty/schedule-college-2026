import { z } from 'zod';

export const crearSedeSchema = z.object({
  nombre: z.string().min(1).max(100),
  codigo: z.string().min(1).max(20),
  tipo: z.enum(['CENTRAL', 'DESCONCENTRADA']).default('DESCONCENTRADA'),
  distrito: z.string().max(100).optional().nullable(),
  provincia: z.string().max(100).optional().nullable(),
});

export const actualizarSedeSchema = crearSedeSchema.partial();
