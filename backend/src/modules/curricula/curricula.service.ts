import { prisma } from '@/lib/prisma';

export class CurriculaService {
  static async listar() {
    return prisma.curricula.findMany({
      where: { activo: true },
      orderBy: { vigente: 'desc' },
    });
  }

  static async obtenerPorId(id: number) {
    return prisma.curricula.findUnique({ where: { id } });
  }

  static async obtenerVigente() {
    return prisma.curricula.findFirst({ where: { vigente: true, activo: true } });
  }

  static async crear(datos: { codigo: string; nombre: string; vigente?: boolean }) {
    const esVigente = datos.vigente === true;
    return prisma.$transaction(async (tx) => {
      if (esVigente) {
        await tx.curricula.updateMany({ where: { vigente: true }, data: { vigente: false } });
      }
      return tx.curricula.create({ data: { codigo: datos.codigo, nombre: datos.nombre, vigente: esVigente } });
    });
  }

  static async actualizar(id: number, datos: any) {
    return prisma.$transaction(async (tx) => {
      if (datos.vigente === true) {
        await tx.curricula.updateMany({ where: { vigente: true, id: { not: id } }, data: { vigente: false } });
      }
      return tx.curricula.update({ where: { id }, data: datos });
    });
  }

  static async eliminar(id: number) {
    return prisma.curricula.update({ where: { id }, data: { activo: false } });
  }

  static async reactivar(id: number) {
    return prisma.curricula.update({ where: { id }, data: { activo: true } });
  }

  static async obtenerPlanEstudios(idCurricula?: number) {
    let curricula;

    if (idCurricula) {
      curricula = await prisma.curricula.findUnique({ where: { id: idCurricula, activo: true } });
    } else {
      curricula = await prisma.curricula.findFirst({ where: { vigente: true, activo: true } });
    }

    if (!curricula) return null;

    const cursos = await prisma.curso.findMany({
      where: { activo: true, id_curricula: curricula.id },
      include: { departamento: true },
      orderBy: [{ ciclo: 'asc' as const }, { nombre: 'asc' as const }],
    });

    const ciclosMap = new Map<number, any>();

    for (const curso of cursos) {
      const cicloNum = curso.ciclo ?? 0;
      if (!ciclosMap.has(cicloNum)) {
        ciclosMap.set(cicloNum, {
          numero: cicloNum,
          cursos: [],
          total_creditos: 0,
          total_horas_teoricas: 0,
          total_horas_practica: 0,
          total_horas_laboratorio: 0,
          total_cursos: 0,
        });
      }
      const ciclo = ciclosMap.get(cicloNum)!;
      ciclo.cursos.push({
        id: curso.id,
        codigo: curso.codigo,
        nombre: curso.nombre,
        creditos: curso.creditos,
        horas_teoricas: curso.horas_teoricas ?? 0,
        horas_practica: curso.horas_practica ?? 0,
        horas_laboratorio: curso.horas_laboratorio ?? 0,
        condicion: curso.condicion,
        departamento: curso.departamento ? { id: curso.departamento.id, nombre: curso.departamento.nombre } : null,
      });
      ciclo.total_creditos += curso.creditos;
      ciclo.total_horas_teoricas += curso.horas_teoricas ?? 0;
      ciclo.total_horas_practica += curso.horas_practica ?? 0;
      ciclo.total_horas_laboratorio += curso.horas_laboratorio ?? 0;
      ciclo.total_cursos += 1;
    }

    const ciclos = Array.from(ciclosMap.values()).sort((a, b) => a.numero - b.numero);

    return {
      curricula: { id: curricula.id, codigo: curricula.codigo, nombre: curricula.nombre, vigente: curricula.vigente },
      ciclos,
    };
  }
}
