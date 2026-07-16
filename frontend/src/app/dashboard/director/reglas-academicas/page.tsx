'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings, GraduationCap, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Selector } from '@/components/ui/Selector';
import { configuracionService } from '@/services/configuracion.service';

const schema = z.object({
  NUM_GRUPOS_GENERALES: z.coerce.number().int().min(1).max(3),
});

type FormData = z.infer<typeof schema>;

export default function ReglasAcademicasPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);

  const { data: restricciones, isLoading } = useQuery({
    queryKey: ['restricciones-academicas'],
    queryFn: async () => {
      const res = await configuracionService.obtenerRestricciones();
      return res.data;
    },
  });

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: restricciones ? {
      NUM_GRUPOS_GENERALES: restricciones.numGruposGenerales,
    } : undefined,
  });

  const numGruposValue = watch('NUM_GRUPOS_GENERALES');

  useEffect(() => {
    if (restricciones) {
      reset({
        NUM_GRUPOS_GENERALES: restricciones.numGruposGenerales,
      });
    }
  }, [restricciones, reset]);

  const mutation = useMutation({
    mutationFn: (datos: FormData) => configuracionService.actualizarRestricciones(datos),
    onSuccess: () => {
      setToast({ mensaje: 'Reglas académicas actualizadas correctamente', tipo: 'exito' });
      queryClient.invalidateQueries({ queryKey: ['restricciones-academicas'] });
    },
    onError: () => {
      setToast({ mensaje: 'Error al actualizar las reglas', tipo: 'error' });
    }
  });

  const onSubmit = (datos: FormData) => {
    // Send only the NUM_GRUPOS_GENERALES field
    const payload = {
      NUM_GRUPOS_GENERALES: datos.NUM_GRUPOS_GENERALES,
    };
    mutation.mutate(payload);
  };

  // Helper function to generate group names
  const getGroupNames = (num: number) => {
    const letras = ['A', 'B', 'C'];
    return Array.from({ length: num }, (_, i) => `Grupo ${letras[i]}`);
  };

  if (isLoading) return <SpinnerCarga />;

  const groupNames = getGroupNames(Number(numGruposValue || 1));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* Header Estilo Classroom */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-10 py-12 text-white shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest text-white/90">
              <Settings className="w-3.5 h-3.5" />
              Configuración Académica
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Reglas Académicas</h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Define la cantidad de grupos generales por promoción y ajusta la distribución de la carga horaria.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario Principal */}
        <Card className="lg:col-span-2 border-slate-200 shadow-lg rounded-[2.5rem]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-unt-primary" />
              Parámetros Académicos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <Controller
                    control={control}
                    name="NUM_GRUPOS_GENERALES"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-800 ml-1">Número de Grupos Generales</label>
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                          <Selector
                            value={field.value}
                            onChange={(e: any) => field.onChange(Number(e.target.value))}
                            className="mt-0 border-slate-200 bg-white"
                          >
                            <option value={1}>1 Grupo General</option>
                            <option value={2}>2 Grupos Generales</option>
                            <option value={3}>3 Grupos Generales</option>
                          </Selector>
                          <p className="text-xs text-slate-500 mt-3 font-medium">
                            Máximo 3 grupos por promoción.
                          </p>
                        </div>
                      </div>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-800 ml-1">Grupos Generados</label>
                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                          Grupos Disponibles
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {groupNames.map((name, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-bold text-emerald-700 shadow-sm"
                          >
                            <Users className="w-4 h-4 text-emerald-500" />
                            {name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Boton
                  type="submit"
                  cargando={mutation.isPending}
                  className="px-10 py-4 text-lg font-bold rounded-2xl shadow-lg shadow-unt-primary/20"
                >
                  {mutation.isPending ? 'Guardando Cambios...' : 'Guardar Configuración'}
                </Boton>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Panel de Información */}
        <Card className="border-slate-200 shadow-lg rounded-[2.5rem]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-unt-primary" />
              Información Importante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              <h4 className="font-bold text-indigo-800 mb-2">¿Qué son los Grupos Generales?</h4>
              <p className="text-indigo-700">
                Son grupos de estudiantes de la misma promoción que toman los mismos cursos con diferentes docentes.
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
              <h4 className="font-bold text-amber-800 mb-2">Carga Horaria Aumentada</h4>
              <p className="text-amber-700">
                Si hay {numGruposValue} grupos, la carga horaria requerida por componente se multiplica por {numGruposValue}.
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-2">Ejemplo</h4>
              <p className="text-slate-700">
                Si Matemáticas requiere 4 horas teóricas y hay {numGruposValue} grupos:{' '}
                <span className="font-bold text-slate-900">
                  {4 * Number(numGruposValue)}h totales
                </span>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {toast && <NotificacionToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
