'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Building2 } from 'lucide-react';
import { departamentosService } from '@/services/departamentos.service';
import { TablaDatos } from '@/components/ui/TablaDatos';
import { Card, CardContent } from '@/components/ui/Card';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { NotificacionToast } from '@/components/ui/NotificacionToast';

export default function DepartamentosPage() {
  const queryClient = useQueryClient();
  const [buscar, setBuscar] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' } | null>(null);
  const [formulario, setFormulario] = useState({ nombre: '', codigo: '' });

  const { data: response, isLoading } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => departamentosService.listar().then((res) => res.data),
  });

  const deps = Array.isArray(response) ? response : response?.data || [];

  const filtrados = deps.filter((d: any) =>
    d.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
    d.codigo.toLowerCase().includes(buscar.toLowerCase())
  );

  const crearMutation = useMutation({
    mutationFn: (datos: any) => departamentosService.crear(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Departamento creado exitosamente', tipo: 'exito' });
      resetFormulario();
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al crear departamento', tipo: 'error' });
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: any }) => departamentosService.actualizar(id, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
      setModalAbierto(false);
      setToast({ mensaje: 'Departamento actualizado', tipo: 'exito' });
      resetFormulario();
    },
    onError: (error: any) => {
      setToast({ mensaje: error.response?.data?.error || 'Error al actualizar', tipo: 'error' });
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => departamentosService.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
      setToast({ mensaje: 'Departamento desactivado', tipo: 'exito' });
    },
    onError: () => setToast({ mensaje: 'Error al desactivar', tipo: 'error' }),
  });

  const resetFormulario = () => {
    setFormulario({ nombre: '', codigo: '' });
    setEditando(null);
  };

  const abrirModalCrear = () => {
    resetFormulario();
    setModalAbierto(true);
  };

  const abrirModalEditar = (dep: any) => {
    setEditando(dep);
    setFormulario({ nombre: dep.nombre, codigo: dep.codigo });
    setModalAbierto(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editando) {
      actualizarMutation.mutate({ id: editando.id, datos: formulario });
    } else {
      crearMutation.mutate(formulario);
    }
  };

  const columnas = [
    {
      clave: 'codigo',
      titulo: 'Código',
      render: (item: any) => (
        <span className="font-mono text-sm font-bold text-unt-primary">{item.codigo}</span>
      )
    },
    {
      clave: 'nombre',
      titulo: 'Departamento Académico',
      render: (item: any) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Building2 className="w-4 h-4 text-unt-primary" />
          </div>
          <span className="font-semibold text-slate-900">{item.nombre}</span>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Departamentos Académicos</h1>
          <p className="text-slate-500 mt-1">Gestión de departamentos que dictan cursos.</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar departamento..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-unt-primary/5 focus:border-unt-primary transition-all bg-white shadow-sm"
            />
          </div>
          <Boton onClick={abrirModalCrear} className="rounded-2xl px-6 shadow-lg shadow-unt-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Departamento
          </Boton>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <TablaDatos
            columnas={columnas}
            datos={filtrados}
            loading={isLoading}
            alEditar={abrirModalEditar}
            alEliminar={(dep) => {
              if (confirm(`¿Desactivar departamento "${dep.nombre}"?`)) {
                eliminarMutation.mutate(dep.id);
              }
            }}
          />
        </CardContent>
      </Card>

      <Modal isOpen={modalAbierto} onClose={() => setModalAbierto(false)}
        titulo={editando ? 'Editar Departamento' : 'Nuevo Departamento'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <CampoTexto
            label="Código"
            placeholder="Ej: SIS"
            value={formulario.codigo}
            onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })}
            required
          />
          <CampoTexto
            label="Nombre del Departamento"
            placeholder="Ej: INGENIERIA DE SISTEMAS"
            value={formulario.nombre}
            onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
            required
          />
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Boton type="button" variant="outline" onClick={() => setModalAbierto(false)} className="rounded-xl px-6">
              Cancelar
            </Boton>
            <Boton type="submit" cargando={crearMutation.isPending || actualizarMutation.isPending} className="rounded-xl px-8">
              {editando ? 'Guardar Cambios' : 'Crear Departamento'}
            </Boton>
          </div>
        </form>
      </Modal>

      {toast && (
        <NotificacionToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
