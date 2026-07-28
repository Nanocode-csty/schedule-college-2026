'use client';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodosService } from '@/services/periodos.service';
import { curriculaService } from '@/services/curricula.service';
import { cursosService } from '@/services/cursos.service';
import { cargaHorariaService } from '@/services/carga-horaria.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Selector } from '@/components/ui/Selector';
import { Boton } from '@/components/ui/Boton';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { cn } from '@/lib/utilidades';
import { Sparkles, Eye, Check, X, Building2, Loader2, BookOpen, ChevronDown, ChevronUp, Clock, Users, Hash, FileText, GraduationCap, Layers } from 'lucide-react';

export default function GenerarOfertaPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [idPeriodo, setIdPeriodo] = useState<number>(0);
  const [idsCurricula, setIdsCurricula] = useState<number[]>([]);
  const [idsCursosAdicionales, setIdsCursosAdicionales] = useState<number[]>([]);
  const [idsCursosExcluidos, setIdsCursosExcluidos] = useState<number[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [cursosEditados, setCursosEditados] = useState<any[]>([]);
  const [toast, setToast] = useState<{ texto: string; tipo: 'exito' | 'error' | 'advertencia' } | null>(null);

  const { data: periodos } = useQuery({
    queryKey: ['periodos'],
    queryFn: () => periodosService.listar().then(res => res.data)
  });

  const { data: curricula } = useQuery({
    queryKey: ['curricula'],
    queryFn: () => curriculaService.listar().then(res => res.data)
  });

  const periodosList = Array.isArray(periodos) ? periodos : periodos?.data || [];
  const curriculaList = Array.isArray(curricula) ? curricula : curricula?.data || [];

  const { data: todosCursos } = useQuery({
    queryKey: ['cursos-todos'],
    queryFn: () => cursosService.listar({}).then(res => res.data)
  });

  const todosCursosList = Array.isArray(todosCursos) ? todosCursos : todosCursos?.data || [];

  const previewMutation = useMutation({
    mutationFn: (datos: any) => cargaHorariaService.previewGenerarOferta(datos),
    onSuccess: (res: any) => {
      const data = res.data;
      setPreview(data);
      setCursosEditados(data.cursos.map((c: any) => ({
        id_curso: c.id_curso,
        id_ciclo: c.ciclo,
        tipo_curso: c.condicion === 'ELECTIVO' || c.condicion === 'EL' ? 'ELECTIVO' : 'REGULAR',
        componentes: c.componentes.map((comp: any) => ({
          tipo: comp.tipo,
          horas_requeridas: comp.horas_requeridas,
          n_grupos: comp.n_grupos,
          id_docente_asignado: comp.docenteSugerido?.id || null,
        })),
      })));
      setStep(2);
      setToast({ texto: `Vista previa generada: ${data.totalCursos} cursos encontrados`, tipo: 'exito' });
    },
    onError: (error: any) => {
      setToast({ texto: error.response?.data?.error || 'Error al generar vista previa', tipo: 'error' });
    }
  });

  const confirmarMutation = useMutation({
    mutationFn: (datos: any) => cargaHorariaService.confirmarGenerarOferta(datos),
    onSuccess: (res: any) => {
      setToast({ texto: res.data?.mensaje || 'Oferta generada exitosamente', tipo: 'exito' });
      queryClient.invalidateQueries({ queryKey: ['cursos-oferta'] });
      setStep(3);
    },
    onError: (error: any) => {
      setToast({ texto: error.response?.data?.error || 'Error al generar oferta', tipo: 'error' });
    }
  });

  const toggleCurricula = (id: number) => {
    setIdsCurricula(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleCursoAdicional = (id: number) => {
    setIdsCursosAdicionales(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const cambiarDocenteComponente = (idCurso: number, compIdx: number, idDocente: number | null) => {
    setCursosEditados((prev) =>
      prev.map((c: any) =>
        c.id_curso === idCurso
          ? { ...c, componentes: c.componentes.map((comp: any, i: number) => i === compIdx ? { ...comp, id_docente_asignado: idDocente } : comp) }
          : c
      )
    );
  };

  const cambiarGruposComponente = (idCurso: number, compIdx: number, n_grupos: number) => {
    const val = Math.max(1, Math.min(10, n_grupos));
    setCursosEditados((prev) =>
      prev.map((c: any) =>
        c.id_curso === idCurso
          ? { ...c, componentes: c.componentes.map((comp: any, i: number) => i === compIdx ? { ...comp, n_grupos: val } : comp) }
          : c
      )
    );
    setPreview((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        cursos: prev.cursos.map((curso: any) =>
          curso.id_curso === idCurso
            ? { ...curso, componentes: curso.componentes.map((comp: any, i: number) => i === compIdx ? { ...comp, n_grupos: val } : comp) }
            : curso
        ),
      };
    });
  };

  const quitarCursoPreview = (idCurso: number) => {
    setCursosEditados((prev) => prev.filter((c: any) => c.id_curso !== idCurso));
    setPreview((prev: any) => {
      if (!prev) return prev;
      const filtrados = prev.cursos.filter((c: any) => c.id_curso !== idCurso);
      return { ...prev, cursos: filtrados, totalCursos: filtrados.length };
    });
  };

  const ciclosAgrupados = useMemo(() => {
    if (!preview?.cursos) return [];
    const map = new Map<number, any>();
    preview.cursos.forEach((curso: any) => {
      const num = curso.ciclo ?? 0;
      if (!map.has(num)) {
        map.set(num, { numero: num, cursos: [], total_creditos: 0, total_horas: 0, total_cursos: 0 });
      }
      const grupo = map.get(num);
      grupo.cursos.push(curso);
      grupo.total_creditos += curso.creditos ?? 0;
      grupo.total_horas += (curso.componentes || []).reduce((sum: number, comp: any) => sum + (comp.horas_requeridas ?? 0), 0);
      grupo.total_cursos += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.numero - b.numero);
  }, [preview]);

  const handleGenerarPreview = () => {
    if (!idPeriodo) {
      setToast({ texto: 'Seleccione un período', tipo: 'error' });
      return;
    }
    if (idsCurricula.length === 0 && idsCursosAdicionales.length === 0) {
      setToast({ texto: 'Seleccione al menos una currícula o cursos adicionales', tipo: 'error' });
      return;
    }
    previewMutation.mutate({
      id_periodo: idPeriodo,
      ids_curricula: idsCurricula,
      ids_cursos_adicionales: idsCursosAdicionales.length > 0 ? idsCursosAdicionales : undefined,
      ids_cursos_excluidos: idsCursosExcluidos.length > 0 ? idsCursosExcluidos : undefined,
    });
  };

  const handleConfirmar = () => {
    confirmarMutation.mutate({
      id_periodo: idPeriodo,
      cursos: cursosEditados,
    });
  };

  const resetAll = () => {
    setStep(1);
    setPreview(null);
    setCursosEditados([]);
    setIdsCursosAdicionales([]);
    setIdsCursosExcluidos([]);
  };

  const cursosAdicionalesOpts = todosCursosList.filter((c: any) =>
    c.ciclo == null && !idsCursosAdicionales.includes(c.id)
  );

  return (
    <div className="space-y-8 max-w-[1800px] mx-auto pb-20 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-10 py-12 text-white shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest text-white/90">
              <Sparkles className="w-3.5 h-3.5" />
              Generación Automática
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Generar Oferta Académica</h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Selecciona las currículas y cursos para generar automáticamente la oferta del período.
            </p>
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Paso 1: Configuración de la Oferta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Selector
                label="Período Académico"
                value={idPeriodo}
                onChange={(e: any) => setIdPeriodo(Number(e.target.value))}
              >
                <option value={0}>Seleccione un período</option>
                {periodosList?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.tipo === 'I' ? 'Impares' : p.tipo === 'II' ? 'Pares' : 'Extraordinario'})
                  </option>
                ))}
              </Selector>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Currículas a incluir</label>
                <div className="space-y-2">
                  {curriculaList?.filter((c: any) => c.activo).map((c: any) => (
                    <label key={c.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={idsCurricula.includes(c.id)}
                        onChange={() => toggleCurricula(c.id)}
                        className="w-5 h-5 text-unt-primary rounded"
                      />
                      <div>
                        <span className="font-medium text-slate-800">{c.nombre}</span>
                        {c.vigente && (
                          <span className="ml-2 text-xs bg-unt-primary/10 text-unt-primary px-2 py-0.5 rounded-full font-bold">VIGENTE</span>
                        )}
                      </div>
                    </label>
                  ))}
                  {(!curriculaList || curriculaList.length === 0) && (
                    <p className="text-sm text-slate-400 italic">No hay currículas registradas</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Cursos adicionales (para adelanto/recuperación, opcional)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {idsCursosAdicionales.map(id => {
                    const c = todosCursosList.find((cr: any) => cr.id === id);
                    return c ? (
                      <span key={id} className="inline-flex items-center gap-1 bg-unt-primary/10 text-unt-primary px-3 py-1 rounded-full text-xs font-bold">
                        {c.codigo} - {c.nombre}
                        <button onClick={() => toggleCursoAdicional(id)} className="ml-1 hover:text-red-500">&times;</button>
                      </span>
                    ) : null;
                  })}
                </div>
                <select
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) toggleCursoAdicional(Number(e.target.value));
                  }}
                >
                  <option value="">Buscar y agregar curso adicional...</option>
                  {todosCursosList
                    .filter((c: any) => !idsCursosAdicionales.includes(c.id))
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>{c.codigo} - {c.nombre} {c.ciclo ? `(Ciclo ${c.ciclo})` : ''}</option>
                    ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Período:</span>
                  <span className="font-bold">{periodosList?.find((p: any) => p.id === idPeriodo)?.nombre || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Currículas:</span>
                  <span className="font-bold">{idsCurricula.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Cursos adicionales:</span>
                  <span className="font-bold">{idsCursosAdicionales.length}</span>
                </div>
              </div>

              {idPeriodo && idsCurricula.length > 0 && (
                <div className="p-3 bg-unt-primary/5 rounded-xl text-sm text-unt-primary">
                  <p className="font-semibold">Ciclos que se incluirán:</p>
                  <p className="text-xs mt-1">
                    {periodosList?.find((p: any) => p.id === idPeriodo)?.tipo === 'I'
                      ? '1, 3, 5, 7, 9 (Impares)'
                      : periodosList?.find((p: any) => p.id === idPeriodo)?.tipo === 'II'
                      ? '2, 4, 6, 8, 10 (Pares)'
                      : 'Todos los ciclos'}
                  </p>
                </div>
              )}

              <Boton
                onClick={handleGenerarPreview}
                disabled={previewMutation.isPending || idsCurricula.length === 0}
                className="w-full rounded-xl"
              >
                {previewMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando...</>
                ) : (
                  <><Eye className="w-4 h-4 mr-2" /> Ver Vista Previa</>
                )}
              </Boton>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && preview && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Paso 2: Vista Previa</h2>
              <p className="text-slate-500">
                {preview.totalCursos} cursos encontrados — Revisa y ajusta la asignación docente
              </p>
            </div>
            <div className="flex gap-3">
              <Boton variant="outline" onClick={resetAll} className="rounded-xl">
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Boton>
              <Boton
                onClick={handleConfirmar}
                disabled={confirmarMutation.isPending || cursosEditados.length === 0}
                className="rounded-xl"
              >
                {confirmarMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando...</>
                ) : (
                  <><Check className="w-4 h-4 mr-2" /> Confirmar y Generar</>
                )}
              </Boton>
            </div>
          </div>

          <div className="space-y-6">
            {ciclosAgrupados.map((ciclo: any) => (
              <CicloAcordeon
                key={ciclo.numero}
                ciclo={ciclo}
                preview={preview}
                cambiarDocenteComponente={cambiarDocenteComponente}
                cambiarGruposComponente={cambiarGruposComponente}
                quitarCursoPreview={quitarCursoPreview}
              />
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Oferta Generada Exitosamente!</h2>
            <p className="text-slate-500 mb-6">Los cursos y componentes han sido creados en el período seleccionado.</p>
            <div className="flex justify-center gap-4">
              <Boton onClick={resetAll} className="rounded-xl">
                <Sparkles className="w-4 h-4 mr-2" /> Generar Otra Oferta
              </Boton>
              <Boton variant="outline" onClick={() => window.location.href = '/dashboard/director/oferta-ciclos'} className="rounded-xl">
                Ver Oferta por Ciclos
              </Boton>
            </div>
          </CardContent>
        </Card>
      )}

      {toast && (
        <NotificacionToast mensaje={toast.texto} tipo={toast.tipo} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

function CicloAcordeon({
  ciclo,
  preview,
  cambiarDocenteComponente,
  cambiarGruposComponente,
  quitarCursoPreview,
}: {
  ciclo: any;
  preview: any;
  cambiarDocenteComponente: (idCurso: number, compIdx: number, idDocente: number | null) => void;
  cambiarGruposComponente: (idCurso: number, compIdx: number, n_grupos: number) => void;
  quitarCursoPreview: (idCurso: number) => void;
}) {
  const [expandido, setExpandido] = useState(true);

  const colorCiclo = (num: number) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-indigo-500 to-indigo-600',
      'from-violet-500 to-violet-600',
      'from-emerald-500 to-emerald-600',
      'from-amber-500 to-amber-600',
      'from-rose-500 to-rose-600',
      'from-cyan-500 to-cyan-600',
      'from-orange-500 to-orange-600',
      'from-teal-500 to-teal-600',
      'from-purple-500 to-purple-600',
    ];
    return colors[(num - 1) % colors.length];
  };

  return (
    <Card className="border-slate-200/60 shadow-lg rounded-[2rem] overflow-hidden bg-white hover:shadow-xl transition-shadow">
      <button onClick={() => setExpandido(!expandido)} className="w-full text-left">
        <div className={cn('bg-gradient-to-r px-8 py-5 text-white', colorCiclo(ciclo.numero))}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">Ciclo {ciclo.numero}</h2>
                <p className="text-sm text-white/80 mt-0.5">
                  {ciclo.total_cursos} cursos &middot; {ciclo.total_creditos} créditos &middot; {ciclo.total_horas}h totales
                </p>
              </div>
            </div>
            {expandido ? (
              <ChevronUp className="w-6 h-6 text-white/70" />
            ) : (
              <ChevronDown className="w-6 h-6 text-white/70" />
            )}
          </div>
        </div>
      </button>

      {expandido && (
        <div className="divide-y divide-slate-100">
          {ciclo.cursos.map((curso: any) => {
            const cursoEditado = preview?.cursos?.find((c: any) => c.id_curso === curso.id_curso);
            return (
              <div key={curso.id_curso} className="p-6 hover:bg-slate-50/30 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <BookOpen className="w-5 h-5 text-unt-primary shrink-0" />
                      <h3 className="text-lg font-bold text-slate-900 truncate">{curso.nombre}</h3>
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-mono shrink-0">{curso.codigo}</span>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-amber-700 font-bold text-xs border border-amber-100 shrink-0">
                        {curso.creditos}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {curso.departamento?.nombre || 'Sin departamento'}
                      </span>
                      {curso.curricula && (
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                          {curso.curricula.nombre}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => quitarCursoPreview(curso.id_curso)}
                    className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0 ml-2"
                    title="Quitar curso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {(curso.componentes || []).map((comp: any, compIdx: number) => {
                    const editado = cursoEditado?.componentes?.[compIdx];
                    const gruposActuales = editado?.n_grupos ?? comp.n_grupos ?? 1;
                    return (
                      <div key={compIdx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={cn(
                            'text-xs font-bold px-3 py-1 rounded-full',
                            comp.tipo === 'TEORIA' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          )}>
                            {comp.tipo === 'TEORIA' ? 'TEORÍA-PRÁCTICA' : 'LABORATORIO'}
                          </span>
                          <span className="flex items-center gap-1 text-sm font-bold text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {comp.horas_requeridas}h
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={gruposActuales}
                            onChange={(e) => cambiarGruposComponente(curso.id_curso, compIdx, parseInt(e.target.value) || 1)}
                            className="w-16 text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-center font-bold"
                          />
                          <span className="text-xs text-slate-400">grupo(s)</span>
                        </div>

                        <div className="flex-1" />

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-400">Docente:</span>
                          <select
                            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white min-w-[200px]"
                            value={editado?.id_docente_asignado || ''}
                            onChange={(e) => cambiarDocenteComponente(curso.id_curso, compIdx, e.target.value ? Number(e.target.value) : null)}
                          >
                            <option value="">— Sin asignar —</option>
                            {comp.docentesDisponibles?.map((doc: any) => (
                              <option key={doc.id} value={doc.id}>
                                {doc.apellidos}, {doc.nombres} {comp.docenteSugerido?.id === doc.id ? '⭐' : ''}
                              </option>
                            ))}
                            {(!comp.docentesDisponibles || comp.docentesDisponibles.length === 0) && (
                              <option value="" disabled>No hay docentes en este departamento</option>
                            )}
                          </select>
                          {comp.docenteSugerido && (
                            <span className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-bold">
                              Sugerido
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
