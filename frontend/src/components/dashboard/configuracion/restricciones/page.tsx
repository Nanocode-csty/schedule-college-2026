'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { configuracionService } from '@/services/configuracion.service';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { CampoHora } from '@/components/ui/CampoHora';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { SpinnerCarga } from '@/components/ui/SpinnerCarga';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings, Clock, Calendar, Users } from 'lucide-react';

const schema = z.object({
  FRANJA_INICIO: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  FRANJA_FIN: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  HORAS_MAX_DIARIAS: z.coerce.number().int().min(1).max(16),
  BLOQUEO_ALMUERZO_INICIO: z.string().regex(/^\d{2}:\d{2}$/),
  BLOQUEO_ALMUERZO_FIN: z.string().regex(/^\d{2}:\d{2}$/),
  TIEMPO_ATENCION_VENTANA: z.coerce.number().int().min(1).max(60),
  LABORA_SABADO: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function RestriccionesPage() {
  const queryClient = useQueryClient();

  const { data: restricciones, isLoading } = useQuery({
    queryKey: ['restricciones'],
    queryFn: async () => {
      const res = await configuracionService.obtenerRestricciones();
      return res.data;
    },
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors }, control } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: restricciones ? {
      FRANJA_INICIO: restricciones.franjaInicio,
      FRANJA_FIN: restricciones.franjaFin,
      HORAS_MAX_DIARIAS: restricciones.horasMaximasDiarias,
      BLOQUEO_ALMUERZO_INICIO: restricciones.bloqueoAlmuerzoInicio,
      BLOQUEO_ALMUERZO_FIN: restricciones.bloqueoAlmuerzoFin,
      TIEMPO_ATENCION_VENTANA: restricciones.tiempoAtencionVentana,
      LABORA_SABADO: restricciones.laboraSabado,
    } : undefined,
  });

  const laboraSabadoValue = watch('LABORA_SABADO');

  useEffect(() => {
    if (restricciones) {
      reset({
        FRANJA_INICIO: restricciones.franjaInicio,
        FRANJA_FIN: restricciones.franjaFin,
        HORAS_MAX_DIARIAS: restricciones.horasMaximasDiarias,
        BLOQUEO_ALMUERZO_INICIO: restricciones.bloqueoAlmuerzoInicio,
        BLOQUEO_ALMUERZO_FIN: restricciones.bloqueoAlmuerzoFin,
        TIEMPO_ATENCION_VENTANA: restricciones.tiempoAtencionVentana,
        LABORA_SABADO: restricciones.laboraSabado,
      });
    }
  }, [restricciones, reset]);

  const mutation = useMutation({
    mutationFn: (datos: FormData) =>
      configuracionService.actualizarRestricciones(datos),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['restricciones'],
      });

      setTimeout(() => {
        mutation.reset();
      }, 3000);
    },
  });

  const onSubmit = (datos: FormData) => mutation.mutate(datos);

  if (isLoading) return <SpinnerCarga />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-6 py-8 text-white shadow-xl relative">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-56 w-56 bg-unt-accent/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
              Configuración
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Reglas del Sistema
              </h1>
              <p className="text-sm text-white/80 sm:text-base">
                Gestiona las restricciones y parámetros institucionales para la asignación de horarios.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-500" />
              Parámetros de Configuración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="FRANJA_INICIO"
                  render={({ field }) => (
                    <CampoHora 
                      label="Franja horaria inicio" 
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.FRANJA_INICIO?.message} 
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="FRANJA_FIN"
                  render={({ field }) => (
                    <CampoHora 
                      label="Franja horaria fin" 
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.FRANJA_FIN?.message} 
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CampoTexto 
                  label="Horas máximas diarias por docente" 
                  type="number" 
                  {...register('HORAS_MAX_DIARIAS')} 
                  error={errors.HORAS_MAX_DIARIAS?.message} 
                  ayuda="Entre 1 y 16 horas"
                />
                <CampoTexto 
                  label="Franja de ventanas de atención (minutos)" 
                  type="number"
                  {...register('TIEMPO_ATENCION_VENTANA')} 
                  error={errors.TIEMPO_ATENCION_VENTANA?.message} 
                  ayuda="Entre 1 y 60 minutos"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="BLOQUEO_ALMUERZO_INICIO"
                  render={({ field }) => (
                    <CampoHora 
                      label="Bloqueo almuerzo inicio" 
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.BLOQUEO_ALMUERZO_INICIO?.message} 
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="BLOQUEO_ALMUERZO_FIN"
                  render={({ field }) => (
                    <CampoHora 
                      label="Bloqueo almuerzo fin" 
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.BLOQUEO_ALMUERZO_FIN?.message} 
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-indigo-500" />
                  <div>
                    <p className="text-slate-800 font-semibold">Laborar el día Sábado</p>
                    <p className="text-xs text-slate-500">Habilita o deshabilita el día sábado en las ventanas de atención y horarios.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setValue('LABORA_SABADO', !laboraSabadoValue)}
                  className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${laboraSabadoValue ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${laboraSabadoValue ? 'translate-x-6' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              <Boton type="submit" disabled={mutation.isPending} className="w-full sm:w-auto">
                {mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Boton>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-500" />
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <p className="font-semibold text-indigo-800">Consejo</p>
              <p className="mt-1">Los cambios se aplican inmediatamente a todas las operaciones de generación de ventanas y horarios.</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
              <p className="font-semibold text-amber-800">Nota</p>
              <p className="mt-1">Asegúrate de que la franja horaria cubra todos los horarios de los cursos ofertados.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {mutation.isSuccess && <NotificacionToast mensaje="Restricciones actualizadas" tipo="exito" />}
      {mutation.isError && <NotificacionToast mensaje="Error al guardar" tipo="error" />}
    </div>
  );
}