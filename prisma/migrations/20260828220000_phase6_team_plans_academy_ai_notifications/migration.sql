-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlanItemStatus" AS ENUM ('PLANNED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AcademyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'TEXT', 'PDF', 'LINK');

-- AlterEnum
ALTER TYPE "ClinicActivityEntityType" ADD VALUE IF NOT EXISTS 'TEAM';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE IF NOT EXISTS 'INVITATION';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE IF NOT EXISTS 'PATIENT_PLAN';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE IF NOT EXISTS 'ACADEMY';
ALTER TYPE "ClinicActivityEntityType" ADD VALUE IF NOT EXISTS 'AI';

-- AlterEnum
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'TEAM_MEMBER_INVITED';
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'TEAM_MEMBER_ROLE_CHANGED';
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'TEAM_MEMBER_REMOVED';
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'PATIENT_PLAN_CREATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'PATIENT_PLAN_UPDATED';
ALTER TYPE "ClinicActivityAction" ADD VALUE IF NOT EXISTS 'PATIENT_PLAN_COMPLETED';

-- CreateTable
CREATE TABLE "clinic_invitations" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ClinicRole" NOT NULL DEFAULT 'PROFESSIONAL',
    "token_hash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by_user_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinic_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_treatment_plans" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "facial_planning_id" TEXT,
    "proposal_id" TEXT,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "patient_treatment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_treatment_plan_items" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "catalog_procedure_id" TEXT,
    "protocol_id" TEXT,
    "name_snapshot" TEXT NOT NULL,
    "description_snapshot" TEXT,
    "session_number" INTEGER NOT NULL DEFAULT 1,
    "planned_date" TIMESTAMP(3),
    "status" "PlanItemStatus" NOT NULL DEFAULT 'PLANNED',
    "price_snapshot" DECIMAL(12,2),
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_treatment_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_key" TEXT,
    "status" "AcademyStatus" NOT NULL DEFAULT 'PUBLISHED',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "academy_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_modules" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_lessons" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content_type" "LessonType" NOT NULL DEFAULT 'VIDEO',
    "video_url" TEXT,
    "content" TEXT,
    "attachment_key" TEXT,
    "duration_min" INTEGER NOT NULL DEFAULT 10,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "AcademyStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_lesson_progresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "last_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_lesson_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_reference" TEXT,
    "status" "AcademyStatus" NOT NULL DEFAULT 'PUBLISHED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "title" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokens_used" INTEGER,
    "sources" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usages" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_feature_overrides" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_feature_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "clinic_invitations_token_hash_key" ON "clinic_invitations"("token_hash");
CREATE INDEX "clinic_invitations_clinic_id_email_idx" ON "clinic_invitations"("clinic_id", "email");
CREATE INDEX "clinic_invitations_token_hash_idx" ON "clinic_invitations"("token_hash");

CREATE INDEX "patient_treatment_plans_clinic_id_patient_id_idx" ON "patient_treatment_plans"("clinic_id", "patient_id");
CREATE INDEX "patient_treatment_plan_items_plan_id_idx" ON "patient_treatment_plan_items"("plan_id");

CREATE UNIQUE INDEX "academy_courses_slug_key" ON "academy_courses"("slug");
CREATE INDEX "academy_modules_course_id_idx" ON "academy_modules"("course_id");
CREATE INDEX "academy_lessons_module_id_idx" ON "academy_lessons"("module_id");
CREATE UNIQUE INDEX "academy_lesson_progresses_user_id_lesson_id_key" ON "academy_lesson_progresses"("user_id", "lesson_id");
CREATE INDEX "academy_lesson_progresses_user_id_idx" ON "academy_lesson_progresses"("user_id");

CREATE INDEX "knowledge_documents_category_idx" ON "knowledge_documents"("category");

CREATE INDEX "ai_conversations_clinic_id_user_id_idx" ON "ai_conversations"("clinic_id", "user_id");
CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages"("conversation_id");
CREATE INDEX "ai_usages_clinic_id_created_at_idx" ON "ai_usages"("clinic_id", "created_at");

CREATE UNIQUE INDEX "clinic_feature_overrides_clinic_id_feature_key_key" ON "clinic_feature_overrides"("clinic_id", "feature_key");

CREATE INDEX "notifications_clinic_id_user_id_idx" ON "notifications"("clinic_id", "user_id");
CREATE INDEX "notifications_clinic_id_read_at_idx" ON "notifications"("clinic_id", "read_at");

-- AddForeignKeys
ALTER TABLE "clinic_invitations" ADD CONSTRAINT "clinic_invitations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinic_invitations" ADD CONSTRAINT "clinic_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "patient_treatment_plans" ADD CONSTRAINT "patient_treatment_plans_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_treatment_plans" ADD CONSTRAINT "patient_treatment_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_treatment_plans" ADD CONSTRAINT "patient_treatment_plans_facial_planning_id_fkey" FOREIGN KEY ("facial_planning_id") REFERENCES "facial_plannings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patient_treatment_plans" ADD CONSTRAINT "patient_treatment_plans_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patient_treatment_plans" ADD CONSTRAINT "patient_treatment_plans_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "patient_treatment_plan_items" ADD CONSTRAINT "patient_treatment_plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "patient_treatment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_treatment_plan_items" ADD CONSTRAINT "patient_treatment_plan_items_catalog_procedure_id_fkey" FOREIGN KEY ("catalog_procedure_id") REFERENCES "catalog_procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patient_treatment_plan_items" ADD CONSTRAINT "patient_treatment_plan_items_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "academy_modules" ADD CONSTRAINT "academy_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "academy_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "academy_lessons" ADD CONSTRAINT "academy_lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "academy_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "academy_lesson_progresses" ADD CONSTRAINT "academy_lesson_progresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "academy_lesson_progresses" ADD CONSTRAINT "academy_lesson_progresses_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "academy_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_usages" ADD CONSTRAINT "ai_usages_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_usages" ADD CONSTRAINT "ai_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clinic_feature_overrides" ADD CONSTRAINT "clinic_feature_overrides_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
