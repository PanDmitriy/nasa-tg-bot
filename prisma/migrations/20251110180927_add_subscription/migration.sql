-- CreateTable
CREATE TABLE "subscriptions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegramId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "params" JSONB,
    "hourUtc" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "subscriptions_chatId_idx" ON "subscriptions"("chatId");

-- CreateIndex
CREATE INDEX "subscriptions_type_idx" ON "subscriptions"("type");

-- CreateIndex
CREATE INDEX "subscriptions_enabled_idx" ON "subscriptions"("enabled");
