import { Request, Response } from 'express';
import { CargaHorariaService } from './carga-horaria.service';
import { z } from 'zod';

const asignarCargaSchema = z.object({
  id_componente: z.number().int().positive(),
  id_docente: z.number().int().positive(),
  horas_asignadas: z.number().int().positive(),
  numero_grupo_general: z.number().int().min(0).max(2).optional(),
});

const configurarOfertaSchema = z.object({
  id_periodo: z.number().int().positive(),
  id_curso: z.number().int().positive(),
  id_ciclo: z.number().int().positive(),
  tipo_curso: z.enum(['REGULAR', 'ELECTIVO']),
  componentes: z.array(z.object({
    tipo: z.enum(['TEORIA', 'PRACTICA', 'LABORATORIO']),
    horas_requeridas: z.number().int().positive(),
    n_grupos: z.number().int().min(1),
  })),
});

const previewGenerarSchema = z.object({
  id_periodo: z.number().int().positive(),
  ids_curricula: z.array(z.number().int().positive()).min(1),
  ids_cursos_adicionales: z.array(z.number().int().positive()).optional(),
  ids_cursos_excluidos: z.array(z.number().int().positive()).optional(),
});

const confirmarGenerarSchema = z.object({
  id_periodo: z.number().int().positive(),
  cursos: z.array(z.object({
    id_curso: z.number().int().positive(),
    id_ciclo: z.number().int().positive(),
    tipo_curso: z.enum(['REGULAR', 'ELECTIVO']),
    componentes: z.array(z.object({
      tipo: z.enum(['TEORIA', 'LABORATORIO']),
      horas_requeridas: z.number().int().positive(),
      n_grupos: z.number().int().min(1),
      id_docente_asignado: z.number().int().positive().nullable().optional(),
    })),
  })),
});

export class CargaHorariaController {
  static async asignarCarga(req: Request, res: Response) {
    try {
      const datos = asignarCargaSchema.parse(req.body) as any;
      const resultado = await CargaHorariaService.asignarCarga(datos);
      res.json(resultado);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  static async actualizarAsignacion(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { horas_asignadas } = req.body;
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
      if (typeof horas_asignadas !== 'number') return res.status(400).json({ error: 'Horas inválidas' });
      const resultado = await CargaHorariaService.actualizarAsignacion(id, { horas_asignadas });
      res.json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async obtenerResumenCarga(req: Request, res: Response) {
    try {
      const id_periodo = parseInt(req.params.id_periodo);
      if (isNaN(id_periodo)) return res.status(400).json({ error: 'ID de periodo inválido' });
      const resumen = await CargaHorariaService.obtenerResumenCarga(id_periodo);
      res.json(resumen);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async configurarOferta(req: Request, res: Response) {
    try {
      const datos = configurarOfertaSchema.parse(req.body);
      const resultado = await CargaHorariaService.configurarOferta(datos as any);
      res.status(201).json(resultado);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  static async eliminarAsignacion(req: Request, res: Response) {
    try {
      const id_asignacion = parseInt(req.params.id_asignacion);
      if (isNaN(id_asignacion)) return res.status(400).json({ error: 'ID de asignación inválido' });
      const resultado = await CargaHorariaService.eliminarAsignacion(id_asignacion);
      res.json(resultado);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async eliminarOferta(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID de oferta inválido' });
      const resultado = await CargaHorariaService.eliminarOferta(id);
      res.json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async obtenerOfertaDetalle(req: Request, res: Response) {
    try {
      const id_periodo = parseInt(req.query.id_periodo as string);
      const id_curso = parseInt(req.query.id_curso as string);
      const id_ciclo = parseInt(req.query.id_ciclo as string);
      if (isNaN(id_periodo) || isNaN(id_curso) || isNaN(id_ciclo)) {
        return res.status(400).json({ error: 'Parámetros inválidos' });
      }
      const resultado = await CargaHorariaService.obtenerOfertaDetalle(id_periodo, id_curso, id_ciclo);
      res.json(resultado);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async obtenerCiclosPorPeriodo(req: Request, res: Response) {
    try {
      const id_periodo = parseInt(req.params.id_periodo);
      if (isNaN(id_periodo)) return res.status(400).json({ error: 'ID de periodo inválido' });
      const ciclos = await CargaHorariaService.obtenerCiclosPorPeriodo(id_periodo);
      res.json(ciclos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async obtenerCursosPorCiclo(req: Request, res: Response) {
    try {
      const id_periodo = parseInt(req.params.id_periodo);
      const id_ciclo = req.query.id_ciclo ? parseInt(req.query.id_ciclo as string) : undefined;
      const id_curricula = req.query.id_curricula ? parseInt(req.query.id_curricula as string) : undefined;
      const numero_grupo_general = req.query.numero_grupo_general ? parseInt(req.query.numero_grupo_general as string) : undefined;
      if (isNaN(id_periodo)) return res.status(400).json({ error: 'ID de periodo inválido' });
      const cursos = await CargaHorariaService.obtenerCursosPorCiclo(id_periodo, id_ciclo, id_curricula, numero_grupo_general);
      res.json(cursos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async sugerirDocentes(req: Request, res: Response) {
    try {
      const id_curso = parseInt(req.query.id_curso as string);
      if (isNaN(id_curso)) return res.status(400).json({ error: 'ID de curso inválido' });
      const resultado = await CargaHorariaService.sugerirDocentes(id_curso);
      res.json(resultado);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async previewGenerarOferta(req: Request, res: Response) {
    try {
      const datos = previewGenerarSchema.parse(req.body) as any;
      const resultado = await CargaHorariaService.previewGenerarOferta(datos);
      res.json(resultado);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  static async confirmarGenerarOferta(req: Request, res: Response) {
    try {
      const datos = confirmarGenerarSchema.parse(req.body) as any;
      const resultado = await CargaHorariaService.confirmarGenerarOferta(datos);
      res.status(201).json(resultado);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }
}
