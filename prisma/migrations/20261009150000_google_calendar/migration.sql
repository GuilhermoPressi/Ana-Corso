-- AlterTable
ALTER TABLE "schedule_events" ADD COLUMN     "google_event_id" TEXT,
ADD COLUMN     "google_sync_error" TEXT,
ADD COLUMN     "google_synced_at" TIMESTAMP(3),
ADD COLUMN     "google_user_id" TEXT;

-- CreateTable
CREATE TABLE "google_calendar_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "refresh_token_enc" TEXT NOT NULL,
    "access_token_enc" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "calendar_id" TEXT NOT NULL DEFAULT 'primary',
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_calendar_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "google_calendar_accounts_user_id_key" ON "google_calendar_accounts"("user_id");

-- AddForeignKey
ALTER TABLE "google_calendar_accounts" ADD CONSTRAINT "google_calendar_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

