ALTER TABLE "bloque_horario"
ADD COLUMN "numero_grupo_general" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "bloque_horario_id_periodo_id_componente_numero_grupo_general_idx"
ON "bloque_horario"("id_periodo", "id_componente", "numero_grupo_general");
