import { Router } from 'express';
import { CargaHorariaController } from './carga-horaria.controller';
import { middlewareAutenticacion } from '@/middleware/autenticacion';

const router = Router();
router.use(middlewareAutenticacion);

router.get('/resumen/:id_periodo', CargaHorariaController.obtenerResumenCarga);
router.get('/oferta/detalle', CargaHorariaController.obtenerOfertaDetalle);
router.get('/ciclos/:id_periodo', CargaHorariaController.obtenerCiclosPorPeriodo);
router.get('/cursos/:id_periodo', CargaHorariaController.obtenerCursosPorCiclo);
router.get('/sugerir-docentes', CargaHorariaController.sugerirDocentes);
router.post('/asignar', CargaHorariaController.asignarCarga);
router.post('/configurar-oferta', CargaHorariaController.configurarOferta);
router.post('/generar-oferta/preview', CargaHorariaController.previewGenerarOferta);
router.post('/generar-oferta/confirmar', CargaHorariaController.confirmarGenerarOferta);
router.put('/asignacion/:id', CargaHorariaController.actualizarAsignacion);
router.delete('/asignacion/:id_asignacion', CargaHorariaController.eliminarAsignacion);
router.delete('/oferta/:id', CargaHorariaController.eliminarOferta);

export default router;
