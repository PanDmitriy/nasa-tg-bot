-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegram_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "donki_subscriptions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "alert_level" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "donki_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("telegram_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

-- CreateIndex
CREATE INDEX "donki_subscriptions_user_id_idx" ON "donki_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "donki_subscriptions_event_type_idx" ON "donki_subscriptions"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "donki_subscriptions_user_id_event_type_key" ON "donki_subscriptions"("user_id", "event_type");
