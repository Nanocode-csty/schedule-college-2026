-- AlterTable
ALTER TABLE "curso" ADD COLUMN     "id_sede" INTEGER;

-- AddForeignKey
ALTER TABLE "curso" ADD CONSTRAINT "curso_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede") ON DELETE SET NULL ON UPDATE CASCADE;
