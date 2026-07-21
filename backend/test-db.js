const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const config = await prisma.configuracion.findFirst({ where: { clave: 'RESTRICCIONES_ACADEMICAS' } });
  const numSeccionesGenerales = config ? JSON.parse(config.valor).numGruposGenerales || 1 : 1;
  console.log('numSeccionesGenerales:', numSeccionesGenerales);

  const grupo = await prisma.grupo.findFirst({ where: { codigo: 'A' } });
  console.log('grupo A:', grupo);
}
run();
