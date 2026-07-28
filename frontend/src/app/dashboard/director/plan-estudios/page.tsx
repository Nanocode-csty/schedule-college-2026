'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utilidades';
import { Card, CardContent } from '@/components/ui/Card';
import { Selector } from '@/components/ui/Selector';
import { curriculaService } from '@/services/curricula.service';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import {
  BookOpen,
  GraduationCap,
  Clock,
  Building2,
  Filter,
  ChevronDown,
  ChevronUp,
  Hash,
  FileText,
  Layers,
} from 'lucide-react';

export default function PlanEstudiosPage() {
  const [idCurricula, setIdCurricula] = useState<number | null>(null);
  const [cicloExpandido, setCicloExpandido] = useState<number | null>(1);

  const { data: curriculaList } = useQuery({
    queryKey: ['curricula'],
    queryFn: () => curriculaService.listar().then((res) => res.data),
  });

  const curriculaVigente = curriculaList?.find((c: any) => c.vigente);

  useEffect(() => {
    if (curriculaVigente && idCurricula === null) {
      setIdCurricula(curriculaVigente.id);
    }
  }, [curriculaVigente, idCurricula]);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan-estudios', idCurricula],
    queryFn: () => curriculaService.obtenerPlanEstudios(idCurricula ?? undefined).then((res) => res.data),
    enabled: !!idCurricula,
  });

  const totales = plan?.ciclos?.reduce(
    (acc: any, c: any) => ({
      total_creditos: acc.total_creditos + c.total_creditos,
      total_horas_teoricas: acc.total_horas_teoricas + c.total_horas_teoricas,
      total_horas_practica: acc.total_horas_practica + c.total_horas_practica,
      total_horas_laboratorio: acc.total_horas_laboratorio + c.total_horas_laboratorio,
      total_cursos: acc.total_cursos + c.total_cursos,
    }),
    { total_creditos: 0, total_horas_teoricas: 0, total_horas_practica: 0, total_horas_laboratorio: 0, total_cursos: 0 }
  );

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

  const badgeCondicion = (condicion: string | null) => {
    if (!condicion) return null;
    const styles: Record<string, string> = {
      OBLIGATORIO: 'bg-blue-50 text-blue-700 border-blue-200',
      ELECTIVO: 'bg-amber-50 text-amber-700 border-amber-200',
      ESPECIALIDAD: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return (
      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', styles[condicion] || 'bg-slate-50 text-slate-600 border-slate-200')}>
        {condicion}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-[1800px] mx-auto pb-20 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-10 py-12 text-white shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest text-white/90">
              <BookOpen className="w-3.5 h-3.5" />
              Plan de Estudios
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Plan de Estudios</h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Visualiza la malla curricular con los cursos organizados por ciclo académico.
            </p>
          </div>
        </div>
      </div>

      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Filtrar por Currícula:</span>
            </div>
            <div className="w-80">
              <Selector
                label="Currícula"
                value={idCurricula?.toString() || ''}
                onChange={(e) => setIdCurricula(e.target.value ? parseInt(e.target.value) : null)}
                opciones={(curriculaList || []).map((c: any) => ({
                  valor: String(c.id),
                  etiqueta: `${c.codigo} - ${c.nombre}${c.vigente ? ' (Vigente)' : ''}`
                }))}
              />
            </div>
            {plan?.curricula && (
              <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-unt-primary/10 text-unt-primary rounded-xl text-sm font-bold border border-unt-primary/20">
                <BookOpen className="w-4 h-4" />
                {plan.curricula.codigo} - {plan.curricula.nombre}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <SpinnerCarga />
        </div>
      ) : plan?.ciclos?.length > 0 ? (
        <div className="space-y-6">
          {plan.ciclos.map((ciclo: any) => {
            const expandido = cicloExpandido === ciclo.numero;
            return (
              <Card
                key={ciclo.numero}
                className="border-slate-200/60 shadow-lg rounded-[2rem] overflow-hidden bg-white hover:shadow-xl transition-shadow"
              >
                <button
                  onClick={() => setCicloExpandido(expandido ? null : ciclo.numero)}
                  className="w-full text-left"
                >
                  <div className={cn('bg-gradient-to-r px-8 py-5 text-white', colorCiclo(ciclo.numero))}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm">
                          <Layers className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-extrabold tracking-tight">Ciclo {ciclo.numero}</h2>
                          <p className="text-sm text-white/80 mt-0.5">
                            {ciclo.total_cursos} cursos &middot; {ciclo.total_creditos} créditos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-4 text-xs font-bold text-white/80">
                          <span>HT: {ciclo.total_horas_teoricas}h</span>
                          <span>HP: {ciclo.total_horas_practica}h</span>
                          <span>HL: {ciclo.total_horas_laboratorio}h</span>
                          <span className="text-white font-extrabold bg-white/20 px-3 py-1 rounded-full">
                            Total: {ciclo.total_horas_teoricas + ciclo.total_horas_practica + ciclo.total_horas_laboratorio}h
                          </span>
                        </div>
                        {expandido ? (
                          <ChevronUp className="w-6 h-6 text-white/70" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-white/70" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {expandido && (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Curso</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Créd.</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">H.T</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">H.P</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">H.L</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Total H</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Condición</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Departamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {ciclo.cursos.map((curso: any) => {
                          const totalH = curso.horas_teoricas + curso.horas_practica + curso.horas_laboratorio;
                          return (
                            <tr key={curso.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-4">
                                <div className="flex items-center gap-2">
                                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="font-mono font-bold text-sm text-slate-900">{curso.codigo}</span>
                                </div>
                              </td>
                              <td className="px-8 py-4">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-3.5 h-3.5 text-unt-primary/60 shrink-0" />
                                  <span className="font-medium text-sm text-slate-800">{curso.nombre}</span>
                                </div>
                              </td>
                              <td className="px-8 py-4 text-center">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-700 font-bold text-xs border border-amber-100">
                                  {curso.creditos}
                                </span>
                              </td>
                              <td className="px-8 py-4 text-center text-sm font-semibold text-slate-700">{curso.horas_teoricas}</td>
                              <td className="px-8 py-4 text-center text-sm font-semibold text-slate-700">{curso.horas_practica}</td>
                              <td className="px-8 py-4 text-center text-sm font-semibold text-slate-700">{curso.horas_laboratorio}</td>
                              <td className="px-8 py-4 text-center">
                                <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                                  {totalH}h
                                </span>
                              </td>
                              <td className="px-8 py-4">{badgeCondicion(curso.condicion)}</td>
                              <td className="px-8 py-4">
                                {curso.departamento ? (
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="text-xs font-medium text-slate-600">{curso.departamento.nombre}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                          <td className="px-8 py-4 text-sm font-extrabold text-slate-700" colSpan={2}>
                            Totales del Ciclo {ciclo.numero}
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className="font-extrabold text-sm text-amber-700">{ciclo.total_creditos}</span>
                          </td>
                          <td className="px-8 py-4 text-center font-extrabold text-sm text-slate-700">{ciclo.total_horas_teoricas}</td>
                          <td className="px-8 py-4 text-center font-extrabold text-sm text-slate-700">{ciclo.total_horas_practica}</td>
                          <td className="px-8 py-4 text-center font-extrabold text-sm text-slate-700">{ciclo.total_horas_laboratorio}</td>
                          <td className="px-8 py-4 text-center">
                            <span className="font-extrabold text-sm text-unt-primary">
                              {ciclo.total_horas_teoricas + ciclo.total_horas_practica + ciclo.total_horas_laboratorio}h
                            </span>
                          </td>
                          <td className="px-8 py-4" colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}

          {totales && (
            <Card className="bg-gradient-to-r from-unt-primary/5 to-unt-primary/10 border-unt-primary/20 shadow-lg rounded-[2rem] overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-5 h-5 text-unt-primary" />
                    <span className="font-extrabold text-slate-800">Totales Generales del Plan de Estudios</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-700">{totales.total_cursos} cursos</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
                      <GraduationCap className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-amber-700">{totales.total_creditos} créditos</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-emerald-700">
                        HT: {totales.total_horas_teoricas}h
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
                      <Clock className="w-4 h-4 text-violet-600" />
                      <span className="font-bold text-violet-700">
                        HP: {totales.total_horas_practica}h
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-purple-700">
                        HL: {totales.total_horas_laboratorio}h
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-5 py-2 bg-unt-primary text-white rounded-xl shadow-md shadow-unt-primary/20">
                      <Clock className="w-4 h-4" />
                      <span className="font-extrabold">
                        Total: {totales.total_horas_teoricas + totales.total_horas_practica + totales.total_horas_laboratorio}h
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-slate-300">
          <div className="p-4 bg-slate-100 rounded-full mb-4">
            <BookOpen className="w-12 h-12 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Seleccione una currícula para visualizar el plan de estudios.</p>
        </div>
      )}
    </div>
  );
}
