-- CreateIndex
CREATE INDEX "crm_messages_clinic_id_direction_created_at_idx" ON "crm_messages"("clinic_id", "direction", "created_at");
