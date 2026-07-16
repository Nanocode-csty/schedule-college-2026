import { apiClient } from '@/lib/api-client';

export const sedesService = {
  listar: (params?: any) => apiClient.get('/sedes', { params }),
  obtener: (id: number) => apiClient.get(`/sedes/${id}`),
  obtenerCentral: () => apiClient.get('/sedes/central'),
  crear: (datos: any) => apiClient.post('/sedes', datos),
  actualizar: (id: number, datos: any) => apiClient.put(`/sedes/${id}`, datos),
  eliminar: (id: number) => apiClient.delete(`/sedes/${id}`),
};
