import { apiClient } from '@/lib/api-client';

export const cargaHorariaService = {
  asignarCarga: (datos: {
    id_componente: number;
    id_docente: number;
    horas_asignadas: number;
    numero_grupo_general?: number;
  }) => apiClient.post('/carga-horaria/asignar', datos),

  obtenerResumen: (idPeriodo: number) => 
    apiClient.get(`/carga-horaria/resumen/${idPeriodo}`),

  configurarOferta: (datos: any) => 
    apiClient.post('/carga-horaria/configurar-oferta', datos),

  eliminarAsignacion: (idAsignacion: number) =>
    apiClient.delete(`/carga-horaria/asignacion/${idAsignacion}`),

  eliminarOferta: (id: number) =>
    apiClient.delete(`/carga-horaria/oferta/${id}`),

  obtenerOfertaDetalle: (idPeriodo: number, idCurso: number, idCiclo: number) =>
    apiClient.get('/carga-horaria/oferta/detalle', {
      params: { id_periodo: idPeriodo, id_curso: idCurso, id_ciclo: idCiclo }
    }),

  actualizarAsignacion: (idAsignacion: number, datos: any) =>
    apiClient.put(`/carga-horaria/asignacion/${idAsignacion}`, datos),

  obtenerCiclos: (idPeriodo: number) =>
    apiClient.get(`/carga-horaria/ciclos/${idPeriodo}`),

  obtenerCiclosPorPeriodo: (idPeriodo: number) =>
    apiClient.get(`/carga-horaria/ciclos/${idPeriodo}`),

  obtenerCursosPorCiclo: (idPeriodo: number, idCiclo?: number, idCurricula?: number, numeroGrupoGeneral?: number) => {
    const params: any = {};
    if (idCiclo) params.id_ciclo = idCiclo;
    if (idCurricula) params.id_curricula = idCurricula;
    if (numeroGrupoGeneral !== undefined) params.numero_grupo_general = numeroGrupoGeneral;
    return apiClient.get(`/carga-horaria/cursos/${idPeriodo}`, { params });
  },

  sugerirDocentes: (idCurso: number) =>
    apiClient.get('/carga-horaria/sugerir-docentes', { params: { id_curso: idCurso } }),

  previewGenerarOferta: (datos: {
    id_periodo: number;
    ids_curricula: number[];
    ids_cursos_adicionales?: number[];
    ids_cursos_excluidos?: number[];
  }) => apiClient.post('/carga-horaria/generar-oferta/preview', datos),

  confirmarGenerarOferta: (datos: {
    id_periodo: number;
    cursos: Array<{
      id_curso: number;
      id_ciclo: number;
      tipo_curso: 'REGULAR' | 'ELECTIVO';
      componentes: Array<{
        tipo: 'TEORIA' | 'LABORATORIO';
        horas_requeridas: number;
        n_grupos: number;
        id_docente_asignado?: number | null;
      }>;
    }>;
  }) => apiClient.post('/carga-horaria/generar-oferta/confirmar', datos),
};
