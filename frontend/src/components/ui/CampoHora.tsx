import React, { forwardRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utilidades';
import { Clock } from 'lucide-react';

export interface CampoHoraProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  error?: string;
  ayuda?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export const CampoHora = forwardRef<HTMLInputElement, CampoHoraProps>(
  ({ label, error, ayuda, value, onChange, className, ...props }, ref) => {
    const [horas, setHoras] = useState<string>('08');
    const [minutos, setMinutos] = useState<string>('00');

    // Parse initial value when it changes
    useEffect(() => {
      if (value && /^\d{2}:\d{2}$/.test(value)) {
        const [h, m] = value.split(':');
        setHoras(h);
        setMinutos(m);
      }
    }, [value]);

    const handleHorasChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newHoras = e.target.value;
      setHoras(newHoras);
      onChange?.(`${newHoras}:${minutos}`);
    };

    const handleMinutosChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newMinutos = e.target.value;
      setMinutos(newMinutos);
      onChange?.(`${horas}:${newMinutos}`);
    };

    // Generate options
    const opcionesHoras = Array.from({ length: 24 }, (_, i) => 
      String(i).padStart(2, '0')
    );
    
    const opcionesMinutos = Array.from({ length: 12 }, (_, i) => 
      String(i * 5).padStart(2, '0')
    );

    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-gray-700 ml-1">{label}</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
            <div className="flex items-center gap-1 pl-11 pr-4 py-4 rounded-2xl border border-gray-200 bg-slate-50/50 hover:bg-white transition-all duration-200">
              <select
                value={horas}
                onChange={handleHorasChange}
                className="w-full bg-transparent text-gray-900 focus:outline-none font-medium"
              >
                {opcionesHoras.map(h => (
                  <option key={h} value={h}>{h} h</option>
                ))}
              </select>
              <span className="text-slate-400 font-bold">:</span>
              <select
                value={minutos}
                onChange={handleMinutosChange}
                className="w-full bg-transparent text-gray-900 focus:outline-none font-medium"
              >
                {opcionesMinutos.map(m => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {error && <p className="mt-1 text-xs font-bold text-red-600 ml-1">{error}</p>}
        {ayuda && !error && <p className="mt-1 text-[10px] font-medium text-gray-400 ml-1 uppercase tracking-wider">{ayuda}</p>}
      </div>
    );
  }
);

CampoHora.displayName = 'CampoHora';
