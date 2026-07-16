'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  CalendarDays,
  LayoutList,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utilidades';

import { ambientesService } from '@/services/ambientes.service';
import { sedesService } from '@/services/sedes.service';
import { configuracionService } from '@/services/configuracion.service';

import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Selector } from '@/components/ui/Selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { MatrizCargaNoLectiva } from '@/components/horarios/MatrizCargaNoLectiva';

const DIAS_SEMANA = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
];

export default function AmbienteDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [toast, setToast] = useState<{
    mensaje: string;
    tipo: 'exito' | 'error' | 'advertencia';
  } | null>(null);

  const [pestanaActiva, setPestanaActiva] = useState<'datos' | 'disponibilidad'>(
    'datos'
  );

  const [formulario, setFormulario] = useState({
    codigo: '',
    tipo: 'AULA' as 'AULA' | 'LABORATORIO',
    capacidad: 40,
    piso: '',
    equipamiento: '',
    id_sede: null as number | null,
  });

  const [bloquesDisponibilidad, setBloquesDisponibilidad] = useState<
    Array<{ dia_semana: string; hora_inicio: string; hora_fin: string }>
  >([]);
  const [disponibilidadCompleta, setDisponibilidadCompleta] = useState(false);

  const isNew = id === 'nuevo';

  // Query para obtener sedes
  const { data: sedesData } = useQuery({
    queryKey: ['sedes'],
    queryFn: () => sedesService.listar().then((res) => res.data),
  });

  const sedes = Array.isArray(sedesData) ? sedesData : sedesData?.data || [];

  // Query para obtener ambiente (solo si no es nuevo)
  const { data: ambiente, isLoading: isLoadingAmbiente } = useQuery({
    queryKey: ['ambiente', id],
    queryFn: () =>
      ambientesService.obtener(parseInt(id as string)).then((res) => res.data),
    enabled: !isNew,
  });

  // Query para obtener disponibilidad del ambiente (si es existente)
  const { data: disponibilidadData } = useQuery({
    queryKey: ['disponibilidadAmbiente', id],
    queryFn: () =>
      ambientesService
        .obtenerDisponibilidadDeclarada(parseInt(id as string))
        .then((res) => res.data),
    enabled: !isNew,
  });

  // Query para obtener configuraciones (franja horaria)
  const { data: configuracionData } = useQuery({
    queryKey: ['configuracion'],
    queryFn: () =>
      configuracionService.obtenerRestricciones().then((res) => res.data.data || res.data),
  });

  // Mutations
  const guardarAmbienteMutation = useMutation({
    mutationFn: (datos: any) =>
      isNew
        ? ambientesService.crear(datos)
        : ambientesService.actualizar(parseInt(id as string), datos),
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ambientes'] });
      if (isNew) {
        // Si es nuevo, redirigir a la página con el id recién creado y pasar a la pestaña de disponibilidad
        router.replace(`/dashboard/ambientes/${data.id}`);
        setPestanaActiva('disponibilidad');
      } else {
        queryClient.invalidateQueries({ queryKey: ['ambiente', id] });
      }
      setToast({
        mensaje: 'Ambiente guardado exitosamente',
        tipo: 'exito',
      });
    },
    onError: (error: any) => {
      setToast({
        mensaje: error.response?.data?.error || 'Error al guardar ambiente',
        tipo: 'error',
      });
    },
  });

  const guardarDisponibilidadMutation = useMutation({
    mutationFn: () => {
      if (!isNew) {
        const payload = {
          disponibilidad: bloquesDisponibilidad.map((bloque) => ({
            diaSemana: bloque.dia_semana,
            horaInicio: bloque.hora_inicio,
            horaFin: bloque.hora_fin,
            disponible: true,
          })),
        };
        console.log('FRONTEND SENDING PAYLOAD:', JSON.stringify(payload, null, 2));
        return ambientesService.guardarDisponibilidadDeclarada(
          parseInt(id as string),
          payload
        );
      }
      return Promise.resolve(null as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['disponibilidadAmbiente', id],
      });
      setToast({
        mensaje: 'Disponibilidad guardada exitosamente',
        tipo: 'exito',
      });
    },
    onError: (error: any) => {
      setToast({
        mensaje:
          error.response?.data?.error || 'Error al guardar disponibilidad',
        tipo: 'error',
      });
    },
  });

  // Load data when ambiente loads
  useEffect(() => {
    if (ambiente) {
      setFormulario({
        codigo: ambiente.codigo,
        tipo: ambiente.tipo,
        capacidad: ambiente.capacidad,
        piso: ambiente.piso?.toString() || '',
        equipamiento: ambiente.equipamiento || '',
        id_sede: ambiente.id_sede || null,
      });
    }
  }, [ambiente]);

  // Load disponibilidad
  useEffect(() => {
    if (disponibilidadData) {
      const bloques = disponibilidadData.map((d: any) => ({
        dia_semana: d.dia_semana,
        hora_inicio: d.hora_inicio,
        hora_fin: d.hora_fin,
      }));
      setBloquesDisponibilidad(bloques);
    }
  }, [disponibilidadData]);

  // Update disponibilidadCompleta when bloques change
  useEffect(() => {
    setDisponibilidadCompleta(verificarDisponibilidadCompleta());
  }, [bloquesDisponibilidad, configuracionData]);

  // Helper: Build matrix for MatrizCargaNoLectiva
  const construirMatrizDisponibilidad = () => {
    const filas = [];

    let inicio = 7;
    let fin = 22;
    let almuerzoInicio = -1;
    let almuerzoFin = -1;
    let laboraSabado = true;

    if (configuracionData) {
      if (configuracionData.franjaInicio) {
        inicio = parseInt(configuracionData.franjaInicio.split(':')[0]);
      }
      if (configuracionData.franjaFin) {
        fin = parseInt(configuracionData.franjaFin.split(':')[0]);
      }
      if (configuracionData.bloqueoAlmuerzoInicio) {
        almuerzoInicio = parseInt(
          configuracionData.bloqueoAlmuerzoInicio.split(':')[0]
        );
      }
      if (configuracionData.bloqueoAlmuerzoFin) {
        almuerzoFin = parseInt(
          configuracionData.bloqueoAlmuerzoFin.split(':')[0]
        );
      }
      if (configuracionData.laboraSabado !== undefined) {
        laboraSabado = configuracionData.laboraSabado;
      }
    }

    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    if (laboraSabado) {
      dias.push('SABADO');
    }

    for (let hora = inicio; hora < fin; hora++) {
      const hh = hora.toString().padStart(2, '0');
      const horaStr = `${hh}:00`;
      const horaFinStr = `${(hora + 1).toString().padStart(2, '0')}:00`;

      const celdas = dias.map((dia) => {
        if (hora >= almuerzoInicio && hora < almuerzoFin) {
          return {
            diaSemana: dia,
            horaInicio: horaStr,
            estado: 'BLOQUEO_ALMUERZO' as const,
          };
        }

        const bloqueDisponible = bloquesDisponibilidad.find(
          (bloque) =>
            bloque.dia_semana === dia && bloque.hora_inicio === horaStr
        );

        if (bloqueDisponible) {
          return {
            diaSemana: dia,
            horaInicio: horaStr,
            estado: 'NO_LECTIVO' as const,
            info: { seccion: 'Disponible' },
          };
        }

        return {
          diaSemana: dia,
          horaInicio: horaStr,
          estado: 'LIBRE' as const,
        };
      });

      filas.push({ horaInicio: horaStr, horaFin: horaFinStr, celdas });
    }

    return { filas };
  };

  const handleCeldaClick = (diaSemana: string, horaInicio: string) => {
    const horaFin = `${(parseInt(horaInicio.split(':')[0]) + 1)
      .toString()
      .padStart(2, '0')}:00`;

    // Check if bloque exists
    const existeIndex = bloquesDisponibilidad.findIndex(
      (b) => b.dia_semana === diaSemana && b.hora_inicio === horaInicio
    );

    if (existeIndex >= 0) {
      // Remove it
      setBloquesDisponibilidad((prev) =>
        prev.filter(
          (_, index) =>
            !(
              index === existeIndex
            )
        )
      );
      setDisponibilidadCompleta(false);
    } else {
      // Add it
      setBloquesDisponibilidad((prev) => [
        ...prev,
        {
          dia_semana: diaSemana,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
        },
      ]);
    }
  };

  const llenarDisponibilidadCompleta = () => {
    let inicio = 7;
    let fin = 22;
    let almuerzoInicio = -1;
    let almuerzoFin = -1;
    let laboraSabado = true;

    if (configuracionData) {
      if (configuracionData.franjaInicio) {
        inicio = parseInt(configuracionData.franjaInicio.split(':')[0]);
      }
      if (configuracionData.franjaFin) {
        fin = parseInt(configuracionData.franjaFin.split(':')[0]);
      }
      if (configuracionData.bloqueoAlmuerzoInicio) {
        almuerzoInicio = parseInt(
          configuracionData.bloqueoAlmuerzoInicio.split(':')[0]
        );
      }
      if (configuracionData.bloqueoAlmuerzoFin) {
        almuerzoFin = parseInt(
          configuracionData.bloqueoAlmuerzoFin.split(':')[0]
        );
      }
      if (configuracionData.laboraSabado !== undefined) {
        laboraSabado = configuracionData.laboraSabado;
      }
    }

    const nuevosBloques: Array<{
      dia_semana: string;
      hora_inicio: string;
      hora_fin: string;
    }> = [];

    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    if (laboraSabado) {
      dias.push('SABADO');
    }

    dias.forEach((dia) => {
      for (let hora = inicio; hora < fin; hora++) {
        if (hora >= almuerzoInicio && hora < almuerzoFin) {
          continue;
        }
        const hh = hora.toString().padStart(2, '0');
        nuevosBloques.push({
          dia_semana: dia,
          hora_inicio: `${hh}:00`,
          hora_fin: `${(hora + 1).toString().padStart(2, '0')}:00`,
        });
      }
    });

    setBloquesDisponibilidad(nuevosBloques);
  };

  const verificarDisponibilidadCompleta = () => {
    let inicio = 7;
    let fin = 22;
    let almuerzoInicio = -1;
    let almuerzoFin = -1;
    let laboraSabado = true;

    if (configuracionData) {
      if (configuracionData.franjaInicio) {
        inicio = parseInt(configuracionData.franjaInicio.split(':')[0]);
      }
      if (configuracionData.franjaFin) {
        fin = parseInt(configuracionData.franjaFin.split(':')[0]);
      }
      if (configuracionData.bloqueoAlmuerzoInicio) {
        almuerzoInicio = parseInt(
          configuracionData.bloqueoAlmuerzoInicio.split(':')[0]
        );
      }
      if (configuracionData.bloqueoAlmuerzoFin) {
        almuerzoFin = parseInt(
          configuracionData.bloqueoAlmuerzoFin.split(':')[0]
        );
      }
      if (configuracionData.laboraSabado !== undefined) {
        laboraSabado = configuracionData.laboraSabado;
      }
    }

    let totalEsperado = 0;
    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    if (laboraSabado) {
      dias.push('SABADO');
    }
    dias.forEach(() => {
      for (let hora = inicio; hora < fin; hora++) {
        if (!(hora >= almuerzoInicio && hora < almuerzoFin)) {
          totalEsperado++;
        }
      }
    });

    return bloquesDisponibilidad.length === totalEsperado;
  };

  const handleGuardarDatos = (e: React.FormEvent) => {
    e.preventDefault();
    const datosParaEnviar = {
      ...formulario,
      capacidad: parseInt(formulario.capacidad as any) || 0,
      piso: formulario.piso ? parseInt(formulario.piso) : null,
      id_sede: formulario.id_sede,
    };
    guardarAmbienteMutation.mutate(datosParaEnviar);
  };

  const sedeCentral = sedes.find((s: any) => s.tipo === 'CENTRAL');

  const puedeInteractuarCelda = () => {
    return !isNew;
  };

  const matrizDisponibilidad = construirMatrizDisponibilidad();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0b1f3a] via-[#123b6d] to-[#0f4c81] px-6 py-8 text-white shadow-xl relative">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-full p-3 text-white hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                Gestión de Ambientes
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {isNew ? 'Nuevo Ambiente' : `Ambiente: ${ambiente?.codigo}`}
              </h1>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="relative z-10 mt-8">
          <div className="flex bg-white/10 rounded-2xl p-1.5 backdrop-blur-md shadow-inner w-fit">
            <button
              onClick={() => setPestanaActiva('datos')}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300',
                pestanaActiva === 'datos'
                  ? 'bg-white text-unt-primary shadow-md scale-105'
                  : 'text-white hover:bg-white/20'
              )}
            >
              <LayoutList className="h-4 w-4" />
              1. Datos Generales
            </button>
            <button
              onClick={() => {
                if (isNew) {
                  setToast({
                    mensaje:
                      'Primero guarda los datos generales del ambiente para configurar su disponibilidad',
                    tipo: 'advertencia',
                  });
                  return;
                }
                setPestanaActiva('disponibilidad');
              }}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300',
                pestanaActiva === 'disponibilidad'
                  ? 'bg-white text-unt-primary shadow-md scale-105'
                  : 'text-white hover:bg-white/20',
                isNew ? 'opacity-50 cursor-not-allowed' : ''
              )}
            >
              <CalendarDays className="h-4 w-4" />
              2. Disponibilidad
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8 -mt-2">
        {pestanaActiva === 'datos' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-slate-900 text-lg">
                    <MapPin className="h-5 w-5 text-unt-primary" />
                    Información del Ambiente
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <form
                    id="form-datos-ambiente"
                    onSubmit={handleGuardarDatos}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <CampoTexto
                        label="Código de Ambiente"
                        placeholder="Ej: A-101"
                        value={formulario.codigo}
                        onChange={(e) =>
                          setFormulario({
                            ...formulario,
                            codigo: e.target.value,
                          })
                        }
                        required
                      />
                      <Selector
                        label="Tipo de Espacio"
                        value={formulario.tipo}
                        onChange={(e) =>
                          setFormulario({
                            ...formulario,
                            tipo: e.target.value as 'AULA' | 'LABORATORIO',
                          })
                        }
                      >
                        <option value="AULA">Aula de Clase</option>
                        <option value="LABORATORIO">
                          Laboratorio Especializado
                        </option>
                      </Selector>
                      <CampoTexto
                        label="Capacidad (Aforo)"
                        type="number"
                        value={formulario.capacidad}
                        onChange={(e) =>
                          setFormulario({
                            ...formulario,
                            capacidad: parseInt(e.target.value) || 0,
                          })
                        }
                        required
                      />
                      <CampoTexto
                        label="Nivel / Piso"
                        placeholder="Ej: 1"
                        value={formulario.piso}
                        onChange={(e) =>
                          setFormulario({
                            ...formulario,
                            piso: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Selector
                        label="Sede"
                        value={formulario.id_sede?.toString() || ''}
                        onChange={(e) =>
                          setFormulario({
                            ...formulario,
                            id_sede: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                      >
                        {sedes.map((sede: any) => (
                          <option key={sede.id} value={sede.id}>
                            {sede.nombre} ({sede.tipo === 'CENTRAL' ? 'Sede Central' : 'Filial'})
                          </option>
                        ))}
                      </Selector>
                    </div>
                    <CampoTexto
                      label="Equipamiento / Observaciones"
                      placeholder="Ej: Proyector, Aire Acondicionado, 40 PCs..."
                      value={formulario.equipamiento}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          equipamiento: e.target.value,
                        })
                      }
                    />
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:sticky lg:top-6 lg:self-start">
              <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-unt-primary to-[#0f4c81] text-white py-4">
                  <CardTitle className="flex items-center gap-2 text-white text-base">
                    <Save className="h-4 w-4" />
                    Acciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Boton
                      type="submit"
                      form="form-datos-ambiente"
                      className="w-full justify-center gap-2 rounded-[1.5rem] bg-gradient-to-r from-unt-primary to-[#0f4c81] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-unt-primary/20 hover:from-[#0a2a52] hover:to-[#0a3a6e] transition-all"
                      cargando={guardarAmbienteMutation.isPending}
                    >
                      <Save className="h-4 w-4" />
                      {isNew
                        ? 'Seleccionar Disponibilidad'
                        : 'Guardar Cambios'}
                    </Boton>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {pestanaActiva === 'disponibilidad' && !isNew && (
          <div className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white/60 backdrop-blur-md">
              <CardHeader className="bg-gradient-to-r from-unt-primary to-[#0f4c81] text-white py-6 px-6">
                <CardTitle className="flex items-center gap-3 text-white text-xl">
                  <CalendarDays className="h-6 w-6" />
                  Disponibilidad del Ambiente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-8 pb-10 px-6">
                <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-5 backdrop-blur-sm shadow-sm flex gap-4 items-start">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900 space-y-1">
                    <p>
                      <strong>Instrucciones:</strong> Selecciona los bloques
                      horarios donde el ambiente está disponible para ser
                      reservado.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <button
                    onClick={() => {
                      if (disponibilidadCompleta) {
                        setBloquesDisponibilidad([]);
                        setDisponibilidadCompleta(false);
                      } else {
                        llenarDisponibilidadCompleta();
                        setDisponibilidadCompleta(true);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 border-2',
                      disponibilidadCompleta
                        ? 'bg-unt-primary text-white border-unt-primary shadow-md'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-unt-primary hover:text-unt-primary'
                    )}
                  >
                    {disponibilidadCompleta ? (
                      <span>❌ Desactivar Disponibilidad Completa</span>
                    ) : (
                      <span>✅ Ambiente con Disponibilidad Completa</span>
                    )}
                  </button>
                  <span className="text-sm text-slate-600">
                    {disponibilidadCompleta
                      ? 'El ambiente está disponible en todos los horarios'
                      : 'Selecciona manualmente los horarios disponibles'}
                  </span>
                </div>

                <MatrizCargaNoLectiva
                  matriz={matrizDisponibilidad}
                  alHacerClickCelda={handleCeldaClick}
                  puedeInteractuarCelda={puedeInteractuarCelda}
                />

                <div className="flex justify-end pt-6 border-t border-slate-100">
                  <Boton
                    onClick={() => guardarDisponibilidadMutation.mutate()}
                    className="rounded-[1.5rem] px-8 shadow-md shadow-unt-primary/10"
                    cargando={guardarDisponibilidadMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Disponibilidad
                  </Boton>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {toast && (
        <NotificacionToast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
