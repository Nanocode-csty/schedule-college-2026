import { PrismaClient } from '@prisma/client';
async function test() {
  const urls = [
    'postgresql://postgres:postgres@localhost:5432/horarios_unt?schema=public',
    'postgresql://postgres:postgres@localhost:5433/horarios_unt?schema=public',
  ];
  for (const url of urls) {
    try {
      const p = new PrismaClient({ datasources: { db: { url } } });
      const r = await p.$queryRawUnsafe('SELECT 1 as ok');
      console.log('OK:', url, JSON.stringify(r));
      await p.$disconnect();
    } catch (e: any) {
      console.log('ERROR:', url, e.message?.substring(0, 100));
    }
  }
}
test();
