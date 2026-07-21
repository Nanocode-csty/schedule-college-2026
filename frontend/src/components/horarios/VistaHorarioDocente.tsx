'use client';
import { cn } from '@/lib/utilidades';
import { Trash2 } from 'lucide-react';

interface SeleccionTemporal {
  idComponente: number;
  idGrupo: number;
  numeroGrupoGeneral: number;
  nombreCurso: string;
  ciclo?: number | null;
  tipoComponente: string;
  diaSemana: string;
  horaInicio: string;
  codigoGrupo: string;
  codigoAmbiente: string;
  confirmado?: boolean;
  publicado?: boolean;
}

interface VistaHorarioDocenteProps {
  selecciones: SeleccionTemporal[];
  alQuitarCelda: (seleccion: SeleccionTemporal) => void;
}

const diasOrden = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const diasLabel: Record<string, string> = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb',
};
const todasLasHoras = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

// Paleta de colores por tipo de componente
const tipoPaleta: Record<string, { card: string; badge: string; text: string; pill: string }> = {
  TEORIA:      { card: 'bg-sky-50 border-sky-200 hover:border-sky-400',      badge: 'bg-sky-500',     text: 'text-sky-900',    pill: 'bg-sky-100 text-sky-700' },
  LABORATORIO: { card: 'bg-violet-50 border-violet-200 hover:border-violet-400', badge: 'bg-violet-500', text: 'text-violet-900', pill: 'bg-violet-100 text-violet-700' },
  PRACTICA:    { card: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400', badge: 'bg-emerald-500', text: 'text-emerald-900', pill: 'bg-emerald-100 text-emerald-700' },
};
const defaultPaleta = { card: 'bg-slate-50 border-slate-200 hover:border-slate-400', badge: 'bg-slate-500', text: 'text-slate-900', pill: 'bg-slate-100 text-slate-600' };

const abreviar = (nombre: string, max = 18) =>
  nombre.length > max ? nombre.slice(0, max - 1) + '…' : nombre;

export function VistaHorarioDocente({ selecciones, alQuitarCelda }: VistaHorarioDocenteProps) {
  const obtenerSelecciones = (dia: string, hora: string) =>
    selecciones.filter((s) => s.diaSemana === dia && s.horaInicio === hora);

  // Solo mostrar las horas que tienen al menos un bloque asignado
  const horasFiltradas = todasLasHoras.filter((h) =>
    diasOrden.some((d) => obtenerSelecciones(d, h).length > 0)
  );

  // Detectar si hay horas no contiguas para mostrar separadores
  const horaConGap = (idx: number): boolean => {
    if (idx === 0) return false;
    const prev = parseInt(horasFiltradas[idx - 1].split(':')[0]);
    const curr = parseInt(horasFiltradas[idx].split(':')[0]);
    return curr - prev > 1;
  };
  if (!selecciones.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-8 py-12 text-center">
        <p className="text-sm font-semibold text-slate-400">Sin bloques registrados en este período</p>
        <p className="text-xs text-slate-300 mt-1">Selecciona celdas en la matriz para comenzar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Leyenda + contador */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {selecciones.length} bloque{selecciones.length === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400/70 ring-2 ring-amber-200" />
            Temporal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-400 ring-2 ring-sky-200" />
            Confirmado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-600 ring-2 ring-indigo-200" />
            Publicado
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-800">
              <th className="px-4 py-3 text-left text-[11px] font-black text-slate-300 uppercase tracking-widest w-28 border-r border-slate-700">
                Hora
              </th>
              {diasOrden.map((dia) => {
                const tieneClases = selecciones.some((s) => s.diaSemana === dia);
                return (
                  <th
                    key={dia}
                    className={cn(
                      'px-3 py-3 text-[11px] font-black uppercase tracking-widest text-center border-r border-slate-700 last:border-r-0',
                      tieneClases ? 'text-white' : 'text-slate-500'
                    )}
                  >
                    {diasLabel[dia]}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {horasFiltradas.map((hora, horaIdx) => {
              const horaFin = `${(parseInt(hora.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;
              const tieneGap = horaConGap(horaIdx);

              return (
                <>
                  {tieneGap && (
                    <tr key={`gap-${hora}`}>
                      <td colSpan={7} className="py-1 px-4 bg-slate-100/80">
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-slate-200" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sin clases</span>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr
                    key={hora}
                    className="border-b border-slate-100 transition-colors bg-white hover:bg-slate-50/60"
                  >
                  {/* Columna hora */}
                  <td className="border-r border-slate-200 px-4 py-2.5 text-center">
                    <span className="text-[11px] font-bold text-slate-500 block">{hora}</span>
                    <span className="text-[9px] text-slate-300 block">{horaFin}</span>
                  </td>

                  {diasOrden.map((dia) => {
                    const items = obtenerSelecciones(dia, hora);
                    return (
                      <td
                        key={dia + hora}
                        className="border-r border-slate-100 last:border-r-0 px-1.5 py-1.5 align-top min-w-[120px]"
                      >
                        {items.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {items.map((sel, idx) => {
                              const tipo = sel.tipoComponente?.toUpperCase() || '';
                              const paleta = sel.publicado
                                ? { card: 'bg-indigo-600 border-indigo-700', badge: 'bg-indigo-800', text: 'text-white', pill: 'bg-indigo-500/40 text-indigo-100' }
                                : sel.confirmado
                                  ? { card: 'bg-sky-500 border-sky-600', badge: 'bg-sky-700', text: 'text-white', pill: 'bg-sky-400/40 text-sky-100' }
                                  : (tipoPaleta[tipo] || defaultPaleta);

                              const secLetra = ['A', 'B', 'C', 'D'][sel.numeroGrupoGeneral ?? 0] || 'A';

                              return (
                                <div
                                  key={idx}
                                  onClick={() => !sel.publicado && alQuitarCelda(sel)}
                                  title={sel.publicado ? 'Publicado – no se puede quitar' : 'Clic para quitar'}
                                  className={cn(
                                    'group relative rounded-xl border p-2 transition-all duration-150 cursor-pointer select-none',
                                    sel.publicado ? 'cursor-not-allowed' : 'hover:shadow-md hover:-translate-y-[1px]',
                                    paleta.card
                                  )}
                                >
                                  {/* Barra de color izquierda */}
                                  <span className={cn('absolute left-0 top-2 bottom-2 w-1 rounded-r-full', paleta.badge)} />

                                  <div className="pl-2">
                                    {/* Ciclo badge */}
                                    {sel.ciclo != null && (
                                      <span className={cn('inline-block text-[8px] font-black uppercase rounded-full px-1.5 py-0.5 mb-1', paleta.pill)}>
                                        Ciclo {sel.ciclo}
                                      </span>
                                    )}

                                    {/* Nombre del curso */}
                                    <p className={cn('text-[10px] font-bold leading-tight', paleta.text)}
                                       title={sel.nombreCurso}>
                                      {abreviar(sel.nombreCurso, 22)}
                                    </p>

                                    {/* Detalles */}
                                    <div className={cn('mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5', paleta.text, 'opacity-80')}>
                                      <span className="text-[8.5px] font-semibold uppercase">{sel.tipoComponente}</span>
                                      <span className="text-[8px] opacity-50">•</span>
                                      <span className="text-[8.5px] font-semibold">Sec. {secLetra}</span>
                                      {tipo === 'LABORATORIO' && (
                                        <>
                                          <span className="text-[8px] opacity-50">•</span>
                                          <span className="text-[8.5px] font-semibold">Gr. {sel.codigoGrupo}</span>
                                        </>
                                      )}
                                      <span className="text-[8px] opacity-50">•</span>
                                      <span className="text-[8.5px] font-semibold">{sel.codigoAmbiente}</span>
                                    </div>
                                  </div>

                                  {/* Icono quitar */}
                                  {!sel.publicado && (
                                    <div className={cn(
                                      'absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity',
                                      paleta.text
                                    )}>
                                      <Trash2 className="w-3 h-3 opacity-60" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-200 text-[11px] select-none flex items-center justify-center h-full py-1">–</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
