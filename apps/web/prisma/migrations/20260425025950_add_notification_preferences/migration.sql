-- AlterTable
ALTER TABLE "User" ADD COLUMN "notification_email_mode" TEXT NOT NULL DEFAULT 'digest_daily',
ADD COLUMN "notification_email_last_sent_at" TIMESTAMP(3),
ADD COLUMN "notification_unsubscribe_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_notification_unsubscribe_token_key" ON "User"("notification_unsubscribe_token");
