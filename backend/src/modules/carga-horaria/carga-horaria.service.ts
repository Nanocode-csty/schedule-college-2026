import { prisma } from '@/lib/prisma';
import { PeriodosService } from '../periodos/periodos.service';

export class CargaHorariaService {
  static async asignarCarga(datos: {
    id_componente: number;
    id_docente: number;
    horas_asignadas: number;
    numero_grupo_general?: number;
  }) {
    const { id_componente, id_docente, horas_asignadas, numero_grupo_general = 0 } = datos;

    const [componente, docente] = await Promise.all([
      prisma.curso_componente.findUnique({
        where: { id: id_componente },
        include: { oferta: true, grupos: true }
      }),
      prisma.docente.findUnique({
        where: { id: id_docente },
        include: { asignaciones: {
          include: { componente: { include: { oferta: true } } }
        } }
      })
    ]);

    if (!componente) throw new Error('Componente no encontrado');
    if (!docente) throw new Error('Docente no encontrado');

    const id_periodo = componente.oferta.id_periodo;

    if (componente.tipo === 'LABORATORIO') {
      const nGrupos = componente.grupos?.length || 1;
      const horasPorGrupo = componente.horas_requeridas / nGrupos;
      const numGruposAsignados = horas_asignadas / horasPorGrupo;

      if (Math.abs(numGruposAsignados - Math.round(numGruposAsignados)) > 0.01) {
        throw new Error(
          `Para Laboratorios, las horas asignadas (${horas_asignadas}h) deben ser un múltiplo exacto de las horas del grupo (${horasPorGrupo}h).`
        );
      }
    }

    const horasActualesPeriodo = docente.asignaciones
      .filter(asig => asig.componente.oferta.id_periodo === id_periodo)
      .reduce((acc, asig) => acc + asig.horas_asignadas, 0);

    const limiteLegal = docente.horas_max_semana || 40;

    if (horasActualesPeriodo + horas_asignadas > limiteLegal) {
      throw new Error(`El docente ha excedido su límite legal de ${limiteLegal} horas semanales para este periodo (Actual en otros cursos: ${horasActualesPeriodo}, Nueva: ${horas_asignadas})`);
    }

    const asignacionesGrupo = await prisma.asignacion_docente_componente.findMany({
      where: { id_componente, numero_grupo_general }
    });

    const totalHorasRequeridas = componente.horas_requeridas;
    const totalAsignadoOtrosGrupo = asignacionesGrupo
      .filter(asig => asig.id_docente !== id_docente)
      .reduce((acc, asig) => acc + asig.horas_asignadas, 0);

    if (totalAsignadoOtrosGrupo + horas_asignadas > totalHorasRequeridas) {
      throw new Error(`Las horas asignadas superan el requerimiento del componente para este grupo (${totalHorasRequeridas}h). Faltan por asignar: ${totalHorasRequeridas - totalAsignadoOtrosGrupo}h`);
    }

    if (asignacionesGrupo.length > 0 || totalAsignadoOtrosGrupo > 0) {
      await prisma.curso_componente.update({
        where: { id: id_componente },
        data: { permite_multi_docente: true }
      });
    }

    return prisma.asignacion_docente_componente.upsert({
      where: {
        id_componente_id_docente_numero_grupo_general: {
          id_componente,
          id_docente,
          numero_grupo_general
        }
      },
      update: { horas_asignadas },
      create: {
        id_componente,
        id_docente,
        horas_asignadas,
        numero_grupo_general
      }
    });
  }

  static async obtenerResumenCarga(id_periodo: number) {
    return prisma.docente.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        modalidad: true,
        categoria: true,
        horas_max_semana: true,
        id_departamento: true,
        departamento: { select: { nombre: true } },
        asignaciones: {
          where: { componente: { oferta: { id_periodo } } },
          include: {
            componente: {
              include: {
                oferta: { include: { curso: true } }
              }
            }
          }
        }
      }
    });
  }

  static async configurarOferta(datos: {
    id_periodo: number;
    id_curso: number;
    id_ciclo: number;
    tipo_curso: 'REGULAR' | 'ELECTIVO';
    componentes: Array<{
      tipo: 'TEORIA' | 'PRACTICA' | 'LABORATORIO';
      horas_requeridas: number;
      n_grupos: number;
    }>;
  }) {
    return await prisma.$transaction(async (tx) => {
      const tiposEnSolicitud = datos.componentes.map(c => c.tipo);
      const tieneDuplicados = new Set(tiposEnSolicitud).size !== tiposEnSolicitud.length;
      if (tieneDuplicados) {
        throw new Error('No se pueden incluir componentes duplicados en la misma solicitud.');
      }

      const oferta = await tx.curso_oferta.upsert({
        where: {
          id_periodo_id_curso_id_ciclo: {
            id_periodo: datos.id_periodo,
            id_curso: datos.id_curso,
            id_ciclo: datos.id_ciclo
          }
        },
        update: {
          tipo_curso: datos.tipo_curso,
          estado: 'BORRADOR'
        },
        create: {
          id_periodo: datos.id_periodo,
          id_curso: datos.id_curso,
          id_ciclo: datos.id_ciclo,
          tipo_curso: datos.tipo_curso,
          estado: 'BORRADOR'
        },
        include: {
          componentes: { include: { grupos: true } }
        }
      });

      const tiposEnPayload = datos.componentes.map(c => c.tipo);
      const duplicados = tiposEnPayload.filter((item, index) => tiposEnPayload.indexOf(item) !== index);
      if (duplicados.length > 0) {
        throw new Error(`No se puede enviar el mismo tipo de componente (${duplicados.join(', ')}) varias veces.`);
      }

      const componentesAEliminar = oferta.componentes.filter(c => !tiposEnPayload.includes(c.tipo));

      for (const compAEliminar of componentesAEliminar) {
        const tieneAsignaciones = await tx.asignacion_docente_componente.findFirst({ where: { id_componente: compAEliminar.id } });
        const tieneHorarios = await tx.bloque_horario.findFirst({ where: { id_componente: compAEliminar.id } });

        if (tieneAsignaciones || tieneHorarios) {
          throw new Error(`No se puede eliminar el componente ${compAEliminar.tipo} porque ya tiene carga docente o horarios asignados.`);
        }

        await tx.grupo.deleteMany({ where: { id_componente: compAEliminar.id } });
        await tx.curso_componente.delete({ where: { id: compAEliminar.id } });
      }

      const resultados = [];
      for (const comp of datos.componentes) {
        const horasPorGrupo = Math.round(parseFloat(String(comp.horas_requeridas)));
        const cantidadGrupos = Math.round(parseInt(String(comp.n_grupos))) || 1;
        const totalHoras = horasPorGrupo * cantidadGrupos;

        const componenteExistente = oferta.componentes.find(c => c.tipo === comp.tipo);

        let componente;
        if (componenteExistente) {
          componente = await tx.curso_componente.update({
            where: { id: componenteExistente.id },
            data: {
              horas_requeridas: totalHoras,
              permite_multi_docente: true
            }
          });

          const gruposActuales = await tx.grupo.findMany({ where: { id_componente: componente.id } });
          if (gruposActuales.length !== cantidadGrupos) {
            const tieneHorarios = await tx.bloque_horario.findFirst({ where: { id_componente: componente.id } });
            if (tieneHorarios) {
              throw new Error(`No se puede cambiar el número de grupos para ${comp.tipo} porque ya tiene horarios asignados.`);
            }
            await tx.grupo.deleteMany({ where: { id_componente: componente.id } });
            for (let i = 0; i < cantidadGrupos; i++) {
              await tx.grupo.create({
                data: {
                  id_componente: componente.id,
                  codigo: String.fromCharCode(65 + i),
                  capacidad_maxima: comp.tipo === 'LABORATORIO' ? 20 : 40,
                  tipo_grupo: comp.tipo === 'TEORIA' ? 'UNICO_TEORIA' : comp.tipo === 'PRACTICA' ? 'UNICO_PRACTICA' : 'LABORATORIO_N',
                }
              });
            }
          }
        } else {
          componente = await tx.curso_componente.create({
            data: {
              id_oferta: oferta.id,
              tipo: comp.tipo,
              horas_requeridas: totalHoras,
              permite_multi_docente: true
            }
          });

          for (let i = 0; i < cantidadGrupos; i++) {
            await tx.grupo.create({
              data: {
                id_componente: componente.id,
                codigo: cantidadGrupos === 1 && comp.tipo === 'TEORIA' ? 'UNICO' : String.fromCharCode(65 + i),
                capacidad_maxima: comp.tipo === 'LABORATORIO' ? 20 : 40,
                tipo_grupo: comp.tipo === 'TEORIA' ? 'UNICO_TEORIA' : comp.tipo === 'PRACTICA' ? 'UNICO_PRACTICA' : 'LABORATORIO_N',
              }
            });
          }
        }
        resultados.push(componente);
      }

      return { ...oferta, componentes: resultados };
    });
  }

  static async actualizarAsignacion(id: number, datos: { horas_asignadas: number }) {
    const asignacion = await prisma.asignacion_docente_componente.findUnique({
      where: { id },
      include: {
        componente: { include: { grupos: true, oferta: true } },
        docente: {
          include: {
            asignaciones: {
              include: { componente: { include: { oferta: true } } }
            }
          }
        }
      }
    });

    if (!asignacion) throw new Error('Asignación no encontrada');

    const { componente, docente, numero_grupo_general } = asignacion;
    const id_periodo = componente.oferta.id_periodo;
    const horas_asignadas = Math.round(datos.horas_asignadas);

    if (componente.tipo === 'LABORATORIO') {
      const nGrupos = componente.grupos?.length || 1;
      const horasPorGrupo = componente.horas_requeridas / nGrupos;
      const numGruposAsignados = horas_asignadas / horasPorGrupo;

      if (Math.abs(numGruposAsignados - Math.round(numGruposAsignados)) > 0.01) {
        throw new Error(
          `Para Laboratorios, las horas asignadas (${horas_asignadas}h) deben ser un múltiplo exacto de las horas del grupo (${horasPorGrupo}h).`
        );
      }
    }

    const horasActualesPeriodo = docente.asignaciones
      .filter(asig => asig.componente.oferta.id_periodo === id_periodo && asig.id !== id)
      .reduce((acc, asig) => acc + asig.horas_asignadas, 0);

    const limiteLegal = docente.horas_max_semana || 40;

    if (horasActualesPeriodo + horas_asignadas > limiteLegal) {
      throw new Error(`El docente ha excedido su límite legal de ${limiteLegal} horas semanales para este periodo (Actual en otros cursos: ${horasActualesPeriodo}, Nueva: ${horas_asignadas})`);
    }

    const asignacionesGrupo = await prisma.asignacion_docente_componente.findMany({
      where: {
        id_componente: componente.id,
        numero_grupo_general,
        id: { not: id }
      }
    });

    const totalHorasRequeridas = componente.horas_requeridas;
    const totalAsignadoOtrosGrupo = asignacionesGrupo
      .reduce((acc, asig) => acc + asig.horas_asignadas, 0);

    if (totalAsignadoOtrosGrupo + horas_asignadas > totalHorasRequeridas) {
      throw new Error(`Las horas asignadas superan el requerimiento del componente para este grupo (${totalHorasRequeridas}h). Faltan por asignar: ${totalHorasRequeridas - totalAsignadoOtrosGrupo}h`);
    }

    return prisma.asignacion_docente_componente.update({
      where: { id },
      data: { horas_asignadas }
    });
  }

  static async eliminarAsignacion(id_asignacion: number) {
    return prisma.asignacion_docente_componente.delete({
      where: { id: id_asignacion }
    });
  }

  static async eliminarOferta(id_oferta: number) {
    const tieneHorarios = await prisma.bloque_horario.findFirst({
      where: { id_componente: { in: (await prisma.curso_componente.findMany({ where: { id_oferta }, select: { id: true } })).map(c => c.id) } }
    });

    if (tieneHorarios) {
      throw new Error('No se puede eliminar la oferta porque ya tiene horarios programados. Elimine primero los bloques horarios.');
    }

    return prisma.curso_oferta.update({
      where: { id: id_oferta },
      data: { estado: 'ELIMINADO' }
    });
  }

  static async obtenerOfertaDetalle(id_periodo: number, id_curso: number, id_ciclo: number) {
    return prisma.curso_oferta.findUnique({
      where: {
        id_periodo_id_curso_id_ciclo: { id_periodo, id_curso, id_ciclo }
      },
      include: {
        componentes: { include: { grupos: true } }
      }
    });
  }

  static async obtenerCiclosPorPeriodo(id_periodo: number) {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: id_periodo } });
    if (!periodo) return [];

    const allowedNumbers = PeriodosService.getNumerosCiclosPermitidos(periodo.tipo);

    return prisma.ciclo.findMany({
      where: {
        id_periodo,
        numero: { in: allowedNumbers },
        ofertas: { some: { estado: { not: 'ELIMINADO' } } }
      },
      orderBy: { numero: 'asc' }
    });
  }

  static async obtenerCursosPorCiclo(id_periodo: number, id_ciclo?: number, id_curricula?: number, numero_grupo_general?: number) {
    const where: any = {
      id_periodo,
      estado: { not: 'ELIMINADO' }
    };
    if (id_ciclo) where.id_ciclo = id_ciclo;
    if (id_curricula) where.curso = { id_curricula };

    return prisma.curso_oferta.findMany({
      where,
      include: {
        curso: { include: { departamento: true } },
        ciclo: true,
        componentes: {
          include: {
            grupos: true,
            asignaciones: {
              where: numero_grupo_general !== undefined ? { numero_grupo_general } : {},
              include: { docente: true }
            }
          }
        }
      },
      orderBy: { curso: { nombre: 'asc' } }
    });
  }

  static async sugerirDocentes(id_curso: number) {
    const curso = await prisma.curso.findUnique({
      where: { id: id_curso },
      include: { departamento: true }
    });

    if (!curso) throw new Error('Curso no encontrado');

    const idDepartamento = curso.id_departamento;

    const sugeridos = idDepartamento ? await prisma.docente.findMany({
      where: { activo: true, id_departamento: idDepartamento },
      orderBy: [{ categoria: 'asc' }, { antiguedad: 'desc' }],
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        email: true,
        categoria: true,
        modalidad: true,
        horas_max_semana: true,
        departamento: { select: { id: true, nombre: true } },
      }
    }) : [];

    const otros = await prisma.docente.findMany({
      where: {
        activo: true,
        ...(idDepartamento ? { id_departamento: { not: idDepartamento } } : {}),
      },
      orderBy: [{ apellidos: 'asc' }],
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        email: true,
        categoria: true,
        modalidad: true,
        horas_max_semana: true,
        departamento: { select: { id: true, nombre: true } },
      }
    });

    return {
      curso: { id: curso.id, nombre: curso.nombre, codigo: curso.codigo },
      departamento: curso.departamento,
      sugeridos,
      otros,
      autoAsignar: sugeridos.length === 1 ? sugeridos[0] : null,
    };
  }

  static async previewGenerarOferta(datos: {
    id_periodo: number;
    ids_curricula: number[];
    ids_cursos_adicionales?: number[];
    ids_cursos_excluidos?: number[];
  }) {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: datos.id_periodo } });
    if (!periodo) throw new Error('Período no encontrado');

    const ciclosPermitidos = PeriodosService.getNumerosCiclosPermitidos(periodo.tipo);

    const cursosCurricula = await prisma.curso.findMany({
      where: {
        activo: true,
        id_curricula: { in: datos.ids_curricula },
        ciclo: ciclosPermitidos.length > 0 ? { in: ciclosPermitidos } : undefined,
        id: datos.ids_cursos_excluidos ? { notIn: datos.ids_cursos_excluidos } : undefined,
      },
      include: { departamento: true, curricula: true },
      orderBy: [{ ciclo: 'asc' }, { nombre: 'asc' }],
    });

    const cursosAdicionales = datos.ids_cursos_adicionales?.length
      ? await prisma.curso.findMany({
          where: {
            id: { 
              in: datos.ids_cursos_adicionales,
              ...(datos.ids_cursos_excluidos ? { notIn: datos.ids_cursos_excluidos } : {}),
            },
          },
          include: { departamento: true, curricula: true },
        })
      : [];

    const cursosCombinados = [...cursosCurricula];
    for (const ca of cursosAdicionales) {
      if (!cursosCombinados.find(c => c.id === ca.id)) {
        cursosCombinados.push(ca);
      }
    }

    const preview = [];
    for (const curso of cursosCombinados) {
      const componentes = [];
      const horasTP = (curso.horas_teoricas || 0) + (curso.horas_practica || 0);
      if (horasTP > 0) {
        const sug = await this.sugerirDocentes(curso.id);
        componentes.push({
          tipo: 'TEORIA',
          horas_requeridas: horasTP,
          n_grupos: 1,
          docenteSugerido: sug.autoAsignar,
          docentesDisponibles: sug.sugeridos,
        });
      }
      if ((curso.horas_laboratorio || 0) > 0) {
        const sug = await this.sugerirDocentes(curso.id);
        componentes.push({
          tipo: 'LABORATORIO',
          horas_requeridas: curso.horas_laboratorio,
          n_grupos: 1,
          docenteSugerido: sug.autoAsignar,
          docentesDisponibles: sug.sugeridos,
        });
      }

      preview.push({
        id_curso: curso.id,
        codigo: curso.codigo,
        nombre: curso.nombre,
        ciclo: curso.ciclo,
        creditos: curso.creditos,
        condicion: curso.condicion,
        curricula: curso.curricula ? { id: curso.curricula.id, nombre: curso.curricula.nombre } : null,
        departamento: curso.departamento,
        componentes,
      });
    }

    return {
      periodo: { id: periodo.id, nombre: periodo.nombre, tipo: periodo.tipo },
      ciclosPermitidos,
      totalCursos: preview.length,
      cursos: preview,
    };
  }

  static async confirmarGenerarOferta(datos: {
    id_periodo: number;
    cursos: Array<{
      id_curso: number;
      id_ciclo: number;
      tipo_curso: 'REGULAR' | 'ELECTIVO';
      componentes: Array<{
        tipo: 'TEORIA' | 'LABORATORIO';
        horas_requeridas: number;
        n_grupos: number;
        id_docente_asignado?: number | null;
      }>;
    }>;
  }) {
    const periodo = await prisma.periodo_academico.findUnique({ where: { id: datos.id_periodo } });
    if (!periodo) throw new Error('Período no encontrado');

    const resultados = await prisma.$transaction(async (tx) => {
      const cursosResult = [];
      for (const cursoData of datos.cursos) {
        const oferta = await tx.curso_oferta.upsert({
          where: {
            id_periodo_id_curso_id_ciclo: {
              id_periodo: datos.id_periodo,
              id_curso: cursoData.id_curso,
              id_ciclo: cursoData.id_ciclo,
            }
          },
          update: {
            tipo_curso: cursoData.tipo_curso,
            estado: 'BORRADOR',
          },
          create: {
            id_periodo: datos.id_periodo,
            id_curso: cursoData.id_curso,
            id_ciclo: cursoData.id_ciclo,
            tipo_curso: cursoData.tipo_curso,
            estado: 'BORRADOR',
          }
        });

        const componentesResult = [];
        for (const compData of cursoData.componentes) {
          const totalHoras = compData.horas_requeridas * compData.n_grupos;

          const componente = await tx.curso_componente.create({
            data: {
              id_oferta: oferta.id,
              tipo: compData.tipo,
              horas_requeridas: totalHoras,
              permite_multi_docente: false,
            }
          });

          for (let i = 0; i < compData.n_grupos; i++) {
            await tx.grupo.create({
              data: {
                id_componente: componente.id,
                codigo: compData.n_grupos === 1 && compData.tipo === 'TEORIA' ? 'UNICO' : String.fromCharCode(65 + i),
                capacidad_maxima: compData.tipo === 'LABORATORIO' ? 20 : 40,
                tipo_grupo: compData.tipo === 'TEORIA' ? 'UNICO_TEORIA' : 'LABORATORIO_N',
              }
            });
          }

          if (compData.id_docente_asignado) {
            await tx.asignacion_docente_componente.create({
              data: {
                id_componente: componente.id,
                id_docente: compData.id_docente_asignado,
                horas_asignadas: totalHoras,
                numero_grupo_general: 0,
              }
            });
          }

          componentesResult.push(componente);
        }

        cursosResult.push({ ...oferta, componentes: componentesResult });
      }
      return cursosResult;
    });

    return {
      mensaje: `Oferta generada exitosamente para ${resultados.length} cursos`,
      periodo: datos.id_periodo,
      cursos: resultados,
    };
  }
}
