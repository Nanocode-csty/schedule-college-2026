-- AlterTable
ALTER TABLE "curso" ADD COLUMN     "ciclo" SMALLINT,
ADD COLUMN     "condicion" VARCHAR(20),
ADD COLUMN     "horas_laboratorio" INTEGER DEFAULT 0,
ADD COLUMN     "horas_practica" INTEGER DEFAULT 0,
ADD COLUMN     "horas_teoricas" INTEGER DEFAULT 0,
ADD COLUMN     "id_departamento" INTEGER;

-- AlterTable
ALTER TABLE "docente" ADD COLUMN     "id_departamento" INTEGER;

-- CreateTable
CREATE TABLE "departamento_academico" (
    "id_departamento" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "departamento_academico_pkey" PRIMARY KEY ("id_departamento")
);

-- CreateIndex
CREATE UNIQUE INDEX "departamento_academico_codigo_key" ON "departamento_academico"("codigo");

-- AddForeignKey
ALTER TABLE "docente" ADD CONSTRAINT "docente_id_departamento_fkey" FOREIGN KEY ("id_departamento") REFERENCES "departamento_academico"("id_departamento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso" ADD CONSTRAINT "curso_id_departamento_fkey" FOREIGN KEY ("id_departamento") REFERENCES "departamento_academico"("id_departamento") ON DELETE SET NULL ON UPDATE CASCADE;
