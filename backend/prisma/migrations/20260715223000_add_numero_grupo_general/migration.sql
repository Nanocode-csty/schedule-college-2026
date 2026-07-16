-- AlterTable
ALTER TABLE "asignacion_docente_componente" ADD COLUMN     "numero_grupo_general" INTEGER NOT NULL DEFAULT 0;

-- DropIndex
DROP INDEX "asignacion_docente_componente_id_componente_id_docente_key";

-- CreateIndex
CREATE UNIQUE INDEX "asignacion_docente_componente_id_componente_id_docente_numero_grupo_general_key" ON "asignacion_docente_componente"("id_componente", "id_docente", "numero_grupo_general");
