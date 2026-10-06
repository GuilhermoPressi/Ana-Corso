-- CreateEnum
CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED');

-- CreateEnum
CREATE TYPE "CrmConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CrmMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CrmMessageKind" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'STICKER', 'LOCATION', 'NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "CrmMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RECEIVED');

-- CreateTable
CREATE TABLE "whatsapp_instances" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "instance_name" TEXT NOT NULL,
    "webhook_token" TEXT NOT NULL,
    "status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "qr_code" TEXT,
    "qr_updated_at" TIMESTAMP(3),
    "phone_number" TEXT,
    "profile_name" TEXT,
    "connected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contacts" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "push_name" TEXT,
    "avatar_url" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "lead_id" TEXT,
    "patient_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_conversations" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "remote_jid" TEXT NOT NULL,
    "status" "CrmConversationStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_user_id" TEXT,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3),
    "last_message_preview" TEXT,
    "last_inbound_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_messages" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "external_id" TEXT,
    "direction" "CrmMessageDirection" NOT NULL,
    "kind" "CrmMessageKind" NOT NULL DEFAULT 'TEXT',
    "text" TEXT,
    "media_storage_key" TEXT,
    "media_mime_type" TEXT,
    "media_file_name" TEXT,
    "status" "CrmMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "error_reason" TEXT,
    "sent_by_user_id" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_quick_replies" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_quick_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_instances_clinic_id_key" ON "whatsapp_instances"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_instances_instance_name_key" ON "whatsapp_instances"("instance_name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_instances_webhook_token_key" ON "whatsapp_instances"("webhook_token");

-- CreateIndex
CREATE INDEX "crm_contacts_clinic_id_name_idx" ON "crm_contacts"("clinic_id", "name");

-- CreateIndex
CREATE INDEX "crm_contacts_clinic_id_updated_at_idx" ON "crm_contacts"("clinic_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "crm_contacts_clinic_id_phone_key" ON "crm_contacts"("clinic_id", "phone");

-- CreateIndex
CREATE INDEX "crm_conversations_clinic_id_status_last_message_at_idx" ON "crm_conversations"("clinic_id", "status", "last_message_at");

-- CreateIndex
CREATE INDEX "crm_conversations_clinic_id_assigned_user_id_idx" ON "crm_conversations"("clinic_id", "assigned_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "crm_conversations_clinic_id_contact_id_key" ON "crm_conversations"("clinic_id", "contact_id");

-- CreateIndex
CREATE INDEX "crm_messages_conversation_id_sent_at_idx" ON "crm_messages"("conversation_id", "sent_at");

-- CreateIndex
CREATE INDEX "crm_messages_clinic_id_external_id_idx" ON "crm_messages"("clinic_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "crm_messages_conversation_id_external_id_key" ON "crm_messages"("conversation_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "crm_quick_replies_clinic_id_shortcut_key" ON "crm_quick_replies"("clinic_id", "shortcut");

-- AddForeignKey
ALTER TABLE "whatsapp_instances" ADD CONSTRAINT "whatsapp_instances_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_messages" ADD CONSTRAINT "crm_messages_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_messages" ADD CONSTRAINT "crm_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "crm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_messages" ADD CONSTRAINT "crm_messages_sent_by_user_id_fkey" FOREIGN KEY ("sent_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_quick_replies" ADD CONSTRAINT "crm_quick_replies_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

