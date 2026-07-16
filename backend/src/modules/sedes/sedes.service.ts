import { prisma } from '@/lib/prisma';

export class SedesService {
  static async listar() {
    return prisma.sede.findMany({
      where: { activo: true },
      orderBy: { tipo: 'desc' },
    });
  }

  static async obtenerPorId(id: number) {
    return prisma.sede.findUnique({ where: { id } });
  }

  static async obtenerCentral() {
    return prisma.sede.findFirst({ where: { tipo: 'CENTRAL', activo: true } });
  }

  static async crear(datos: any) {
    const esCentral = datos.tipo === 'CENTRAL';
    return prisma.$transaction(async (tx) => {
      if (esCentral) {
        await tx.sede.updateMany({ where: { tipo: 'CENTRAL' }, data: { tipo: 'DESCONCENTRADA' } });
      }
      return tx.sede.create({
        data: {
          nombre: datos.nombre,
          codigo: datos.codigo,
          tipo: esCentral ? 'CENTRAL' : 'DESCONCENTRADA',
          distrito: datos.distrito,
          provincia: datos.provincia,
        },
      });
    });
  }

  static async actualizar(id: number, datos: any) {
    const esCentral = datos.tipo === 'CENTRAL';
    return prisma.$transaction(async (tx) => {
      if (esCentral) {
        await tx.sede.updateMany({
          where: { tipo: 'CENTRAL', id: { not: id } },
          data: { tipo: 'DESCONCENTRADA' },
        });
      }
      return tx.sede.update({ where: { id }, data: datos });
    });
  }

  static async eliminar(id: number) {
    return prisma.sede.update({ where: { id }, data: { activo: false } });
  }

  static async reactivar(id: number) {
    return prisma.sede.update({ where: { id }, data: { activo: true } });
  }
}
