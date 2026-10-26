-- CreateTable
CREATE TABLE "certification_authority_on_account" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "certification_authority_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "certification_authority_on_account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certification_authority_on_account_certification_authority__idx" ON "certification_authority_on_account"("certification_authority_id");

-- CreateIndex
CREATE UNIQUE INDEX "certification_authority_on_account_account_id_key" ON "certification_authority_on_account"("account_id");

-- AddForeignKey
ALTER TABLE "certification_authority_on_account" ADD CONSTRAINT "ca_on_account_ca" FOREIGN KEY ("certification_authority_id") REFERENCES "certification_authority"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_authority_on_account" ADD CONSTRAINT "ca_on_account_account" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
