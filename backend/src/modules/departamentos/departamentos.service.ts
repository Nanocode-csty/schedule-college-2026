import { prisma } from '@/lib/prisma';

export class DepartamentosService {
  static async listar() {
    return prisma.departamento_academico.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  static async obtenerPorId(id: number) {
    return prisma.departamento_academico.findUnique({
      where: { id },
      include: {
        cursos: { where: { activo: true }, select: { id: true, nombre: true, codigo: true } },
        docentes: { where: { activo: true }, select: { id: true, nombres: true, apellidos: true } },
      },
    });
  }

  static async crear(datos: { nombre: string; codigo: string }) {
    return prisma.departamento_academico.create({ data: datos });
  }

  static async actualizar(id: number, datos: any) {
    return prisma.departamento_academico.update({ where: { id }, data: datos });
  }

  static async eliminar(id: number) {
    return prisma.departamento_academico.update({ where: { id }, data: { activo: false } });
  }

  static async reactivar(id: number) {
    return prisma.departamento_academico.update({ where: { id }, data: { activo: true } });
  }
}
