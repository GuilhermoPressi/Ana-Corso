-- CreateTable
CREATE TABLE "crm_tags" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'rosa',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_tags_clinic_id_name_key" ON "crm_tags"("clinic_id", "name");

-- AddForeignKey
ALTER TABLE "crm_tags" ADD CONSTRAINT "crm_tags_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: etiquetas já usadas nos contatos viram tags cadastradas.
INSERT INTO "crm_tags" ("id", "clinic_id", "name", "color", "updated_at")
SELECT gen_random_uuid()::text, c."clinic_id", t.tag, 'rosa', CURRENT_TIMESTAMP
FROM "crm_contacts" c, unnest(c."tags") AS t(tag)
GROUP BY c."clinic_id", t.tag
ON CONFLICT ("clinic_id", "name") DO NOTHING;
