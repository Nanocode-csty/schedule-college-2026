'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Search, Plus, Hash, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { sedesService } from '@/services/sedes.service';
import { useAuthStore } from '@/stores/auth.store';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Boton } from '@/components/ui/Boton';
import { NotificacionToast } from '@/components/ui/NotificacionToast';
import { Selector } from '@/components/ui/Selector';

const sedeSchema = z.object({
  codigo: z.string().min(1, 'El código es obligatorio'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  tipo: z.enum(['CENTRAL', 'DESCONCENTRADA']),
  distrito: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
});

type SedeFormData = z.infer<typeof sedeSchema>;

export default function SedesPage() {
  const queryClient = useQueryClient();
  const { usuario } = useAuthStore();
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';

  const [buscar, setBuscar] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' | 'advertencia' } | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['sedes', buscar],
    queryFn: () => sedesService.listar().then((res) => res.data),
  });

  const lista = Array.isArray(response) ? response : response?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SedeFormData>({
    resolver: zodResolver(sedeSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      tipo: 'DESCONCENTRADA',
      distrito: '',
      provincia: '',
    },
  });

  const tipoValue = watch('tipo');

  const guardarMutation = useMutation({
    mutationFn: (datos: SedeFormData) => {
      if (editando) {
        return sedesService.actualizar(editando.id, datos);
      }
      return sedesService.crear(datos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sedes'] });
      setToast({
        mensaje: editando ? 'Sede actualizada exitosamente' : 'Sede creada exitosamente',
        tipo: 'exito',
      });
      cerrarModal();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || 'Error al guardar la sede';
      setToast({ mensaje: msg, tipo: 'error' });
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => sedesService.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sedes'] });
      setToast({ mensaje: 'Sede desactivada exitosamente', tipo: 'exito' });
    },
    onError: () => {
      setToast({ mensaje: 'Error al desactivar sede', tipo: 'error' });
    },
  });

  const abrirCrear = () => {
    setEditando(null);
    reset({ codigo: '', nombre: '', tipo: 'DESCONCENTRADA', distrito: '', provincia: '' });
    setMostrarModal(true);
  };

  const abrirEditar = (item: any) => {
    setEditando(item);
    reset({
      codigo: item.codigo ?? '',
      nombre: item.nombre ?? '',
      tipo: item.tipo ?? 'DESCONCENTRADA',
      distrito: item.distrito ?? '',
      provincia: item.provincia ?? '',
    });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEditando(null);
    reset();
  };

  const columnas = [
    {
      clave: 'codigo',
      titulo: 'Código',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-slate-400" />
          <span className="font-mono font-bold text-slate-900">{item.codigo}</span>
        </div>
      ),
    },
    {
      clave: 'nombre',
      titulo: 'Nombre',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-unt-primary/60" />
          <span className="font-medium text-slate-800">{item.nombre}</span>
        </div>
      ),
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      render: (item: any) => (
        item.tipo === 'CENTRAL' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
            <CheckCircle className="w-3.5 h-3.5" />
            Sede Central
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-400 border border-slate-100">
            <XCircle className="w-3.5 h-3.5" />
            Filial
          </span>
        )
      ),
    },
    {
      clave: 'distrito',
      titulo: 'Distrito',
      render: (item: any) => (
        <span className="text-sm text-slate-600">{item.distrito || '-'}</span>
      ),
    },
    {
      clave: 'provincia',
      titulo: 'Provincia',
      render: (item: any) => (
        <span className="text-sm text-slate-600">{item.provincia || '-'}</span>
      ),
    },
    {
      clave: 'activo',
      titulo: 'Estado',
      render: (item: any) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
            item.activo
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.activo ? 'bg-green-500' : 'bg-red-500'}`} />
          {item.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Sedes</h1>
          <p className="text-slate-500 mt-1">Gestiona las sedes (locales físicos) de la universidad.</p>
        </div>

        <div className="flex w-full gap-3 sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm shadow-sm transition-all focus:border-unt-primary focus:ring-4 focus:ring-unt-primary/5 focus:outline-none"
            />
          </div>
          {esAdmin && (
            <Boton onClick={abrirCrear} className="rounded-2xl px-6 shadow-lg shadow-unt-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              Nueva sede
            </Boton>
          )}
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <TablaDatos
            columnas={columnas}
            datos={lista}
            loading={isLoading}
            alEditar={esAdmin ? abrirEditar : undefined}
            alEliminar={esAdmin ? (item) => {
              if (window.confirm(`¿Estás seguro de desactivar la sede "${item.nombre}"?`)) {
                eliminarMutation.mutate(item.id);
              }
            } : undefined}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={mostrarModal}
        onClose={cerrarModal}
        titulo={editando ? 'Editar Sede' : 'Registrar Nueva Sede'}
      >
        <form onSubmit={handleSubmit((datos) => guardarMutation.mutate(datos))} className="space-y-6">
          <div className="grid gap-6">
            <CampoTexto
              label="Código"
              placeholder="Ej: CENTRAL"
              {...register('codigo')}
              error={errors.codigo?.message}
            />
            <CampoTexto
              label="Nombre"
              placeholder="Ej: Sede Central"
              {...register('nombre')}
              error={errors.nombre?.message}
            />
            <Selector
              label="Tipo"
              error={errors.tipo?.message}
              opciones={[
                { valor: 'DESCONCENTRADA', etiqueta: 'Filial' },
                { valor: 'CENTRAL', etiqueta: 'Sede Central' }
              ]}
              value={tipoValue}
              onChange={(e) => {
                setValue('tipo', e.target.value as 'CENTRAL' | 'DESCONCENTRADA', { shouldDirty: true, shouldTouch: true });
              }}
            />
            <CampoTexto
              label="Distrito"
              placeholder="Ej: San Juan"
              {...register('distrito')}
              error={errors.distrito?.message}
            />
            <CampoTexto
              label="Provincia"
              placeholder="Ej: San Juan"
              {...register('provincia')}
              error={errors.provincia?.message}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Boton type="button" variant="outline" onClick={cerrarModal} className="rounded-xl px-6">
              Cancelar
            </Boton>
            <Boton type="submit" cargando={guardarMutation.isPending} className="rounded-xl px-8 shadow-md shadow-unt-primary/10">
              {editando ? 'Actualizar Sede' : 'Crear Sede'}
            </Boton>
          </div>
        </form>
      </Modal>

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
