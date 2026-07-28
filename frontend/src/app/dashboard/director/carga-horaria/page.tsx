'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utilidades';
import { periodosService } from '@/services/periodos.service';
import { curriculaService } from '@/services/curricula.service';
import { cargaHorariaService } from '@/services/carga-horaria.service';
import { docentesService } from '@/services/docentes.service';
import { cursosService } from '@/services/cursos.service';
import { configuracionService } from '@/services/configuracion.service';
import { Card, CardContent } from '@/components/ui/Card';
import { Selector } from '@/components/ui/Selector';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { Modal } from '@/components/ui/Modal';
import { SelectorFiltrable } from '@/components/ui/SelectorFiltrable';
import { Users, BookOpen, AlertCircle, Plus, Clock, GraduationCap, ArrowRight, CheckCircle2, Trash2, Edit2, Users2 } from 'lucide-react';

export default function CargaHorariaPage() {
  const queryClient = useQueryClient();
  const [idPeriodo, setIdPeriodo] = useState<number>(0);
  const [idCiclo, setIdCiclo] = useState<number>(0); // Nuevo estado para filtro por ciclo
  const [idCurricula, setIdCurricula] = useState<number | null>(null);
  const [grupoGeneralIndex, setGrupoGeneralIndex] = useState<number>(0); // 0: Grupo A, 1: Grupo B, etc.
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  const [modalAsignacion, setModalAsignacion] = useState(false);
  const [componenteSeleccionado, setComponenteSeleccionado] = useState<any>(null);
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState<any>(null);
  const [idDocente, setIdDocente] = useState<number>(0);
  const [horasAsignadas, setHorasAsignadas] = useState<number>(0);
  const [asignacionEditando, setAsignacionEditando] = useState<any>(null);
  const [sugeridosIds, setSugeridosIds] = useState<number[]>([]);

  // Get restricciones to know numGruposGenerales
  const { data: restricciones } = useQuery({
    queryKey: ['restricciones-carga'],
    queryFn: () => configuracionService.obtenerRestricciones().then(res => res.data),
  });

  // Helper to generate group names
  const getGroupNames = (num: number) => {
    const letras = ['A', 'B', 'C'];
    return Array.from({ length: num }, (_, i) => `Grupo ${letras[i]}`);
  };

  const { data: responsePeriodos } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then(res => res.data)
  });
  const periodos = Array.isArray(responsePeriodos) ? responsePeriodos : responsePeriodos?.data || [];

  // Pre-seleccionar periodo activo
  useEffect(() => {
    if (periodos.length > 0 && idPeriodo === 0) {
      const activo = periodos.find((p: any) => p.activo);
      if (activo) setIdPeriodo(activo.id);
    }
  }, [periodos, idPeriodo]);

  const { data: responseDocentes } = useQuery({
    queryKey: ['docentes'],
    queryFn: () => docentesService.listar({}).then(res => res.data)
  });
  const docentes = Array.isArray(responseDocentes) ? responseDocentes : responseDocentes?.data || [];

  const { data: responseResumen } = useQuery({
    queryKey: ['resumen-carga', idPeriodo],
    queryFn: () => cargaHorariaService.obtenerResumen(idPeriodo).then(res => res.data),
    enabled: idPeriodo > 0
  });
  const resumenCarga = Array.isArray(responseResumen) ? responseResumen : responseResumen?.data || [];

  const { data: cursosConOferta, isLoading: loadingOferta } = useQuery({
    queryKey: ['cursos-con-oferta', idPeriodo, idCiclo, idCurricula, grupoGeneralIndex],
    queryFn: () => cargaHorariaService.obtenerCursosPorCiclo(
      idPeriodo, 
      idCiclo > 0 ? idCiclo : undefined, 
      idCurricula!,
      grupoGeneralIndex
    ).then(res => res.data),
    enabled: idPeriodo > 0
  });

  const { data: curricula } = useQuery({
    queryKey: ['curricula'],
    queryFn: () => curriculaService.listar().then(res => res.data),
  });

  const curriculaVigente = curricula?.find((c: any) => c.vigente);

  useEffect(() => {
    if (curriculaVigente && idCurricula === null) {
      setIdCurricula(curriculaVigente.id);
    }
  }, [curriculaVigente, idCurricula]);

  const { data: ciclos } = useQuery({
    queryKey: ['ciclos', idPeriodo],
    queryFn: () => periodosService.obtenerCiclosPorPeriodo(idPeriodo).then(res => res.data),
    enabled: idPeriodo > 0
  });

  const mutationAsignar = useMutation({
    mutationFn: (datos: any) => {
      if (asignacionEditando) {
        return cargaHorariaService.actualizarAsignacion(asignacionEditando.id, datos);
      }
      return cargaHorariaService.asignarCarga(datos);
    },
    onSuccess: () => {
      setToast({ mensaje: 'Carga horaria procesada correctamente', tipo: 'exito' });
      setModalAsignacion(false);
      queryClient.invalidateQueries({ queryKey: ['resumen-carga', idPeriodo] });
      queryClient.invalidateQueries({ queryKey: ['cursos-con-oferta', idPeriodo, idCiclo, idCurricula, grupoGeneralIndex] });
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al procesar carga', tipo: 'error' });
    }
  });

  const mutationEliminar = useMutation({
    mutationFn: (id: number) => cargaHorariaService.eliminarAsignacion(id),
    onSuccess: () => {
      setToast({ mensaje: 'Asignación eliminada', tipo: 'exito' });
      queryClient.invalidateQueries({ queryKey: ['resumen-carga', idPeriodo] });
      queryClient.invalidateQueries({ queryKey: ['cursos-con-oferta', idPeriodo] });
    }
  });

  const abrirModalAsignacion = (comp: any, oferta: any, asig?: any) => {
    setComponenteSeleccionado(comp);
    setOfertaSeleccionada(oferta);

    const idDepartamentoCurso = oferta?.curso?.id_departamento;
    const idsSug = idDepartamentoCurso
      ? docentes.filter((d: any) => d.id_departamento === idDepartamentoCurso).map((d: any) => d.id)
      : [];
    setSugeridosIds(idsSug);

    if (asig) {
      setAsignacionEditando(asig);
      setIdDocente(asig.id_docente);
      setHorasAsignadas(asig.horas_asignadas);
    } else {
      const horasAsignadasActual = comp.asignaciones.reduce((acc: number, a: any) => acc + a.horas_asignadas, 0);
      const totalRequerido = comp.horas_requeridas;
      const faltan = totalRequerido - horasAsignadasActual;
      setAsignacionEditando(null);
      setIdDocente(idsSug.length === 1 ? idsSug[0] : 0);
      setHorasAsignadas(faltan > 0 ? faltan : 0);
    }
    setModalAsignacion(true);
  };

  const manejarAsignar = () => {
    if (!idDocente || !horasAsignadas) return;
    
    const payload: any = {
      id_componente: componenteSeleccionado.id,
      id_docente: Number(idDocente),
      horas_asignadas: Math.round(Number(horasAsignadas)),
      numero_grupo_general: grupoGeneralIndex
    };

    mutationAsignar.mutate(payload);
  };

  const manejarEliminarAsignacion = (id: number) => {
    if (confirm('¿Seguro que desea eliminar esta asignación?')) {
      mutationEliminar.mutate(id);
    }
  };

  // Calcular progreso del ciclo seleccionado
  const obtenerProgresoCiclo = () => {
    if (!cursosConOferta || cursosConOferta.length === 0) return { porcentaje: 0, requeridas: 0, asignadas: 0 };
    
    let totalRequeridas = 0;
    let totalAsignadas = 0;
    
    cursosConOferta.forEach((oferta: any) => {
      oferta.componentes?.forEach((comp: any) => {
        totalRequeridas += (comp.horas_requeridas || 0);
        totalAsignadas += comp.asignaciones?.reduce((acc: number, asig: any) => acc + asig.horas_asignadas, 0) || 0;
      });
    });
    
    const porcentaje = totalRequeridas > 0 ? Math.min(Math.round((totalAsignadas / totalRequeridas) * 100), 100) : 0;
    return { porcentaje, requeridas: totalRequeridas, asignadas: totalAsignadas };
  };

  const progresoCiclo = obtenerProgresoCiclo();

  const getCardColor = (id: number) => {
    const colors = [
      { bg: 'bg-blue-50/50', icon: 'bg-blue-100 text-blue-600', border: 'border-blue-100' },
      { bg: 'bg-indigo-50/50', icon: 'bg-indigo-100 text-indigo-600', border: 'border-indigo-100' },
      { bg: 'bg-violet-50/50', icon: 'bg-violet-100 text-violet-600', border: 'border-violet-100' },
      { bg: 'bg-emerald-50/50', icon: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100' },
      { bg: 'bg-amber-50/50', icon: 'bg-amber-100 text-amber-600', border: 'border-amber-100' },
      { bg: 'bg-rose-50/50', icon: 'bg-rose-100 text-rose-600', border: 'border-rose-100' },
      { bg: 'bg-cyan-50/50', icon: 'bg-cyan-100 text-cyan-600', border: 'border-cyan-100' },
    ];
    return colors[id % colors.length];
  };

  return (
    <div className="space-y-8 max-w-[1800px] mx-auto pb-20 animate-in fade-in duration-500">
      {/* Header Estilo Classroom */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-10 py-12 text-white shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest text-white/90">
              <Clock className="w-3.5 h-3.5" />
              Asignación de Carga
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Carga Horaria</h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Asigna docentes a los componentes de cada curso y gestiona la distribución de horas por periodo.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <div className="w-full">
              <Selector
                label="Período Lectivo"
                value={idPeriodo}
                onChange={(e: any) => setIdPeriodo(Number(e.target.value))}
                className="bg-white/20 border-white/20 text-white"
              >
                <option value={0}>-- Seleccionar Periodo --</option>
                {periodos?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Selector>
            </div>

            <div className="w-full">
              <Selector
                label="Filtrar por Ciclo"
                value={idCiclo}
                onChange={(e: any) => setIdCiclo(Number(e.target.value))}
                disabled={!idPeriodo}
                className="bg-white/20 border-white/20 text-white"
              >
                <option value={0}>-- Todos los Ciclos --</option>
                {ciclos?.map((c: any) => (
                  <option key={c.id} value={c.id}>Ciclo {c.numero}</option>
                ))}
              </Selector>
            </div>

            <div className="w-full">
              <Selector
                label="Filtrar por Currícula"
                value={idCurricula?.toString() || ''}
                onChange={(e) => setIdCurricula(e.target.value ? parseInt(e.target.value) : null)}
                opciones={(curricula || []).map((c: any) => ({
                  valor: String(c.id),
                  etiqueta: `${c.codigo} - ${c.nombre}${c.vigente ? ' (Vigente)' : ''}`
                }))}
                className="bg-white/20 border-white/20 text-white"
              />
            </div>

            {restricciones && restricciones.numGruposGenerales > 1 && (
              <div className="w-full">
                <Selector
                  label="Grupo General"
                  value={grupoGeneralIndex}
                  onChange={(e: any) => setGrupoGeneralIndex(Number(e.target.value))}
                  className="bg-white/20 border-white/20 text-white"
                >
                  {getGroupNames(restricciones.numGruposGenerales).map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </Selector>
              </div>
            )}
          </div>
        </div>
      </div>

      {!idPeriodo ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
          <Clock className="w-12 h-12 text-slate-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-800">No se ha seleccionado un período</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-unt-primary" /> Oferta Académica
              </h2>
              
              {idCiclo > 0 && (
                <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in zoom-in duration-300">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between gap-8 mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progreso del Ciclo</span>
                      <span className="text-[10px] font-bold text-unt-primary">{progresoCiclo.porcentaje}%</span>
                    </div>
                    <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-unt-primary transition-all duration-1000"
                        style={{ width: `${progresoCiclo.porcentaje}%` }}
                      />
                    </div>
                  </div>
                  <div className="pl-4 border-l border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asignadas</p>
                    <p className="text-xs font-extrabold text-slate-700">{progresoCiclo.asignadas}h / {progresoCiclo.requeridas}h</p>
                  </div>
                </div>
              )}
            </div>

            {loadingOferta ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-[2rem]" />)}
              </div>
            ) : (
              cursosConOferta?.map((oferta: any) => {
                const color = getCardColor(oferta.id);
                return (
                  <Card key={oferta.id} className="border-none shadow-lg rounded-[2.5rem] overflow-hidden group hover:shadow-xl transition-all duration-300">
                    <div className={cn("px-8 py-5 border-b border-slate-100 flex items-center justify-between", color.bg)}>
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2.5 rounded-2xl shadow-sm group-hover:scale-110 transition-transform", color.icon)}>
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 leading-tight">{oferta.curso?.nombre}</h3>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-0.5">{oferta.curso?.codigo}</p>
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 shadow-sm">
                          {oferta.ciclo?.nombre || `Ciclo ${oferta.id_ciclo}`}
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-8">
                    <div className="space-y-4">
                      {oferta.componentes.map((comp: any) => {
                        const numGrupos = restricciones?.numGruposGenerales || 1;
                        const horasAsignadasActual = comp.asignaciones.reduce((acc: number, a: any) => acc + a.horas_asignadas, 0);
                        const totalRequerido = comp.horas_requeridas;
                        const faltan = totalRequerido - horasAsignadasActual;
                        const nGruposComponentes = comp.grupos?.length || 1;
                        const hPorGrupo = comp.horas_requeridas / nGruposComponentes;
                        
                        const gruposAsignados = horasAsignadasActual / hPorGrupo;
                        const gruposFaltantes = nGruposComponentes - gruposAsignados;
                        
                        return (
                          <div key={comp.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-5 rounded-[1.5rem] border border-slate-100 gap-6 hover:bg-slate-50/50 hover:border-unt-primary/20 transition-all duration-300 hover:shadow-md group/comp">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center flex-wrap gap-3">
                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                                  comp.tipo === 'TEORIA' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                                }`}>
                                  {comp.tipo === 'TEORIA' ? 'Teoría-Práctica' : 'Laboratorio'}
                                </span>
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  <span>{totalRequerido}h totales</span>
                                  <span className="text-slate-300 font-normal">|</span>
                                  <span className="text-slate-400 font-medium flex items-center gap-1">
                                    <Users2 className="w-3.5 h-3.5" />
                                    {numGrupos} {numGrupos === 1 ? 'grupo general' : 'grupos generales'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                {comp.asignaciones.map((asig: any) => (
                                  <div key={asig.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-2xl text-xs shadow-sm hover:border-unt-primary/40 hover:shadow-md transition-all group/asig cursor-pointer">
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-unt-primary/10 to-indigo-100 flex items-center justify-center text-[10px] font-black text-unt-primary">
                                      {asig.docente.apellidos[0]}
                                    </div>
                                    <span className="font-bold text-slate-800">{asig.docente.apellidos}, {asig.docente.nombres}</span>
                                    <span className="text-unt-primary font-extrabold text-sm">{asig.horas_asignadas}h</span>
                                    <div className="flex gap-1 ml-1 pl-2 border-l border-slate-100">
                                      <button onClick={() => abrirModalAsignacion(comp, oferta, asig)} className="text-slate-400 hover:text-blue-500 hover:scale-110 transition-all"><Edit2 className="w-4 h-4"/></button>
                                      <button onClick={() => manejarEliminarAsignacion(asig.id)} className="text-slate-400 hover:text-red-500 hover:scale-110 transition-all"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                  </div>
                                ))}
                                {faltan > 0 && (
                                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-2xl text-[11px] font-bold border border-red-200 shadow-sm">
                                    <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full" />
                                    Faltan {faltan}h {`(${gruposFaltantes.toFixed(1)} grp)`}
                                  </div>
                                )}
                                {faltan <= 0 && (
                                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl text-[11px] font-bold border border-emerald-200 shadow-sm">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Carga Completa
                                  </div>
                                )}
                              </div>
                            </div>
                            <Boton size="sm" variant="outline" onClick={() => abrirModalAsignacion(comp, oferta)} className="rounded-2xl border-slate-200 hover:bg-gradient-to-r hover:from-unt-primary hover:to-[#0f4c81] hover:text-white hover:border-transparent transition-all duration-300 h-12 px-8 font-bold shadow-sm hover:shadow-lg hover:-translate-y-0.5 group-hover/comp:shadow-md">
                              <Plus className="w-4 h-4 mr-2" /> Asignar
                            </Boton>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                );
              })
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-unt-primary" /> Carga Docente
            </h2>
            {[...resumenCarga]
              .sort((a: any, b: any) => {
                const totalA = a.asignaciones.reduce((acc: number, as: any) => acc + as.horas_asignadas, 0);
                const totalB = b.asignaciones.reduce((acc: number, as: any) => acc + as.horas_asignadas, 0);
                const maxA = a.horas_max_semana || 40;
                const maxB = b.horas_max_semana || 40;
                return (totalB / maxB) - (totalA / maxA); // Orden descendente por porcentaje
              })
              .map((docente: any) => {
                const total = docente.asignaciones.reduce((acc: number, a: any) => acc + a.horas_asignadas, 0);
                const max = docente.horas_max_semana || 40;
                const porcentaje = Math.min((total / max) * 100, 100);
                
                return (
                  <div key={docente.id} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-sm text-slate-800 leading-tight">{docente.apellidos}, {docente.nombres}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        porcentaje >= 100 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {total}h
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          porcentaje >= 100 ? 'bg-red-500' : porcentaje > 80 ? 'bg-amber-500' : 'bg-unt-primary'
                        }`}
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium text-right">Máximo: {max}h</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <Modal 
        isOpen={modalAsignacion} 
        onClose={() => setModalAsignacion(false)} 
        titulo={asignacionEditando ? "Actualizar Carga" : "Nueva Asignación de Carga"}
        className="max-w-2xl"
        overflowVisible={true}
      >
        <div className="space-y-8 min-h-[400px]">
          {/* Cabecera del Curso Estilo Classroom */}
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex items-start gap-4">
            <div className="p-3 bg-unt-primary/10 rounded-2xl text-unt-primary">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg">
                {ofertaSeleccionada?.curso?.nombre}
              </h4>
              <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
                <span className="font-semibold text-slate-700">{ofertaSeleccionada?.curso?.codigo}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  componenteSeleccionado?.tipo === 'TEORIA' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {componenteSeleccionado?.tipo === 'TEORIA' ? 'Teoría-Práctica' : 'Laboratorio'}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-8">
              <div className="space-y-2">
                <SelectorFiltrable
                  label={sugeridosIds.length > 0 ? `Docente (${sugeridosIds.length} sugerido${sugeridosIds.length !== 1 ? 's' : ''} del departamento)` : 'Docente'}
                  value={idDocente}
                  onChange={(valor) => setIdDocente(Number(valor))}
                  opciones={docentes.map((d: any) => ({
                    valor: d.id,
                    etiqueta: `${d.apellidos}, ${d.nombres}${sugeridosIds.includes(d.id) ? ' ⭐ Sugerido' : ''}`
                  }))}
                  placeholder="Buscar docente..."
                  disabled={!!asignacionEditando}
                />
                {sugeridosIds.length === 1 && (
                  <div className="flex items-center gap-2 text-xs bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg border border-yellow-100">
                    <span>⭐</span>
                    <span>Solo hay 1 docente disponible en este departamento. Auto-seleccionado.</span>
                  </div>
                )}
                {sugeridosIds.length === 0 && ofertaSeleccionada?.curso?.id_departamento && (
                  <div className="flex items-center gap-2 text-xs bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg">
                    <span>ℹ️</span>
                    <span>No hay docentes registrados en el departamento de este curso.</span>
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-gray-700 ml-1 flex items-center justify-between">
                  Horas a Asignar
                  {componenteSeleccionado && (
                    <span className="text-[10px] font-bold text-slate-400">
                      Máximo: {
                        componenteSeleccionado.horas_requeridas - 
                        (componenteSeleccionado.asignaciones?.filter((a: any) => a.id !== asignacionEditando?.id)
                          .reduce((acc: number, a: any) => acc + a.horas_asignadas, 0) || 0)
                      }h
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="number" 
                    className="block w-full rounded-2xl border border-gray-200 pl-12 pr-4 py-4 text-gray-900 shadow-sm transition-all duration-200 focus:border-unt-primary focus:ring-4 focus:ring-unt-primary/5 focus:outline-none bg-slate-50/50 hover:bg-white"
                    value={horasAsignadas} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (componenteSeleccionado) {
                        const max = componenteSeleccionado.horas_requeridas - 
                          (componenteSeleccionado.asignaciones?.filter((a: any) => a.id !== asignacionEditando?.id)
                            .reduce((acc: number, a: any) => acc + a.horas_asignadas, 0) || 0);
                        setHorasAsignadas(Math.max(0, Math.min(val, max)));
                      } else {
                        setHorasAsignadas(Math.max(0, val));
                      }
                    }} 
                    placeholder="0"
                    min={0}
                    max={
                      componenteSeleccionado 
                        ? componenteSeleccionado.horas_requeridas - 
                          (componenteSeleccionado.asignaciones?.filter((a: any) => a.id !== asignacionEditando?.id)
                            .reduce((acc: number, a: any) => acc + a.horas_asignadas, 0) || 0)
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de carga docente (opcional) */}
          {idDocente > 0 && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <p className="text-sm text-amber-700 font-medium">
                Verifica que el docente tenga disponibilidad horaria antes de confirmar.
              </p>
            </div>
          )}

          <div className="pt-2">
            <Boton 
              onClick={manejarAsignar} 
              cargando={mutationAsignar.isPending} 
              className="w-full py-4 text-lg font-bold rounded-2xl shadow-lg shadow-unt-primary/20"
            >
              {asignacionEditando ? 'Actualizar Carga Horaria' : 'Confirmar Asignación'}
            </Boton>
          </div>
        </div>
      </Modal>

      {toast && <NotificacionToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
