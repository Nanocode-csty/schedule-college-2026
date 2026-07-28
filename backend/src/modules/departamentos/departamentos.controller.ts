import { Request, Response } from 'express';
import { DepartamentosService } from './departamentos.service';
import { crearDepartamentoSchema, actualizarDepartamentoSchema } from './departamentos.types';

export class DepartamentosController {
  static async listar(req: Request, res: Response) {
    try {
      const deps = await DepartamentosService.listar();
      res.json(deps);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async obtener(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
      const dep = await DepartamentosService.obtenerPorId(id);
      if (!dep) return res.status(404).json({ error: 'Departamento no encontrado' });
      res.json(dep);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async crear(req: Request, res: Response) {
    try {
      const datos = crearDepartamentoSchema.parse(req.body) as any;
      const dep = await DepartamentosService.crear(datos);
      res.status(201).json(dep);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      if (error.code === 'P2002') return res.status(409).json({ error: 'Ya existe un departamento con ese código' });
      res.status(500).json({ error: error.message });
    }
  }

  static async actualizar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
      const datos = actualizarDepartamentoSchema.parse(req.body) as any;
      const dep = await DepartamentosService.actualizar(id, datos);
      res.json(dep);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
      res.status(500).json({ error: error.message });
    }
  }

  static async eliminar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
      await DepartamentosService.eliminar(id);
      res.json({ mensaje: 'Departamento desactivado' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async reactivar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
      const dep = await DepartamentosService.reactivar(id);
      res.json(dep);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
