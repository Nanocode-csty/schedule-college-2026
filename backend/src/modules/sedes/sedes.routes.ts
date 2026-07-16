import { Router, type Router as ExpressRouter } from 'express';
import { SedesController } from './sedes.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router: ExpressRouter = Router();

router.use(middlewareAutenticacion);

router.get('/', SedesController.listar);
router.get('/central', SedesController.obtenerCentral);
router.post('/', SedesController.crear);
router.get('/:id', SedesController.obtener);
router.put('/:id', SedesController.actualizar);
router.delete('/:id', SedesController.eliminar);
router.put('/:id/reactivar', SedesController.reactivar);

export default router;
