-- CreateTable
CREATE TABLE "ChatMetadata" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMetadata_pkey" PRIMARY KEY ("id")
);
