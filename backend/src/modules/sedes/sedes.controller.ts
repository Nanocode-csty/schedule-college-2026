import { Request, Response } from 'express';
import { SedesService } from './sedes.service';
import { crearSedeSchema, actualizarSedeSchema } from './sedes.schema';

export class SedesController {
  static async listar(req: Request, res: Response) {
    try {
      const sedes = await SedesService.listar();
      res.json(sedes);
    } catch (error) {
      console.error('Error al listar sedes:', error);
      res.status(500).json({ error: 'Error al obtener las sedes' });
    }
  }

  static async obtener(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const sede = await SedesService.obtenerPorId(id);
      if (!sede) return res.status(404).json({ error: 'Sede no encontrada' });
      res.json(sede);
    } catch (error) {
      console.error('Error al obtener sede:', error);
      res.status(500).json({ error: 'Error al obtener la sede' });
    }
  }

  static async obtenerCentral(req: Request, res: Response) {
    try {
      const sede = await SedesService.obtenerCentral();
      if (!sede) return res.status(404).json({ error: 'No hay una sede central' });
      res.json(sede);
    } catch (error) {
      console.error('Error al obtener sede central:', error);
      res.status(500).json({ error: 'Error al obtener la sede central' });
    }
  }

  static async crear(req: Request, res: Response) {
    try {
      const datos = crearSedeSchema.parse(req.body);
      const sede = await SedesService.crear(datos);
      res.status(201).json(sede);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe una sede con ese código' });
      }
      console.error('Error al crear sede:', error);
      res.status(500).json({ error: 'Error al crear la sede' });
    }
  }

  static async actualizar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const datos = actualizarSedeSchema.parse(req.body);
      const sede = await SedesService.actualizar(id, datos);
      res.json(sede);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      }
      console.error('Error al actualizar sede:', error);
      res.status(500).json({ error: 'Error al actualizar la sede' });
    }
  }

  static async eliminar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      await SedesService.eliminar(id);
      res.json({ mensaje: 'Sede desactivada correctamente' });
    } catch (error) {
      console.error('Error al eliminar sede:', error);
      res.status(500).json({ error: 'Error al desactivar la sede' });
    }
  }

  static async reactivar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const sede = await SedesService.reactivar(id);
      res.json(sede);
    } catch (error) {
      console.error('Error al reactivar sede:', error);
      res.status(500).json({ error: 'Error al reactivar la sede' });
    }
  }
}
