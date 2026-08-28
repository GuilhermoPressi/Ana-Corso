-- AlterEnum
ALTER TYPE "ClinicActivityEntityType" ADD VALUE 'LEAD';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE 'PLANNING';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE 'PROPOSAL';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE 'MAP';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE 'CATALOG';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE 'PROTOCOL';

-- AlterEnum
ALTER TYPE "ClinicActivityAction" ADD VALUE 'LEAD_CREATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'LEAD_STAGE_CHANGED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'LEAD_CONVERTED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'LEAD_ARCHIVED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'PLANNING_CREATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'PLANNING_UPDATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'PLANNING_COMPLETED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'PLANNING_ARCHIVED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'PROPOSAL_CREATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'PROPOSAL_SENT';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'PROPOSAL_ACCEPTED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'PROPOSAL_REJECTED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'MAP_CREATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'MAP_UPDATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'MAP_COMPLETED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'CATALOG_PROCEDURE_CREATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'CATALOG_PROCEDURE_UPDATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'PROTOCOL_CREATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE 'PROTOCOL_UPDATED';

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW_CONTACT', 'EVALUATION_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "PlanningStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CONVERTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MapMode" AS ENUM ('TWO_D', 'THREE_D');

-- CreateEnum
CREATE TYPE "MapStatus" AS ENUM ('DRAFT', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "interest" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW_CONTACT',
    "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "last_contact" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner" TEXT,
    "temperature" TEXT NOT NULL DEFAULT 'morno',
    "note" TEXT,
    "scheduled_for" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "assigned_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "won_at" TIMESTAMP(3),
    "lost_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facial_plannings" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Planejamento Facial',
    "status" "PlanningStatus" NOT NULL DEFAULT 'DRAFT',
    "estimated_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "facial_plannings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facial_planning_regions" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "planning_id" TEXT NOT NULL,
    "treatment_line" TEXT NOT NULL,
    "region_code" TEXT NOT NULL,
    "region_name" TEXT NOT NULL,
    "product_name" TEXT,
    "quantity" TEXT,
    "unit" TEXT,
    "depth" TEXT,
    "technique" TEXT,
    "sessions_recommended" INTEGER NOT NULL DEFAULT 1,
    "extra_fields_data" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facial_planning_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "facial_planning_id" TEXT,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "valid_until" DATE,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_items" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "detail_snapshot" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_maps" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "patient_name" TEXT NOT NULL,
    "procedure_name" TEXT NOT NULL,
    "mode" "MapMode" NOT NULL DEFAULT 'TWO_D',
    "status" "MapStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "procedure_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_map_points" (
    "id" TEXT NOT NULL,
    "procedure_map_id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "region_name" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "depth" TEXT NOT NULL,
    "technique" TEXT NOT NULL,
    "note" TEXT,
    "position_2d_x" DOUBLE PRECISION,
    "position_2d_y" DOUBLE PRECISION,
    "position_3d_x" DOUBLE PRECISION,
    "position_3d_y" DOUBLE PRECISION,
    "position_3d_z" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procedure_map_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_procedures" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "default_price" DECIMAL(12,2) NOT NULL,
    "estimated_duration_min" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "catalog_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocols" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "package_price" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_steps" (
    "id" TEXT NOT NULL,
    "protocol_id" TEXT NOT NULL,
    "catalog_procedure_id" TEXT,
    "procedure_name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "day_offset" INTEGER NOT NULL DEFAULT 1,
    "list_price" DECIMAL(12,2) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocol_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_clinic_id_stage_idx" ON "leads"("clinic_id", "stage");

-- CreateIndex
CREATE INDEX "leads_clinic_id_position_idx" ON "leads"("clinic_id", "position");

-- CreateIndex
CREATE INDEX "facial_plannings_clinic_id_patient_id_idx" ON "facial_plannings"("clinic_id", "patient_id");

-- CreateIndex
CREATE INDEX "facial_plannings_clinic_id_status_idx" ON "facial_plannings"("clinic_id", "status");

-- CreateIndex
CREATE INDEX "facial_planning_regions_planning_id_idx" ON "facial_planning_regions"("planning_id");

-- CreateIndex
CREATE INDEX "proposals_clinic_id_patient_id_idx" ON "proposals"("clinic_id", "patient_id");

-- CreateIndex
CREATE INDEX "proposals_clinic_id_status_idx" ON "proposals"("clinic_id", "status");

-- CreateIndex
CREATE INDEX "proposal_items_proposal_id_idx" ON "proposal_items"("proposal_id");

-- CreateIndex
CREATE INDEX "procedure_maps_clinic_id_patient_id_idx" ON "procedure_maps"("clinic_id", "patient_id");

-- CreateIndex
CREATE INDEX "procedure_map_points_procedure_map_id_idx" ON "procedure_map_points"("procedure_map_id");

-- CreateIndex
CREATE INDEX "catalog_procedures_clinic_id_idx" ON "catalog_procedures"("clinic_id");

-- CreateIndex
CREATE INDEX "protocols_clinic_id_idx" ON "protocols"("clinic_id");

-- CreateIndex
CREATE INDEX "protocol_steps_protocol_id_idx" ON "protocol_steps"("protocol_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facial_plannings" ADD CONSTRAINT "facial_plannings_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facial_plannings" ADD CONSTRAINT "facial_plannings_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facial_plannings" ADD CONSTRAINT "facial_plannings_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facial_planning_regions" ADD CONSTRAINT "facial_planning_regions_planning_id_fkey" FOREIGN KEY ("planning_id") REFERENCES "facial_plannings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_facial_planning_id_fkey" FOREIGN KEY ("facial_planning_id") REFERENCES "facial_plannings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_maps" ADD CONSTRAINT "procedure_maps_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_maps" ADD CONSTRAINT "procedure_maps_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_maps" ADD CONSTRAINT "procedure_maps_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_map_points" ADD CONSTRAINT "procedure_map_points_procedure_map_id_fkey" FOREIGN KEY ("procedure_map_id") REFERENCES "procedure_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_procedures" ADD CONSTRAINT "catalog_procedures_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_procedures" ADD CONSTRAINT "catalog_procedures_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_steps" ADD CONSTRAINT "protocol_steps_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_steps" ADD CONSTRAINT "protocol_steps_catalog_procedure_id_fkey" FOREIGN KEY ("catalog_procedure_id") REFERENCES "catalog_procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
