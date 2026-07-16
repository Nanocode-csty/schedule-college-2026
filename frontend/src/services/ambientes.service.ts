import { apiClient } from '@/lib/api-client';

export const ambientesService = {
  listar: (tipo?: string) =>
    apiClient.get('/ambientes', { params: tipo ? { tipo } : {} }),
  obtener: (id: number) => apiClient.get(`/ambientes/${id}`),
  crear: (datos: any) => apiClient.post('/ambientes', datos),
  actualizar: (id: number, datos: any) => apiClient.put(`/ambientes/${id}`, datos),
  eliminar: (id: number) => apiClient.delete(`/ambientes/${id}`),
  disponibilidadGeneral: (idPeriodo: number) =>
    apiClient.get('/ambientes/disponibilidad-general', { params: { idPeriodo } }),
  obtenerDisponibilidadDeclarada: (id: number) => apiClient.get(`/ambientes/${id}/disponibilidad-declarada`),
  guardarDisponibilidadDeclarada: (id: number, data: any) =>
    apiClient.put(`/ambientes/${id}/disponibilidad-declarada`, data),
};