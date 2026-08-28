-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'ATTENTION', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClinicActivityEntityType" AS ENUM ('CLINIC', 'PATIENT');

-- CreateEnum
CREATE TYPE "ClinicActivityAction" AS ENUM ('CLINIC_UPDATED', 'PATIENT_CREATED', 'PATIENT_UPDATED', 'PATIENT_ARCHIVED', 'PATIENT_RESTORED');

-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "professional_name" TEXT,
ADD COLUMN     "professional_registry" TEXT;

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "birth_date" DATE,
    "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
    "main_procedure" TEXT,
    "responsible_professional" TEXT,
    "lead_source" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_clinical_profiles" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "skin_type" TEXT,
    "allergies" TEXT,
    "clinical_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_clinical_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_activity_logs" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "user_id" TEXT,
    "entity_type" "ClinicActivityEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" "ClinicActivityAction" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinic_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patients_clinic_id_idx" ON "patients"("clinic_id");

-- CreateIndex
CREATE INDEX "patients_clinic_id_status_idx" ON "patients"("clinic_id", "status");

-- CreateIndex
CREATE INDEX "patients_clinic_id_name_idx" ON "patients"("clinic_id", "name");

-- CreateIndex
CREATE INDEX "patients_clinic_id_phone_idx" ON "patients"("clinic_id", "phone");

-- CreateIndex
CREATE INDEX "patients_clinic_id_created_at_idx" ON "patients"("clinic_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "patients_clinic_id_cpf_key" ON "patients"("clinic_id", "cpf");

-- CreateIndex
CREATE UNIQUE INDEX "patient_clinical_profiles_patient_id_key" ON "patient_clinical_profiles"("patient_id");

-- CreateIndex
CREATE INDEX "clinic_activity_logs_clinic_id_created_at_idx" ON "clinic_activity_logs"("clinic_id", "created_at");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_clinical_profiles" ADD CONSTRAINT "patient_clinical_profiles_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_activity_logs" ADD CONSTRAINT "clinic_activity_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_activity_logs" ADD CONSTRAINT "clinic_activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
