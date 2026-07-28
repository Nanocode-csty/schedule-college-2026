import { Router } from 'express';
import { DepartamentosController } from './departamentos.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router = Router();
router.use(middlewareAutenticacion);

router.get('/', DepartamentosController.listar);
router.post('/', DepartamentosController.crear);
router.get('/:id', DepartamentosController.obtener);
router.put('/:id', DepartamentosController.actualizar);
router.delete('/:id', DepartamentosController.eliminar);
router.put('/:id/reactivar', DepartamentosController.reactivar);

export default router;
