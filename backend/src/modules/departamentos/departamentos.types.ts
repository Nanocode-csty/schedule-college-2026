import { z } from 'zod';

export const crearDepartamentoSchema = z.object({
  nombre: z.string().min(1).max(200),
  codigo: z.string().min(1).max(20),
});

export const actualizarDepartamentoSchema = crearDepartamentoSchema.partial();
