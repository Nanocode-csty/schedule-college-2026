interface ProgresoCurso {
  idAsignacion: number;
  idComponente: number;
  nombreCurso: string;
  tipoComponente: string;
  numeroGrupoGeneral: number;
  horasRequeridas: number;
  horasAsignadas: number;
}

interface IndicadorProgresoHorasProps {
  progreso: ProgresoCurso[];
}

// Helper functions
const getGroupName = (num: number) => {
  const letters = ['A', 'B', 'C', 'D'];
  return `Grupo ${letters[num]}`;
};

const getGroupColor = (num: number) => {
  const colors = [
    { bg: 'bg-blue-400', shadow: 'shadow-[0_0_8px_rgba(59,130,246,0.3)]' },
    { bg: 'bg-purple-400', shadow: 'shadow-[0_0_8px_rgba(168,85,247,0.3)]' },
    { bg: 'bg-emerald-400', shadow: 'shadow-[0_0_8px_rgba(52,211,153,0.3)]' },
    { bg: 'bg-orange-400', shadow: 'shadow-[0_0_8px_rgba(251,146,60,0.3)]' }
  ];
  return colors[num % colors.length];
};

export function IndicadorProgresoHoras({ progreso }: IndicadorProgresoHorasProps) {
  return (
    <div className="space-y-4">
      {progreso.map((item, idx) => {
        const porcentaje = item.horasRequeridas > 0 ? Math.min(Math.round((item.horasAsignadas / item.horasRequeridas) * 100), 100) : 0;
        const estaCompleto = item.horasAsignadas >= item.horasRequeridas;
        const colors = getGroupColor(item.numeroGrupoGeneral);
        
        return (
          <div key={item.idAsignacion} className="space-y-1.5">
            <div className="flex justify-between items-center px-0.5">
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-slate-800 leading-tight truncate max-w-[140px]">
                  {item.nombreCurso}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span>{getGroupName(item.numeroGrupoGeneral)}</span>
                  <span>•</span>
                  <span>{item.tipoComponente}</span>
                </span>
              </div>
              <span className="text-[10px] font-black text-slate-800 tabular-nums">
                {item.horasAsignadas} / {item.horasRequeridas}h
              </span>
            </div>
            
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  estaCompleto ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]' : `${colors.bg} ${colors.shadow}`
                }`}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
