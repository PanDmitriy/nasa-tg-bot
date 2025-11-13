-- CreateTable
CREATE TABLE "premiums" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegramId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "until" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "premiums_telegramId_idx" ON "premiums"("telegramId");

-- CreateIndex
CREATE INDEX "premiums_active_idx" ON "premiums"("active");
