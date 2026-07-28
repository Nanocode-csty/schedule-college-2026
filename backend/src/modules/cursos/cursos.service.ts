import { prisma } from '@/lib/prisma';

export class CursosService {
  static async listar(buscar?: string, idCurricula?: number | null) {
    const where: any = { activo: true };

    if (idCurricula === 0) {
      where.id_curricula = null;
    } else if (idCurricula && idCurricula > 0) {
      where.id_curricula = idCurricula;
    } else {
      const vigente = await prisma.curricula.findFirst({ where: { vigente: true, activo: true } });
      if (vigente) {
        where.id_curricula = vigente.id;
      }
    }

    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { codigo: { contains: buscar, mode: 'insensitive' } },
      ];
    }
    return prisma.curso.findMany({
      where,
      include: {
        curricula: true,
        departamento: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  static async obtenerPorId(id: number) {
    return prisma.curso.findUnique({
      where: { id },
      include: {
        curricula: true,
        departamento: true,
        ofertas: {
          include: {
            periodo: true,
            ciclo: true,
            componentes: {
              include: {
                grupos: true,
                asignaciones: { include: { docente: true } },
                bloques: true,
              },
            },
          },
          orderBy: [{ id_periodo: 'desc' }, { id_ciclo: 'asc' }],
        },
      },
    });
  }

  static async crear(datos: {
    nombre: string;
    codigo: string;
    creditos: number;
    ciclo?: number | null;
    horas_teoricas?: number;
    horas_practica?: number;
    horas_laboratorio?: number;
    condicion?: string | null;
    id_departamento?: number | null;
    id_curricula?: number | null;
    id_sede?: number | null;
  }) {
    return prisma.curso.create({ data: this.sanitizeData(datos) });
  }

  static async actualizar(id: number, datos: any) {
    return prisma.curso.update({ where: { id }, data: this.sanitizeData(datos) });
  }

  static async eliminar(id: number) {
    return prisma.curso.update({ where: { id }, data: { activo: false } });
  }

  static async reactivar(id: number) {
    return prisma.curso.update({ where: { id }, data: { activo: true } });
  }

  static async buscar(query: string) {
    return prisma.curso.findMany({
      where: {
        activo: true,
        OR: [
          { nombre: { contains: query, mode: 'insensitive' } },
          { codigo: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
  }

  static async importar(cursos: Array<{
    nombre: string;
    codigo: string;
    creditos: number;
    ciclo?: number;
    horas_teoricas?: number;
    horas_practica?: number;
    horas_laboratorio?: number;
    condicion?: string;
  }>) {
    const resultados = [];
    for (const curso of cursos) {
      const creado = await prisma.curso.upsert({
        where: { codigo: curso.codigo },
        update: {
          nombre: curso.nombre,
          creditos: curso.creditos,
          ciclo: curso.ciclo,
          horas_teoricas: curso.horas_teoricas,
          horas_practica: curso.horas_practica,
          horas_laboratorio: curso.horas_laboratorio,
          condicion: curso.condicion,
          activo: true,
        },
        create: {
          nombre: curso.nombre,
          codigo: curso.codigo,
          creditos: curso.creditos,
          ciclo: curso.ciclo,
          horas_teoricas: curso.horas_teoricas,
          horas_practica: curso.horas_practica,
          horas_laboratorio: curso.horas_laboratorio,
          condicion: curso.condicion,
        },
      });
      resultados.push(creado);
    }
    return resultados;
  }

  private static sanitizeData(datos: any) {
    const { crear_usuario, password, ...rest } = datos;
    const data: any = { ...rest };
    if (data.ciclo === undefined || data.ciclo === null || data.ciclo === '') {
      data.ciclo = null;
    } else {
      data.ciclo = Number(data.ciclo);
    }
    data.horas_teoricas = data.horas_teoricas ?? 0;
    data.horas_practica = data.horas_practica ?? 0;
    data.horas_laboratorio = data.horas_laboratorio ?? 0;
    if (data.condicion === '' || data.condicion === 'S') data.condicion = null;
    if (data.id_departamento === '' || data.id_departamento === null || data.id_departamento === 0) {
      delete data.id_departamento;
    }
    if (data.id_curricula === '' || data.id_curricula === null || data.id_curricula === 0) {
      delete data.id_curricula;
    }
    if (data.id_sede === '' || data.id_sede === null || data.id_sede === 0) {
      delete data.id_sede;
    }
    return data;
  }
}
