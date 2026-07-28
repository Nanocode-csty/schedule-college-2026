import { apiClient } from '@/lib/api-client';

export const departamentosService = {
  listar: () => apiClient.get('/departamentos'),
  obtener: (id: number) => apiClient.get(`/departamentos/${id}`),
  crear: (datos: { nombre: string; codigo: string }) => apiClient.post('/departamentos', datos),
  actualizar: (id: number, datos: any) => apiClient.put(`/departamentos/${id}`, datos),
  eliminar: (id: number) => apiClient.delete(`/departamentos/${id}`),
};
