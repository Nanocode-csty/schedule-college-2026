'use client';
import { cn } from '@/lib/utilidades';
import { Book, CheckCircle2 } from 'lucide-react';

interface ComponenteAsignable {
  idAsignacion: number;
  idComponente: number;
  nombreCurso: string;
  tipoComponente: string;
  numeroGrupoGeneral: number;
  ciclo?: number | null;
  horasRequeridas: number;
  horasAsignadas: number;
}

interface PanelSeleccionCursoProps {
  componentes: ComponenteAsignable[];
  componenteSeleccionado: number | null; // Now this is idAsignacion? Or idComponente? Wait let's decide: let's use idAsignacion!
  alCambiarComponente: (idAsignacion: number, idComponente: number) => void;
  numSeccionesGenerales?: number;
}

// Helper function to get group name from index
const getGroupName = (num: number, numSeccionesGenerales: number = 1) => {
  if (numSeccionesGenerales === 1) return '';
  const letters = ['A', 'B', 'C', 'D'];
  return `Sección ${letters[num]}`;
};

const getGroupColor = (num: number) => {
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', hover: 'hover:border-blue-300', selected: 'bg-blue-50 ring-blue-100' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', hover: 'hover:border-purple-300', selected: 'bg-purple-50 ring-purple-100' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', hover: 'hover:border-emerald-300', selected: 'bg-emerald-50 ring-emerald-100' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', hover: 'hover:border-orange-300', selected: 'bg-orange-50 ring-orange-100' }
  ];
  return colors[num % colors.length];
};

export function PanelSeleccionCurso({
  componentes,
  componenteSeleccionado, // idAsignacion!
  alCambiarComponente,
  numSeccionesGenerales = 1,
}: PanelSeleccionCursoProps) {
  if (!componentes || componentes.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400 text-xs font-medium">
        No hay componentes disponibles
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {componentes.map((comp) => {
        const esSeleccionado = componenteSeleccionado === comp.idAsignacion;
        const estaCompleto = comp.horasAsignadas >= comp.horasRequeridas;
        const colors = getGroupColor(comp.numeroGrupoGeneral);

        return (
          <button
            key={comp.idAsignacion}
            onClick={() => alCambiarComponente(comp.idAsignacion, comp.idComponente)}
            className={cn(
              'group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200 text-left',
              esSeleccionado
                ? `${colors.selected} border-emerald-200 ring-2 shadow-sm`
                : `bg-white ${colors.border} ${colors.hover}`
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={cn(
                'p-2 rounded-lg transition-colors flex items-center justify-center w-8 h-8',
                esSeleccionado ? `${colors.bg} ${colors.text}` : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
              )}>
                <span className="text-xs font-black">{numSeccionesGenerales > 1 ? getGroupName(comp.numeroGrupoGeneral, numSeccionesGenerales).slice(-1) : 'U'}</span>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className={cn(
                  'text-[11px] font-bold truncate',
                  esSeleccionado ? colors.text : 'text-slate-700'
                )}>
                  {comp.nombreCurso}
                </span>
                <span className={cn(
                  'text-[9px] font-black uppercase tracking-widest flex items-center gap-2',
                  esSeleccionado ? colors.text : 'text-slate-400'
                )}>
                  {comp.ciclo != null && (
                    <>
                      <span className={cn('px-1.5 py-0.5 rounded font-black text-[8px]', esSeleccionado ? colors.bg : 'bg-slate-100 text-slate-500')}>
                        Ciclo {comp.ciclo}
                      </span>
                      <span>•</span>
                    </>
                  )}
                  {numSeccionesGenerales > 1 && (
                    <>
                      <span>{getGroupName(comp.numeroGrupoGeneral, numSeccionesGenerales)}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{comp.tipoComponente}</span>
                </span>
              </div>
            </div>

            {estaCompleto && (
              <div className="ml-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            )}

            {esSeleccionado && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-l-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
