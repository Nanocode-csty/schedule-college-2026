'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDisponibilidad } from '@/hooks/useDisponibilidad';
import { useSeleccionHorario } from '@/hooks/useSeleccionHorario';
import { useValidacionTiempoReal } from '@/hooks/useValidacionTiempoReal';
import { useWebSocket } from '@/hooks/useWebSocket';
import { periodosService } from '@/services/periodos.service';
import { ambientesService } from '@/services/ambientes.service';
import { docentesService } from '@/services/docentes.service';
import { configuracionService } from '@/services/configuracion.service';
import { horariosService } from '@/services/horarios.service';
import { gruposService } from '@/services/grupos.service';
import { MatrizDisponibilidad } from '@/components/horarios/MatrizDisponibilidad';
import { PanelSeleccionCurso } from '@/components/horarios/PanelSeleccionCurso';
import { IndicadorProgresoHoras } from '@/components/horarios/IndicadorProgresoHoras';
import { PanelValidaciones } from '@/components/horarios/PanelValidaciones';
import { VistaHorarioDocente } from '@/components/horarios/VistaHorarioDocente';
import { Selector } from '@/components/ui/Selector';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { ConfirmacionHorario } from '@/components/horarios/ConfirmacionHorario';
import Link from 'next/link';
import {
  CheckSquare,
  User,
  School,
  BookOpen,
  Users,
  Clock,
  ShieldCheck,
  Calendar,
  LayoutDashboard,
  Search,
  ArrowRight,
  Activity,
  Building2,
  CheckCircle2,
  XCircle,
  Clock3,
  MapPin,
} from 'lucide-react';
import { SelectorFiltrable } from '@/components/ui/SelectorFiltrable';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

// Helper functions
const getGroupName = (num: number) => {
  const letters = ['A', 'B', 'C', 'D'];
  return `Grupo ${letters[num]}`;
};

const DIAS_CONSULTA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const HORAS_CONSULTA = Array.from({ length: 17 }, (_, index) => {
  const hora = index + 6;
  return `${hora.toString().padStart(2, '0')}:00`;
});

const convertirAHoras = (valor: string) => {
  const [horas, minutos] = valor.split(':').map(Number);
  return horas * 60 + minutos;
};

const horaCruzaBloque = (horaConsulta: string, horaInicio: string, horaFin: string) => {
  const consulta = convertirAHoras(horaConsulta);
  const inicio = convertirAHoras(horaInicio);
  const fin = convertirAHoras(horaFin);
  return consulta >= inicio && consulta < fin;
};

export default function RegistroManualHorariosPage() {
  const queryClient = useQueryClient();
  const [docenteId, setDocenteId] = useState<number | null>(null);
  const [ambienteId, setAmbienteId] = useState<number | null>(null);
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState<number | null>(null); // Now track idAsignacion instead of just idComponente!
  const [componenteSeleccionado, setComponenteSeleccionado] = useState<number | null>(null);
  const [numeroGrupoGeneral, setNumeroGrupoGeneral] = useState<number>(0);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [mostrarConsultaAmbientes, setMostrarConsultaAmbientes] = useState(false);
  const [consultaDia, setConsultaDia] = useState<string>('LUNES');
  const [consultaHora, setConsultaHora] = useState<string>('08:00');
  const [sesionId] = useState(crypto.randomUUID());
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'success' | 'error' } | null>(null);

  const { data: periodoActivo, isLoading: periodoLoading } = useQuery({
    queryKey: ['periodo-activo-secretaria'],
    queryFn: () => periodosService.activo().then((res) => res.data),
  });
  const idPeriodo = periodoActivo?.id || 0;

  const { data: docentes, isLoading: docentesLoading } = useQuery({
    queryKey: ['docentes-secretaria'],
    queryFn: () => docentesService.listar().then((res) => res.data),
  });

  const { data: ambientes } = useQuery({
    queryKey: ['ambientes-secretaria'],
    queryFn: () => ambientesService.listar().then((res) => res.data),
  });

  const {
    data: disponibilidadGeneral,
    isLoading: disponibilidadGeneralLoading,
    refetch: consultarDisponibilidadGeneral,
  } = useQuery({
    queryKey: ['consulta-rapida-ambientes', idPeriodo],
    queryFn: () => ambientesService.disponibilidadGeneral(idPeriodo).then((res) => res.data),
    enabled: false,
  });

  const { data: restricciones } = useQuery({
    queryKey: ['restricciones'],
    queryFn: () => configuracionService.obtenerRestricciones().then((res) => res.data),
  });

  const { data: progreso } = useQuery({
    queryKey: ['progreso-secretaria', docenteId],
    queryFn: () => horariosService.obtenerProgreso(docenteId as number).then((res) => res.data),
    enabled: !!docenteId,
  });

  // Pre-seleccionar componente si hay progreso
  useEffect(() => {
    if (progreso && progreso.length > 0 && asignacionSeleccionada === null) {
      const pendiente = progreso.find((p: any) => p.horasAsignadas < p.horasRequeridas) || progreso[0];
      if (pendiente) {
        setAsignacionSeleccionada(pendiente.idAsignacion);
        setComponenteSeleccionado(pendiente.idComponente);
        setNumeroGrupoGeneral(pendiente.numeroGrupoGeneral);
      }
    }
  }, [progreso, asignacionSeleccionada]);

  const tipoComponenteSeleccionado = useMemo(() => {
    const registro = (progreso || []).find((p: any) => p.idAsignacion === asignacionSeleccionada);
    return (registro?.tipoComponente || '').toUpperCase();
  }, [progreso, asignacionSeleccionada]);

  const ambientesFiltrados = useMemo(() => {
    const lista = (ambientes || []).filter((a: any) => a.activo);
    if (!tipoComponenteSeleccionado) return lista;
    if (tipoComponenteSeleccionado === 'LABORATORIO') return lista.filter((a: any) => a.tipo === 'LABORATORIO');
    if (tipoComponenteSeleccionado === 'PRACTICA') return lista.filter((a: any) => a.tipo === 'AULA' || a.tipo === 'LABORATORIO');
    return lista.filter((a: any) => a.tipo === 'AULA');
  }, [ambientes, tipoComponenteSeleccionado]);

  // Si el ambiente seleccionado no es compatible, resetearlo o elegir uno compatible
  useEffect(() => {
    if (ambienteId && ambientesFiltrados.length > 0) {
      const existe = ambientesFiltrados.some((a: any) => a.id === ambienteId);
      if (!existe) {
        setAmbienteId(ambientesFiltrados[0].id);
      }
    } else if (!ambienteId && ambientesFiltrados.length > 0 && docenteId) {
      setAmbienteId(ambientesFiltrados[0].id);
    }
  }, [ambientesFiltrados, ambienteId, docenteId]);

  const { data: matriz, actualizarMatriz } = useDisponibilidad(ambienteId, idPeriodo, docenteId, componenteSeleccionado, asignacionSeleccionada, numeroGrupoGeneral);

  const { selecciones, seleccionarCelda, deseleccionarCelda } = useSeleccionHorario(docenteId || 0);

  const { data: validacion } = useValidacionTiempoReal(docenteId || 0, idPeriodo);

  const { data: gruposDisponibles, isLoading: gruposLoading } = useQuery({
    queryKey: ['grupos-por-componente-secretaria', componenteSeleccionado],
    queryFn: () => gruposService.listarPorComponente(componenteSeleccionado as number).then((res) => res.data),
    enabled: !!componenteSeleccionado,
  });

  const resultadoConsultaAmbientes = useMemo(() => {
    const ambientesConsulta = Array.isArray(disponibilidadGeneral) ? disponibilidadGeneral : [];

    const clasificacion = ambientesConsulta.reduce(
      (acumulado: {
        disponibles: any[];
        ocupados: any[];
      }, ambiente: any) => {
        const bloquesDelDia = Array.isArray(ambiente.bloques)
          ? ambiente.bloques.filter((bloque: any) => bloque.dia_semana === consultaDia)
          : [];

        const estaOcupado = bloquesDelDia.some((bloque: any) =>
          horaCruzaBloque(consultaHora, bloque.hora_inicio, bloque.hora_fin)
        );

        const registro = {
          id: ambiente.id,
          codigo: ambiente.codigo,
          tipo: ambiente.tipo,
          capacidad: ambiente.capacidad,
          bloqueCoincidente: bloquesDelDia.find((bloque: any) =>
            horaCruzaBloque(consultaHora, bloque.hora_inicio, bloque.hora_fin)
          ) || null,
        };

        if (estaOcupado) {
          acumulado.ocupados.push(registro);
        } else {
          acumulado.disponibles.push(registro);
        }

        return acumulado;
      },
      { disponibles: [], ocupados: [] }
    );

    clasificacion.disponibles.sort((a, b) => a.codigo.localeCompare(b.codigo));
    clasificacion.ocupados.sort((a, b) => a.codigo.localeCompare(b.codigo));

    return clasificacion;
  }, [consultaDia, consultaHora, disponibilidadGeneral]);

  const manejarConsultaAmbientes = async () => {
    setMostrarConsultaAmbientes(true);
    await consultarDisponibilidadGeneral();
  };

  useEffect(() => {
    if (!componenteSeleccionado) {
      setGrupoSeleccionado(null);
      return;
    }
    if (gruposDisponibles && gruposDisponibles.length > 0) {
      const primerGrupo = gruposDisponibles[0];
      setGrupoSeleccionado(primerGrupo?.id ?? null);
    }
  }, [componenteSeleccionado, gruposDisponibles]);

  const alCambiarComponente = (idAsignacion: number, idComp: number) => {
    const registro = (progreso || []).find((p: any) => p.idAsignacion === idAsignacion);
    setAsignacionSeleccionada(idAsignacion);
    setComponenteSeleccionado(idComp);
    setNumeroGrupoGeneral(registro?.numeroGrupoGeneral || 0);
    // Forzar refetch con los nuevos parámetros de componente.
    // Usamos un setTimeout para que los estados se actualicen primero en el ref.
    setTimeout(() => actualizarMatriz(), 0);
  };

  const manejarMensajeWS = useCallback((data: any) => {
    if (data.tipo === 'celda_seleccionada' || data.tipo === 'celda_deseleccionada') {
      actualizarMatriz();
      queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
      queryClient.invalidateQueries({ queryKey: ['validacion-seleccion', docenteId, idPeriodo] });
    }
  }, [actualizarMatriz, queryClient, docenteId, idPeriodo]);
  useWebSocket(manejarMensajeWS);

  const manejarClickCelda = async (dia: string, hora: string, estado: string, info?: any) => {
    if (!docenteId) {
      setMensaje({ texto: 'Por favor, seleccione un docente primero.', tipo: 'error' });
      return;
    }

    if (estado === 'BLOQUEO_INSTITUCIONAL') {
      setMensaje({ texto: 'Ese horario está bloqueado por la franja de almuerzo configurada.', tipo: 'error' });
      return;
    }

    if (estado === 'LIBRE') {
      if (!asignacionSeleccionada || !componenteSeleccionado) {
        setMensaje({ texto: 'Selecciona primero un componente del curso.', tipo: 'error' });
        return;
      }
      if (!grupoSeleccionado) {
        setMensaje({ texto: 'Selecciona primero un grupo.', tipo: 'error' });
        return;
      }
      if (!ambienteId) {
        setMensaje({ texto: 'Selecciona un ambiente.', tipo: 'error' });
        return;
      }

      // Validar si ya se alcanzaron las horas requeridas
      const registroProgreso = (progreso || []).find((p: any) => p.idAsignacion === asignacionSeleccionada);
      if (registroProgreso && registroProgreso.horasAsignadas >= registroProgreso.horasRequeridas) {
        setMensaje({
          texto: `Límite de horas alcanzado para ${registroProgreso.nombreCurso} (${getGroupName(registroProgreso.numeroGrupoGeneral)}).`,
          tipo: 'error',
        });
        return;
      }

      const horaFin = `${(parseInt(hora) + 1).toString().padStart(2, '0')}:00`;
      try {
        // Optimistic UI update
        queryClient.setQueriesData({ queryKey: ['matriz-disponibilidad', ambienteId, idPeriodo, docenteId] }, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            filas: old.filas.map((f: any) => {
              if (f.horaInicio !== hora) return f;
              return {
                ...f,
                celdas: f.celdas.map((c: any) => {
                  if (c.diaSemana !== dia) return c;
                  return { ...c, estado: 'SELECCION_TEMPORAL', info: { curso: 'Procesando...', tipoComponente: '', grupo: '', seccion: '' } };
                })
              };
            })
          };
        });

        await seleccionarCelda({
          idDocente: docenteId,
          idComponente: componenteSeleccionado,
          idAsignacion: asignacionSeleccionada,
          numeroGrupoGeneral: numeroGrupoGeneral,
          idGrupo: grupoSeleccionado,
          idAmbiente: ambienteId,
          diaSemana: dia.toUpperCase(),
          horaInicio: hora,
          horaFin,
          sesionId,
        });
        
        actualizarMatriz();
        queryClient.invalidateQueries({ queryKey: ['validacion-seleccion', docenteId, idPeriodo] });
        queryClient.invalidateQueries({ queryKey: ['progreso-secretaria', docenteId] });
        queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
        setMensaje({ texto: 'Celda asignada temporalmente.', tipo: 'success' });
      } catch (err: any) {
        actualizarMatriz();
        setMensaje({ texto: err.response?.data?.error || 'Error al seleccionar', tipo: 'error' });
      }
    } else if (estado === 'SELECCION_TEMPORAL' || estado === 'DOCENTE_OTRO_AMBIENTE') {
      try {
        // Optimistic UI update for deselection
        queryClient.setQueriesData({ queryKey: ['matriz-disponibilidad', ambienteId, idPeriodo, docenteId] }, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            filas: old.filas.map((f: any) => {
              if (f.horaInicio !== hora) return f;
              return {
                ...f,
                celdas: f.celdas.map((c: any) => {
                  if (c.diaSemana !== dia) return c;
                  return { ...c, estado: 'LIBRE', info: undefined };
                })
              };
            })
          };
        });

        await deseleccionarCelda({
          idDocente: docenteId,
          idAmbiente: info?.idAmbiente || ambienteId || undefined,
          diaSemana: dia.toUpperCase(),
          horaInicio: hora,
          sesionId: info?.sesionId || sesionId,
        });
        
        actualizarMatriz();
        queryClient.invalidateQueries({ queryKey: ['validacion-seleccion', docenteId, idPeriodo] });
        queryClient.invalidateQueries({ queryKey: ['progreso-secretaria', docenteId] });
        queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
        setMensaje({ texto: 'Celda liberada.', tipo: 'success' });
      } catch (err: any) {
        actualizarMatriz();
        setMensaje({ texto: err.response?.data?.error || 'Error al liberar celda', tipo: 'error' });
      }
    }
  };

  const quitarCeldaVistaPrevia = async (seleccion: any) => {
    await deseleccionarCelda({
      idDocente: docenteId!,
      idAmbiente: seleccion.idAmbiente,
      diaSemana: seleccion.diaSemana,
      horaInicio: seleccion.horaInicio,
      sesionId: seleccion.sesionId,
    });
    actualizarMatriz();
    queryClient.invalidateQueries({ queryKey: ['validacion-seleccion', docenteId, idPeriodo] });
    queryClient.invalidateQueries({ queryKey: ['progreso', docenteId] });
    queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
  };

  if (periodoLoading) return <SpinnerCarga />;

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto pb-20 px-4">
      {/* Header Estilo Classroom */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-10 py-12 text-white shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest text-white/90">
              <CheckSquare className="w-3.5 h-3.5" />
              Asistencia Administrativa
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Registro Manual de Horarios</h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Asigna horarios de forma directa para docentes que presentan dificultades técnicas o falta de acceso.
            </p>
          </div>
          
          <div className="w-full lg:w-96 bg-white/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/20 shadow-inner">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3 ml-1">Periodo Académico Activo</p>
            <div className="flex items-center gap-4 bg-white/20 p-4 rounded-2xl border border-white/10">
              <div className="p-3 bg-white/20 rounded-xl">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">{periodoActivo?.nombre || 'No identificado'}</p>
                <p className="text-[10px] text-white/60 font-bold uppercase">Esc. Ing. Sistemas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="animate-in slide-in-from-bottom-4 duration-700 space-y-10">
        
        {/* FILA SUPERIOR: SELECTORES Y CONFIGURACIÓN */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
          
          {/* Tarjeta 1: Selección de Docente */}
          <div className="xl:col-span-12 bg-white rounded-[2.5rem] shadow-xl border border-slate-200/60 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shadow-sm">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Docente</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Identificación</p>
                </div>
              </div>

              <div className="flex-1 pt-2">
                <SelectorFiltrable
                  label=""
                  value={docenteId || 0}
                  onChange={(val) => {
                    const id = Number(val);
                    setDocenteId(id || null);
                    setAsignacionSeleccionada(null);
                    setComponenteSeleccionado(null);
                    setNumeroGrupoGeneral(0);
                    setGrupoSeleccionado(null);
                    setAmbienteId(null);
                  }}
                  opciones={(docentes || []).map((d: any) => ({
                    valor: d.id,
                    etiqueta: `${d.apellidos}, ${d.nombres}`
                  }))}
                  placeholder="Buscar docente..."
                />
              </div>

              {docenteId && (
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <p className="text-xs font-bold text-indigo-700">Sesión activa para registro</p>
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta 2: Curso y Ambiente (5/12) */}
          <div className="xl:col-span-7 bg-white rounded-[2.5rem] shadow-xl border border-slate-200/60 p-8 flex flex-col min-h-[320px]">
            {!docenteId ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-50">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold text-sm">Seleccione un docente primero</p>
              </div>
            ) : (
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Curso y Ambiente</h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Configuración</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMostrarConsultaAmbientes((actual) => !actual)}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          {mostrarConsultaAmbientes ? 'Ocultar consulta' : 'Consultar disponibilidad de ambientes'}
                        </button>
                        <Link
                          href="/dashboard/secretaria/ambientes"
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-700 transition-colors hover:bg-indigo-100"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Ver gestión de ambientes
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
                  <div className="xl:col-span-7 space-y-2 flex flex-col min-h-[220px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Componente</p>
                    <div className="flex-1 min-h-[140px] bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="h-full overflow-y-auto custom-scrollbar p-1">
                        <PanelSeleccionCurso
                          componentes={progreso || []}
                          componenteSeleccionado={asignacionSeleccionada}
                          alCambiarComponente={alCambiarComponente}
                          numSeccionesGenerales={restricciones?.numGruposGenerales || 1}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="xl:col-span-5 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ambiente</p>
                      <Selector
                        label=""
                        opciones={[
                          { valor: '', etiqueta: 'Elegir ambiente' },
                          ...ambientesFiltrados.map((a: any) => ({
                            valor: String(a.id),
                            etiqueta: `${a.codigo} (${a.tipo === 'AULA' ? 'Aula' : 'Lab'}, Cap: ${a.capacidad})`,
                          })),
                        ]}
                        value={ambienteId?.toString() || ''}
                        onChange={(e) => setAmbienteId(e.target.value ? parseInt(e.target.value, 10) : null)}
                        className="rounded-xl border-slate-200 bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grupo</p>
                      <Selector
                        label=""
                        opciones={[
                          { valor: '', etiqueta: 'Elegir grupo' },
                          ...((gruposDisponibles || []).map((g: any) => ({
                            valor: String(g.id),
                            etiqueta: `Grupo ${g.codigo} (Cap: ${g.capacidad_maxima})`,
                          })) || []),
                        ]}
                        value={grupoSeleccionado?.toString() || ''}
                        onChange={(e) => setGrupoSeleccionado(e.target.value ? parseInt(e.target.value, 10) : null)}
                        disabled={!componenteSeleccionado || gruposLoading}
                        className="rounded-xl border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta 3: Progreso y Reglas (4/12) */}
          <div className="xl:col-span-5 bg-[#0b1f3a] rounded-[2.5rem] shadow-2xl p-6 text-white flex flex-col min-h-[320px] overflow-hidden">
            {!docenteId ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-30">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <p className="text-white font-bold text-sm">Validación en espera</p>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl shadow-inner">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-white">Estado</h2>
                    <p className="text-[9px] text-white/40 font-black uppercase tracking-widest">Reglas de Negocio</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 flex-1 min-h-0">
                  <div className="bg-white/5 rounded-2xl p-3 border border-white/10 flex flex-col min-h-0 max-h-[140px]">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-2">Progreso de Horas</p>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                      <IndicadorProgresoHoras progreso={progreso || []} numSeccionesGenerales={restricciones?.numGruposGenerales || 1} />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 border border-white/10 flex flex-col min-h-0 max-h-[140px]">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-2">Alertas y Cruces</p>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                      <PanelValidaciones validacion={validacion || null} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Consulta rapida de disponibilidad de ambientes */}
        {mostrarConsultaAmbientes && (
        <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200/60 p-10 space-y-8">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 border-b border-slate-100 pb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-emerald-50 rounded-3xl text-emerald-600 shadow-sm">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Consulta rápida de disponibilidad</h2>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Ambientes disponibles y ocupados según día y hora
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 text-slate-600 rounded-[1.5rem] border border-slate-200 text-xs font-black uppercase tracking-widest shadow-sm">
              <Clock3 className="w-4 h-4" />
              Período activo: {periodoActivo?.nombre || 'No identificado'}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
            <div className="xl:col-span-4 bg-gradient-to-br from-[#0b1f3a] to-[#123b6d] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <Clock3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">Filtro de consulta</h3>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Ingreso rápido</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <Selector
                    label="Día"
                    opciones={DIAS_CONSULTA.map((dia) => ({ valor: dia, etiqueta: dia.charAt(0) + dia.slice(1).toLowerCase() }))}
                    value={consultaDia}
                    onChange={(e) => setConsultaDia(e.target.value)}
                    className="rounded-2xl border-white/10 bg-white/95 text-slate-700 focus:border-emerald-400 focus:ring-emerald-400/10"
                  />

                  <Selector
                    label="Hora"
                    opciones={HORAS_CONSULTA.map((hora) => ({ valor: hora, etiqueta: hora }))}
                    value={consultaHora}
                    onChange={(e) => setConsultaHora(e.target.value)}
                    className="rounded-2xl border-white/10 bg-white/95 text-slate-700 focus:border-emerald-400 focus:ring-emerald-400/10"
                  />

                  <button
                    type="button"
                    onClick={manejarConsultaAmbientes}
                    disabled={disponibilidadGeneralLoading || !idPeriodo}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    <Search className="w-4 h-4" />
                    {disponibilidadGeneralLoading ? 'Consultando...' : 'Consultar'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Disponibles</p>
                    <p className="mt-2 text-3xl font-black text-emerald-300">{resultadoConsultaAmbientes.disponibles.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Ocupados</p>
                    <p className="mt-2 text-3xl font-black text-rose-300">{resultadoConsultaAmbientes.ocupados.length}</p>
                  </div>
                </div>

                <p className="text-sm text-white/60 leading-relaxed">
                  La consulta usa la programación activa del período para separar los ambientes libres de los que ya tienen bloques asignados.
                </p>
              </div>
            </div>

            <div className="xl:col-span-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-[2.5rem] border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between gap-4 border-b border-emerald-100 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-500 text-white">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-emerald-950">Ambientes disponibles</h3>
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700/70">Libres en la franja seleccionada</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
                    {resultadoConsultaAmbientes.disponibles.length}
                  </span>
                </div>

                <div className="min-h-[300px] max-h-[420px] overflow-y-auto custom-scrollbar space-y-3 pr-1">
                  {!disponibilidadGeneralLoading && !disponibilidadGeneral ? (
                    <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-white text-center">
                      <div className="space-y-2">
                        <p className="text-sm font-black text-slate-700">Aún no has realizado una consulta</p>
                        <p className="text-xs text-slate-400">Selecciona día y hora, luego presiona Consultar.</p>
                      </div>
                    </div>
                  ) : disponibilidadGeneralLoading ? (
                    <div className="flex h-[240px] items-center justify-center text-sm font-bold text-slate-400">
                      Consultando disponibilidad...
                    </div>
                  ) : resultadoConsultaAmbientes.disponibles.length > 0 ? (
                    resultadoConsultaAmbientes.disponibles.map((ambiente: any) => (
                      <div key={ambiente.id} className="rounded-2xl border border-emerald-100 bg-white p-4 flex items-center justify-between gap-4 shadow-sm">
                        <div>
                          <p className="text-sm font-black text-slate-800">{ambiente.codigo}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {ambiente.tipo === 'AULA' ? 'Aula' : ambiente.tipo === 'LABORATORIO' ? 'Laboratorio' : ambiente.tipo}
                          </p>
                        </div>
                        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 border border-emerald-100">
                          Cap. {ambiente.capacidad}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-white text-center">
                      <div className="space-y-2">
                        <p className="text-sm font-black text-slate-700">No hay ambientes libres</p>
                        <p className="text-xs text-slate-400">Prueba otra hora o día para encontrar disponibilidad.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[2.5rem] border border-rose-100 bg-rose-50/50 p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between gap-4 border-b border-rose-100 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-rose-500 text-white">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-rose-950">Ambientes ocupados</h3>
                      <p className="text-xs font-bold uppercase tracking-widest text-rose-700/70">Con bloqueos en la franja seleccionada</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-rose-700 border border-rose-200">
                    {resultadoConsultaAmbientes.ocupados.length}
                  </span>
                </div>

                <div className="min-h-[300px] max-h-[420px] overflow-y-auto custom-scrollbar space-y-3 pr-1">
                  {!disponibilidadGeneralLoading && !disponibilidadGeneral ? (
                    <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white text-center">
                      <div className="space-y-2">
                        <p className="text-sm font-black text-slate-700">Aún no has realizado una consulta</p>
                        <p className="text-xs text-slate-400">Selecciona día y hora, luego presiona Consultar.</p>
                      </div>
                    </div>
                  ) : disponibilidadGeneralLoading ? (
                    <div className="flex h-[240px] items-center justify-center text-sm font-bold text-slate-400">
                      Consultando disponibilidad...
                    </div>
                  ) : resultadoConsultaAmbientes.ocupados.length > 0 ? (
                    resultadoConsultaAmbientes.ocupados.map((ambiente: any) => (
                      <div key={ambiente.id} className="rounded-2xl border border-rose-100 bg-white p-4 flex items-center justify-between gap-4 shadow-sm">
                        <div>
                          <p className="text-sm font-black text-slate-800">{ambiente.codigo}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {ambiente.tipo === 'AULA' ? 'Aula' : ambiente.tipo === 'LABORATORIO' ? 'Laboratorio' : ambiente.tipo}
                          </p>
                        </div>
                        <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 border border-rose-100">
                          Cap. {ambiente.capacidad}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white text-center">
                      <div className="space-y-2">
                        <p className="text-sm font-black text-slate-700">No hay ambientes ocupados</p>
                        <p className="text-xs text-slate-400">Toda la oferta está libre en esta franja.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* FILA INFERIOR: MATRIZ Y VISTA PREVIA */}
        <div className="space-y-8">
          
          {/* Matriz de Disponibilidad (Ahora a todo lo ancho) */}
          <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200/60 p-10 space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-8">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-amber-50 rounded-3xl text-amber-600 shadow-sm">
                  <LayoutDashboard className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Matriz de Horarios</h2>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {ambienteId ? (
                      <span className="flex items-center gap-2">
                        Ambiente: <span className="text-slate-600 font-black">{matriz?.ambienteCodigo || 'Cargando...'}</span>
                      </span>
                    ) : 'Seleccione un ambiente para visualizar la disponibilidad'}
                  </p>
                </div>
              </div>
              {ambienteId && (
                <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-[1.5rem] border border-emerald-100 text-xs font-black uppercase tracking-widest shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sistema Sincronizado
                </div>
              )}
            </div>

            <div className="min-h-[600px] overflow-x-auto custom-scrollbar pt-4">
              <MatrizDisponibilidad
                matriz={matriz || null}
                alHacerClickCelda={manejarClickCelda}
                bloqueoAlmuerzo={
                  restricciones?.bloqueoAlmuerzoInicio && restricciones?.bloqueoAlmuerzoFin
                    ? { inicio: restricciones.bloqueoAlmuerzoInicio, fin: restricciones.bloqueoAlmuerzoFin }
                    : null
                }
              />
            </div>
          </div>

          {/* Horario del Docente y Confirmación Final */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-white rounded-[3rem] shadow-xl border border-slate-200/60 p-10 space-y-8">
              <div className="flex items-center gap-6 border-b border-slate-100 pb-8">
                <div className="p-4 bg-blue-50 rounded-3xl text-blue-600 shadow-sm">
                  <Calendar className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Carga Horaria Actual</h2>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Vista Previa Consolidada</p>
                </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <VistaHorarioDocente selecciones={selecciones} alQuitarCelda={quitarCeldaVistaPrevia} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#0b1f3a] to-[#1e3a8a] rounded-[3rem] shadow-2xl p-10 text-white flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
              
              <div className="space-y-4 relative z-10">
                <div className="p-4 bg-white/10 rounded-2xl w-fit">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-black tracking-tight leading-tight">Confirmar Programación</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Verifica que no existan advertencias en el panel de reglas antes de confirmar. Esta acción es irreversible una vez guardada.
                </p>
              </div>

              <div className="pt-8 relative z-10">
                <ConfirmacionHorario
                  docenteId={docenteId || 0}
                  idPeriodo={idPeriodo}
                  deshabilitado={!docenteId || (validacion ? !validacion.valido : false)}
                  alConfirmar={() => {
                    queryClient.invalidateQueries({ queryKey: ['selecciones-temporales', docenteId] });
                    queryClient.invalidateQueries({ queryKey: ['horarios-general', idPeriodo] });
                    queryClient.invalidateQueries({ queryKey: ['progreso-secretaria', docenteId] });
                    actualizarMatriz();
                    setMensaje({ texto: '¡Horario registrado con éxito!', tipo: 'success' });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>

      {mensaje && (
        <NotificacionToast 
          mensaje={mensaje.texto} 
          tipo={mensaje.tipo} 
          onClose={() => setMensaje(null)} 
        />
      )}
    </div>
  );
}
