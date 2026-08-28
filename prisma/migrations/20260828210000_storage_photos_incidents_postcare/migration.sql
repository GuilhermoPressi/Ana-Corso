-- CreateEnum
CREATE TYPE "PhotoType" AS ENUM ('BEFORE', 'AFTER', 'EVOLUTION', 'CLINICAL', 'INCIDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'MONITORING', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FollowUpStage" AS ENUM ('H24', 'DAY_7', 'DAY_15');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'SENT', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- AlterEnum
ALTER TYPE "ClinicActivityEntityType" ADD VALUE IF NOT EXISTS 'PHOTO';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE IF NOT EXISTS 'INCIDENT';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE IF NOT EXISTS 'POST_CARE';

-- AlterEnum
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'PHOTO_UPLOADED';
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'PHOTO_ARCHIVED';
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'INCIDENT_CREATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'INCIDENT_UPDATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'INCIDENT_RESOLVED';
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'INCIDENT_ARCHIVED';
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'POST_CARE_CREATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'POST_CARE_COMPLETED';
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'POST_CARE_CANCELLED';

-- CreateTable
CREATE TABLE "patient_photos" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "procedure_record_id" TEXT,
    "storage_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "type" "PhotoType" NOT NULL DEFAULT 'CLINICAL',
    "body_region" TEXT,
    "notes" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "patient_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "procedure_record_id" TEXT,
    "type" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MODERATE',
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "report" TEXT NOT NULL,
    "identified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_updates" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "status" "IncidentStatus",
    "note" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_photos" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "patient_photo_id" TEXT NOT NULL,

    CONSTRAINT "incident_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_care_follow_ups" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "procedure_record_id" TEXT NOT NULL,
    "stage" "FollowUpStage" NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_care_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "patient_photos_clinic_id_patient_id_idx" ON "patient_photos"("clinic_id", "patient_id");
CREATE INDEX "patient_photos_clinic_id_type_idx" ON "patient_photos"("clinic_id", "type");

CREATE INDEX "incidents_clinic_id_patient_id_idx" ON "incidents"("clinic_id", "patient_id");
CREATE INDEX "incidents_clinic_id_status_idx" ON "incidents"("clinic_id", "status");

CREATE INDEX "incident_updates_incident_id_idx" ON "incident_updates"("incident_id");

CREATE UNIQUE INDEX "incident_photos_incident_id_patient_photo_id_key" ON "incident_photos"("incident_id", "patient_photo_id");

CREATE UNIQUE INDEX "post_care_follow_ups_procedure_record_id_stage_key" ON "post_care_follow_ups"("procedure_record_id", "stage");
CREATE INDEX "post_care_follow_ups_clinic_id_scheduled_for_idx" ON "post_care_follow_ups"("clinic_id", "scheduled_for");
CREATE INDEX "post_care_follow_ups_clinic_id_status_idx" ON "post_care_follow_ups"("clinic_id", "status");

-- AddForeignKeys
ALTER TABLE "patient_photos" ADD CONSTRAINT "patient_photos_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_photos" ADD CONSTRAINT "patient_photos_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_photos" ADD CONSTRAINT "patient_photos_procedure_record_id_fkey" FOREIGN KEY ("procedure_record_id") REFERENCES "procedure_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patient_photos" ADD CONSTRAINT "patient_photos_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents" ADD CONSTRAINT "incidents_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_procedure_record_id_fkey" FOREIGN KEY ("procedure_record_id") REFERENCES "procedure_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incident_photos" ADD CONSTRAINT "incident_photos_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incident_photos" ADD CONSTRAINT "incident_photos_patient_photo_id_fkey" FOREIGN KEY ("patient_photo_id") REFERENCES "patient_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_care_follow_ups" ADD CONSTRAINT "post_care_follow_ups_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "post_care_follow_ups" ADD CONSTRAINT "post_care_follow_ups_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_care_follow_ups" ADD CONSTRAINT "post_care_follow_ups_procedure_record_id_fkey" FOREIGN KEY ("procedure_record_id") REFERENCES "procedure_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
