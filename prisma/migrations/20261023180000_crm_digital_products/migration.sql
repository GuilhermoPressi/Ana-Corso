-- CreateEnum
CREATE TYPE "CrmPipelineKind" AS ENUM ('CLINIC', 'DIGITAL');

-- CreateEnum
CREATE TYPE "LeadPurchaseStatus" AS ENUM ('INTERESTED', 'CHECKOUT_ABANDONED', 'PURCHASED', 'REFUNDED');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "external_order_id" TEXT,
ADD COLUMN     "product_id" TEXT,
ADD COLUMN     "purchase_status" "LeadPurchaseStatus";

-- AlterTable
ALTER TABLE "crm_messages" ADD COLUMN     "automated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "crm_pipelines" ADD COLUMN     "kind" "CrmPipelineKind" NOT NULL DEFAULT 'CLINIC';

-- CreateTable
CREATE TABLE "crm_products" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "external_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pipeline_id" TEXT,
    "buyer_stage_id" TEXT,
    "buyer_tag" TEXT DEFAULT 'compradora',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_automation_settings" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "sales_webhook_token" TEXT NOT NULL,
    "welcome_enabled" BOOLEAN NOT NULL DEFAULT false,
    "welcome_message" TEXT,
    "welcome_skip_patients" BOOLEAN NOT NULL DEFAULT true,
    "tag_rules" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_automation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_products_clinic_id_active_idx" ON "crm_products"("clinic_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "crm_automation_settings_clinic_id_key" ON "crm_automation_settings"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "crm_automation_settings_sales_webhook_token_key" ON "crm_automation_settings"("sales_webhook_token");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "crm_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_products" ADD CONSTRAINT "crm_products_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_products" ADD CONSTRAINT "crm_products_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "crm_pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_products" ADD CONSTRAINT "crm_products_buyer_stage_id_fkey" FOREIGN KEY ("buyer_stage_id") REFERENCES "crm_pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_automation_settings" ADD CONSTRAINT "crm_automation_settings_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

