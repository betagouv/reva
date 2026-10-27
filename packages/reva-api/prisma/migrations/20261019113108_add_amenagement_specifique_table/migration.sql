-- CreateTable
CREATE TABLE "amenagement_specifique" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "jury_id" UUID NOT NULL,
    "justification_file_id" UUID NOT NULL,
    "justification_description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "amenagement_specifique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "amenagement_specifique_jury_id_idx" ON "amenagement_specifique"("jury_id");

-- CreateIndex
CREATE UNIQUE INDEX "amenagement_specifique_jury_id_key" ON "amenagement_specifique"("jury_id");

-- AddForeignKey
ALTER TABLE "amenagement_specifique" ADD CONSTRAINT "amenagement_specifique_jury_id_fkey" FOREIGN KEY ("jury_id") REFERENCES "jury"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amenagement_specifique" ADD CONSTRAINT "amenagement_specifique_justification_file_id_fkey" FOREIGN KEY ("justification_file_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;
