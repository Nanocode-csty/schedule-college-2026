import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { MatrizDisponibilidad, DisponibilidadCelda, SeleccionTemporal } from './horarios.types';
import { obtenerClavesPorPatron } from './redis-claves';
import { GestorSeleccionTemporal } from './gestor-seleccion-temporal.service';

export class GestorDisponibilidad {
  /**
   * Construye la matriz de disponibilidad para un ambiente en un período
   */
  static async construirMatriz(
    idAmbiente: number,
    idPeriodo: number,
    idDocente?: number,
    idComponente?: number,
    idAsignacion?: number,
    numeroGrupoGeneral?: number
  ): Promise<MatrizDisponibilidad> {
    const ambiente = await prisma.ambiente.findUnique({ where: { id: idAmbiente } });
    if (!ambiente) throw new Error('Ambiente no encontrado');

    // Obtener disponibilidad declarada del ambiente
    const disponibilidadAmbiente = await prisma.disponibilidad_ambiente.findMany({
      where: { id_ambiente: idAmbiente },
    });

    // Obtener información del ciclo y tipo si se proporciona un componente
    let idCicloReferencia: number | null = null;
    let tipoComponenteReferencia: string | null = null;
    let numeroGrupoGeneralReferencia: number | null = null;
    if (idComponente) {
      const comp = await prisma.curso_componente.findUnique({
        where: { id: idComponente },
        include: { oferta: true },
      });
      if (comp) {
        idCicloReferencia = comp.oferta.id_ciclo;
        tipoComponenteReferencia = comp.tipo;
      }
      
      // If we have idAsignacion, get the numero_grupo_general from there
      if (idAsignacion) {
        const asignacion = await prisma.asignacion_docente_componente.findUnique({
          where: { id: idAsignacion }
        });
        if (asignacion) {
          numeroGrupoGeneralReferencia = asignacion.numero_grupo_general;
        }
      } else if (numeroGrupoGeneral !== undefined) {
        numeroGrupoGeneralReferencia = numeroGrupoGeneral;
      } else if (idDocente) {
        // If no idAsignacion or numeroGrupoGeneral provided, try to find from docente's assignments
        const asignacion = await prisma.asignacion_docente_componente.findFirst({
          where: {
            id_docente: idDocente,
            id_componente: idComponente
          }
        });
        if (asignacion) {
          numeroGrupoGeneralReferencia = asignacion.numero_grupo_general;
        }
      }
      
      if (numeroGrupoGeneralReferencia === null) {
        numeroGrupoGeneralReferencia = 0; // Default to group 0 (A)
      }
    }

    // Obtener restricciones
    const configs = await prisma.configuracion.findMany({
      where: { id_periodo: idPeriodo },
    });
    const mapaConfig: Record<string, string> = {};
    configs.forEach((c) => (mapaConfig[c.clave] = c.valor));

    const franjaInicio = mapaConfig['FRANJA_INICIO'] || '07:00';
    const franjaFin = mapaConfig['FRANJA_FIN'] || '22:00';
    const almuerzoInicio = mapaConfig['BLOQUEO_ALMUERZO_INICIO'] || '12:00';
    const almuerzoFin = mapaConfig['BLOQUEO_ALMUERZO_FIN'] || '13:00';
    const laboraSabado = mapaConfig['LABORA_SABADO'] !== 'false';

    // 1. Horarios asignados al ambiente actual
    const horariosAsignadosAmbiente = await prisma.bloque_horario.findMany({
      where: {
        id_ambiente: idAmbiente,
        id_periodo: idPeriodo,
        estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
      },
      include: {
        docente: true,
        ambiente: true,
        componente: { include: { oferta: { include: { curso: true } } } },
        grupo: true,
      },
    });

    // 2. Horarios del docente actual (en cualquier ambiente)
    const horariosDocente = idDocente
      ? await prisma.bloque_horario.findMany({
          where: {
            id_docente: idDocente,
            id_periodo: idPeriodo,
            estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
          },
          include: {
            docente: true,
            ambiente: true,
            componente: { include: { oferta: { include: { curso: true } } } },
            grupo: true,
          },
        })
      : [];

    const noLectivosDocente = idDocente
      ? await prisma.bloque_no_lectivo.findMany({
          where: {
            id_docente: idDocente,
            id_periodo: idPeriodo,
          },
        })
      : [];

    // 3. Horarios del CICLO + GRUPO GENERAL actual (si aplica, en cualquier ambiente)
    const horariosCiclo = idCicloReferencia && numeroGrupoGeneralReferencia !== null
      ? await prisma.bloque_horario.findMany({
          where: {
            id_periodo: idPeriodo,
            numero_grupo_general: numeroGrupoGeneralReferencia,
            componente: {
              oferta: { id_ciclo: idCicloReferencia },
            },
            estado: { in: ['BORRADOR', 'CONFIRMADO', 'PUBLICADO'] },
          },
          include: {
            componente: { include: { oferta: { include: { curso: true } } } },
          },
        })
      : [];

    // 4. Selecciones temporales
    const todasLasSelecciones = await GestorSeleccionTemporal.obtenerTodasLasSelecciones();
    
    // Pre-obtener todos los componentes involucrados en selecciones temporales para evitar await en el loop
    const idComponentesTemporales = [...new Set(todasLasSelecciones.map(s => s.idComponente))];
    const componentesTemporales = await prisma.curso_componente.findMany({
      where: { id: { in: idComponentesTemporales } },
      include: { oferta: { include: { curso: true } } }
    });
    const mapaComponentesTemporales = new Map(componentesTemporales.map(c => [c.id, c]));
    
    // Filtrar selecciones relevantes para el docente, ambiente y ciclo
    const seleccionesTemporalesAmbiente = todasLasSelecciones.filter(s => s.idAmbiente === idAmbiente);
    const seleccionesTemporalesDocente = todasLasSelecciones.filter(s => s.idDocente === idDocente);
    
    // Obtener ciclos y tipos de las selecciones temporales para validar conflictos de ciclo
    const seleccionesTemporalesCiclo: any[] = [];
    if (idCicloReferencia && numeroGrupoGeneralReferencia !== null) {
      for (const sel of todasLasSelecciones) {
        const compSel = mapaComponentesTemporales.get(sel.idComponente);
        if (compSel?.oferta.id_ciclo === idCicloReferencia && (sel.numeroGrupoGeneral ?? 0) === numeroGrupoGeneralReferencia) {
          seleccionesTemporalesCiclo.push({ 
            ...sel, 
            nombreCurso: compSel.oferta.curso.nombre,
            tipoComponente: compSel.tipo
          });
        }
      }
    }

    const mantenimientos = await prisma.mantenimiento.findMany({
      where: {
        id_ambiente: idAmbiente,
        fecha_inicio: { lte: new Date() },
        fecha_fin: { gte: new Date() },
      },
    });

    let dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    if (laboraSabado) {
      dias.push('SABADO');
    }
    const horas = this.generarFranjasHorarias(franjaInicio, franjaFin);

    const filas = horas.map((hora) => {
      const horaFin = `${(parseInt(hora.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;
      const celdas: DisponibilidadCelda[] = dias.map((dia) => {
        // Bloqueo institucional de almuerzo (DESACTIVADO según requerimiento)
        /*
        if (hora >= almuerzoInicio && hora < almuerzoFin) {
          return { diaSemana: dia, horaInicio: hora, estado: 'BLOQUEO_INSTITUCIONAL' };
        }
        */
        // Mantenimiento
        if (mantenimientos.length > 0) {
          return { diaSemana: dia, horaInicio: hora, estado: 'OCUPADO', info: { detalle: 'Mantenimiento de ambiente' } };
        }

        // 0. Disponibilidad declarada del ambiente: solo se permite si está en la lista y disponible
        if (disponibilidadAmbiente.length > 0) {
          const disponible = disponibilidadAmbiente.some(
            (d) =>
              d.dia_semana === dia && d.hora_inicio === hora && d.disponible === true
          );
          if (!disponible) {
            return { diaSemana: dia, horaInicio: hora, estado: 'OCUPADO', info: { detalle: 'Ambiente no disponible en esta franja' } };
          }
        }

        // 1.0 ¿Tiene el docente carga NO Lectiva?
        const bloqueNoLectivoBD = noLectivosDocente.find(
          (h) => h.dia_semana === dia && h.hora_inicio === hora
        );
        if (bloqueNoLectivoBD) {
          return {
            diaSemana: dia,
            horaInicio: hora,
            estado: 'OCUPADO',
            info: {
              detalle: `Carga No Lectiva: ${bloqueNoLectivoBD.seccion.replace(/_/g, ' ')}`,
            },
          };
        }

        // 1. ¿Tiene el docente actual alguna clase o selección temporal propia en este horario?
        const bloqueDocenteBD = horariosDocente.find(
          (h) => h.dia_semana === dia && h.hora_inicio === hora
        );
        if (bloqueDocenteBD) {
          const esAqui = bloqueDocenteBD.id_ambiente === idAmbiente;
          return {
            diaSemana: dia,
            horaInicio: hora,
            estado: esAqui ? 'SELECCION_TEMPORAL' : 'DOCENTE_OTRO_AMBIENTE',
            info: {
              idAmbiente: bloqueDocenteBD.id_ambiente || undefined,
              ambienteCodigo: bloqueDocenteBD.ambiente?.codigo || 'Pendiente',
              curso: bloqueDocenteBD.componente.oferta.curso.nombre,
              tipoComponente: bloqueDocenteBD.componente.tipo,
              grupo: bloqueDocenteBD.grupo.codigo,
              confirmado: true,
              estadoBloque: bloqueDocenteBD.estado,
            },
          };
        }

        const temporalDocente = seleccionesTemporalesDocente.find(
          (s) => s.diaSemana === dia && s.horaInicio === hora
        );
        if (temporalDocente) {
          const esAqui = temporalDocente.idAmbiente === idAmbiente;
          return {
            diaSemana: dia,
            horaInicio: hora,
            estado: esAqui ? 'SELECCION_TEMPORAL' : 'DOCENTE_OTRO_AMBIENTE',
            info: {
              idAmbiente: temporalDocente.idAmbiente || undefined,
              ambienteCodigo: 'Pendiente',
              curso: 'Mi Selección',
              tipoComponente: '',
              grupo: '',
              confirmado: false,
              estadoBloque: 'TEMPORAL',
            },
          };
        }

        // 2. ¿Tiene el CICLO + GRUPO GENERAL actual alguna clase o selección temporal en este horario? (NUEVA VALIDACIÓN)
        const bloqueCicloBD = horariosCiclo.find(
          (h) => h.dia_semana === dia && h.hora_inicio === hora
        );
        const getGroupName = (num: number) => {
          const letters = ['A', 'B', 'C', 'D'];
          return `Grupo ${letters[num]}`;
        };
        
        if (bloqueCicloBD) {
          const esLabActual = tipoComponenteReferencia === 'LABORATORIO';
          const esLabConflicto = bloqueCicloBD.componente.tipo === 'LABORATORIO';
          
          if (!(esLabActual && esLabConflicto)) {
            return {
              diaSemana: dia,
              horaInicio: hora,
              estado: 'OCUPADO',
              info: {
                detalle: `Ciclo ${idCicloReferencia} ${getGroupName(numeroGrupoGeneralReferencia || 0)} ocupado por: ${bloqueCicloBD.componente.oferta.curso.nombre}`,
              },
            };
          }
          // Si ambos son lab, continuamos para ver si hay otros conflictos o si queda libre
        }

        const temporalCiclo = seleccionesTemporalesCiclo.find(
          (s) => s.diaSemana === dia && s.horaInicio === hora && s.idDocente !== idDocente
        );
        if (temporalCiclo) {
          const esLabActual = tipoComponenteReferencia === 'LABORATORIO';
          const esLabTemporal = temporalCiclo.tipoComponente === 'LABORATORIO';

          if (!(esLabActual && esLabTemporal)) {
            return {
              diaSemana: dia,
              horaInicio: hora,
              estado: 'OCUPADO',
              info: {
                detalle: `Ciclo ${idCicloReferencia} ${getGroupName(numeroGrupoGeneralReferencia || 0)} ocupado temporalmente por otro curso`,
              },
            };
          }
        }

        // 3. ¿Está ocupado el ambiente actual por OTRO docente?
        const bloqueAmbienteBD = horariosAsignadosAmbiente.find(
          (h) => h.dia_semana === dia && h.hora_inicio === hora
        );
        if (bloqueAmbienteBD) {
          const esLabActual = tipoComponenteReferencia === 'LABORATORIO';
          const esLabConflicto = bloqueAmbienteBD.componente.tipo === 'LABORATORIO';
          const esAmbienteLab = ambiente.tipo === 'LABORATORIO';

          if (!(esAmbienteLab && esLabActual && esLabConflicto)) {
            return {
              diaSemana: dia,
              horaInicio: hora,
              estado: 'OCUPADO',
              info: {
                detalle: `Ambiente ocupado por ${bloqueAmbienteBD.componente.oferta.curso.nombre} (${bloqueAmbienteBD.docente?.nombres} ${bloqueAmbienteBD.docente?.apellidos})`,
              },
            };
          }
        }

        const temporalAmbiente = seleccionesTemporalesAmbiente.find(
          (s) => s.diaSemana === dia && s.horaInicio === hora && s.idDocente !== idDocente
        );
        if (temporalAmbiente) {
          const compTemporal = mapaComponentesTemporales.get(temporalAmbiente.idComponente);

          const esLabActual = tipoComponenteReferencia === 'LABORATORIO';
          const esLabTemporal = compTemporal?.tipo === 'LABORATORIO';
          const esAmbienteLab = ambiente.tipo === 'LABORATORIO';

          if (!(esAmbienteLab && esLabActual && esLabTemporal)) {
            return {
              diaSemana: dia,
              horaInicio: hora,
              estado: 'OCUPADO',
              info: {
                detalle: 'Ambiente ocupado temporalmente por otro docente',
              },
            };
          }
        }

        // 4. Celda libre
        return { diaSemana: dia, horaInicio: hora, estado: 'LIBRE' };
      });
      return { horaInicio: hora, horaFin, celdas };
    });

    return {
      ambienteId: idAmbiente,
      ambienteCodigo: ambiente.codigo,
      filas,
    };
  }

  /**
   * Genera las franjas horarias desde inicio hasta fin (cada 1 hora)
   */
  static generarFranjasHorarias(inicio: string, fin: string): string[] {
    const franjas: string[] = [];
    let [horaInicio] = inicio.split(':').map(Number);
    const [horaFin] = fin.split(':').map(Number);
    while (horaInicio < horaFin) {
      const hh = horaInicio.toString().padStart(2, '0');
      franjas.push(`${hh}:00`);
      horaInicio++;
    }
    return franjas;
  }
}
