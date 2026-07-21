'use client';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { horariosService } from '@/services/horarios.service';
import { useRef } from 'react';
import type { MatrizDisponibilidadResponse } from '@/types/horarios';
import type { UseQueryResult } from '@tanstack/react-query';

export function useDisponibilidad(
  ambienteId: number | null,
  idPeriodo: number,
  docenteId?: number | null,
  componenteId?: number | null,
  idAsignacion?: number | null,
  numeroGrupoGeneral?: number
): UseQueryResult<MatrizDisponibilidadResponse, Error> & { actualizarMatriz: () => void } {
  const queryClient = useQueryClient();

  // Guardamos los parámetros de componente en una ref para que el queryFn
  // siempre use los valores más actuales, sin que cambien el queryKey.
  const paramsRef = useRef({ componenteId, idAsignacion, numeroGrupoGeneral });
  paramsRef.current = { componenteId, idAsignacion, numeroGrupoGeneral };

  // El queryKey NO incluye componenteId/idAsignacion/numeroGrupoGeneral
  // para que cambiar de componente no invalide ni reemplace los datos de la matriz.
  // La matriz siempre muestra TODOS los bloques del docente en ese ambiente.
  const BASE_KEY = ['matriz-disponibilidad', ambienteId, idPeriodo, docenteId];

  const query = useQuery<MatrizDisponibilidadResponse, Error>({
    queryKey: BASE_KEY,
    queryFn: async () => {
      const response = await horariosService.obtenerMatriz(
        ambienteId!,
        idPeriodo,
        docenteId || undefined,
        paramsRef.current.componenteId || undefined,
        paramsRef.current.idAsignacion || undefined,
        paramsRef.current.numeroGrupoGeneral
      );

      return response.data;
    },
    enabled: !!ambienteId && !!idPeriodo,
    // Mantener datos previos mientras se refetch para evitar parpadeos
    placeholderData: keepPreviousData,
    // No re-fetchar automáticamente por cambio de parámetros (lo hacemos manualmente)
    staleTime: 30 * 1000,
  });

  const actualizarMatriz = () => {
    queryClient.invalidateQueries({ queryKey: BASE_KEY });
  };

  return { ...query, actualizarMatriz };
}