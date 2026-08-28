-- AlterEnum
ALTER TYPE "ClinicActivityEntityType" ADD VALUE 'PROCEDURE';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE 'SCHEDULE';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE 'INVENTORY';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE 'FINANCE';

-- AlterEnum
ALTER TYPE "ClinicActivityAction" ADD VALUE 'PROCEDURE_CREATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'SCHEDULE_CREATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'SCHEDULE_UPDATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'SCHEDULE_CANCELLED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'RETURN_COMPLETED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'INVENTORY_CREATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'INVENTORY_RESTOCKED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'INVENTORY_ADJUSTED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'FINANCE_ENTRY_CREATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'FINANCE_ENTRY_VOIDED';

-- CreateEnum
CREATE TYPE "ScheduleEventKind" AS ENUM ('PROCEDURE', 'RETURN', 'EVALUATION', 'COMMERCIAL_CONTACT', 'BLOCK');

-- CreateEnum
CREATE TYPE "ScheduleEventStatus" AS ENUM ('CONFIRMED', 'WAITING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PatientReturnStatus" AS ENUM ('PENDING', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "LedgerSource" AS ENUM ('PROCEDURE', 'MANUAL', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "clinics" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "user_id" TEXT,
    "key" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resource_id" TEXT,
    "response_code" INTEGER,
    "response_body" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_records" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "procedure_name" TEXT NOT NULL,
    "procedure_category" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "professional_user_id" TEXT,
    "professional_name" TEXT NOT NULL,
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "value" DECIMAL(12,2) NOT NULL,
    "direct_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_product_usages" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "procedure_record_id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,
    "brand_snapshot" TEXT NOT NULL,
    "lot_snapshot" TEXT NOT NULL,
    "unit_snapshot" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit_cost_snapshot" DECIMAL(12,4) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procedure_product_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content_unit" TEXT NOT NULL,
    "content_per_pack" DECIMAL(12,4) NOT NULL,
    "pack_label" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "min_quantity" DECIMAL(12,4) NOT NULL,
    "pack_cost" DECIMAL(12,2) NOT NULL,
    "lot" TEXT NOT NULL,
    "expires_at" DATE,
    "supplier" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "procedure_record_id" TEXT,
    "patient_id" TEXT,
    "type" "InventoryMovementType" NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,
    "lot_snapshot" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_events" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "patient_name" TEXT,
    "title" TEXT NOT NULL,
    "kind" "ScheduleEventKind" NOT NULL DEFAULT 'PROCEDURE',
    "status" "ScheduleEventStatus" NOT NULL DEFAULT 'CONFIRMED',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "duration_min" INTEGER NOT NULL DEFAULT 30,
    "professional_user_id" TEXT,
    "professional_name" TEXT,
    "room" TEXT,
    "value" DECIMAL(12,2),
    "note" TEXT,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "schedule_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_returns" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "procedure_record_id" TEXT,
    "schedule_event_id" TEXT,
    "due_at" DATE NOT NULL,
    "status" "PatientReturnStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "procedure_record_id" TEXT,
    "kind" "LedgerKind" NOT NULL,
    "source" "LedgerSource" NOT NULL DEFAULT 'MANUAL',
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "direct_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "counts_as_appointment" BOOLEAN NOT NULL DEFAULT true,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided_at" TIMESTAMP(3),

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_clinic_id_key_key" ON "idempotency_keys"("clinic_id", "key");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE INDEX "procedure_records_clinic_id_idx" ON "procedure_records"("clinic_id");

-- CreateIndex
CREATE INDEX "procedure_records_clinic_id_performed_at_idx" ON "procedure_records"("clinic_id", "performed_at");

-- CreateIndex
CREATE INDEX "procedure_records_patient_id_idx" ON "procedure_records"("patient_id");

-- CreateIndex
CREATE INDEX "procedure_product_usages_clinic_id_idx" ON "procedure_product_usages"("clinic_id");

-- CreateIndex
CREATE INDEX "procedure_product_usages_procedure_record_id_idx" ON "procedure_product_usages"("procedure_record_id");

-- CreateIndex
CREATE INDEX "inventory_items_clinic_id_idx" ON "inventory_items"("clinic_id");

-- CreateIndex
CREATE INDEX "inventory_items_clinic_id_category_idx" ON "inventory_items"("clinic_id", "category");

-- CreateIndex
CREATE INDEX "inventory_movements_clinic_id_created_at_idx" ON "inventory_movements"("clinic_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_movements_inventory_item_id_idx" ON "inventory_movements"("inventory_item_id");

-- CreateIndex
CREATE INDEX "schedule_events_clinic_id_starts_at_idx" ON "schedule_events"("clinic_id", "starts_at");

-- CreateIndex
CREATE INDEX "schedule_events_clinic_id_status_idx" ON "schedule_events"("clinic_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "patient_returns_procedure_record_id_key" ON "patient_returns"("procedure_record_id");

-- CreateIndex
CREATE INDEX "patient_returns_clinic_id_due_at_idx" ON "patient_returns"("clinic_id", "due_at");

-- CreateIndex
CREATE INDEX "patient_returns_patient_id_idx" ON "patient_returns"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_procedure_record_id_key" ON "ledger_entries"("procedure_record_id");

-- CreateIndex
CREATE INDEX "ledger_entries_clinic_id_occurred_at_idx" ON "ledger_entries"("clinic_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ledger_entries_clinic_id_kind_idx" ON "ledger_entries"("clinic_id", "kind");

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_records" ADD CONSTRAINT "procedure_records_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_records" ADD CONSTRAINT "procedure_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_records" ADD CONSTRAINT "procedure_records_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_product_usages" ADD CONSTRAINT "procedure_product_usages_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_product_usages" ADD CONSTRAINT "procedure_product_usages_procedure_record_id_fkey" FOREIGN KEY ("procedure_record_id") REFERENCES "procedure_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_product_usages" ADD CONSTRAINT "procedure_product_usages_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_procedure_record_id_fkey" FOREIGN KEY ("procedure_record_id") REFERENCES "procedure_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_returns" ADD CONSTRAINT "patient_returns_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_returns" ADD CONSTRAINT "patient_returns_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_returns" ADD CONSTRAINT "patient_returns_procedure_record_id_fkey" FOREIGN KEY ("procedure_record_id") REFERENCES "procedure_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_returns" ADD CONSTRAINT "patient_returns_schedule_event_id_fkey" FOREIGN KEY ("schedule_event_id") REFERENCES "schedule_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_procedure_record_id_fkey" FOREIGN KEY ("procedure_record_id") REFERENCES "procedure_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
