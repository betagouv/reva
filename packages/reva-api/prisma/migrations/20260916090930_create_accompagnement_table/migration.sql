-- CreateEnum
CREATE TYPE "AccompagnementStatus" AS ENUM ('BROUILLON', 'ACTIF', 'TERMINE');

-- CreateTable
CREATE TABLE "accompagnement" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "candidacy_id" UUID NOT NULL,
    "status" "AccompagnementStatus" NOT NULL DEFAULT 'BROUILLON',
    "started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "candidacy_status_at_start" "CandidacyStatusStep",
    "candidacy_status_at_end" "CandidacyStatusStep",
    "organism_id" UUID,
    "individual_hour_count" INTEGER,
    "collective_hour_count" INTEGER,
    "additional_hour_count" INTEGER,
    "certificate_skills" TEXT,
    "other_training" TEXT,
    "is_certification_partial" BOOLEAN,
    "first_appointment_occured_at" DATE,
    "finance_module" "FinanceModule" NOT NULL DEFAULT 'hors_plateforme',
    "end_accompagnement_date" TIMESTAMPTZ(6),
    "end_accompagnement_status" "EndAccompagnementStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "end_accompagnement_reason" "EndAccompagnementReason",
    "end_accompagnement_candidate_drop_out_reason_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "accompagnement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accompagnement_candidacy_id_idx" ON "accompagnement"("candidacy_id");

-- CreateIndex
CREATE INDEX "accompagnement_candidacy_id_status_idx" ON "accompagnement"("candidacy_id", "status");

-- CreateIndex
CREATE INDEX "accompagnement_organism_id_idx" ON "accompagnement"("organism_id");

-- CreateIndex: at most one non-TERMINE accompagnement per candidacy
CREATE UNIQUE INDEX "accompagnement_one_non_termine_per_candidacy_key"
ON "accompagnement"("candidacy_id")
WHERE "status" <> 'TERMINE';

-- CheckConstraints
ALTER TABLE "accompagnement"
ADD CONSTRAINT "accompagnement_actif_requires_organism_and_no_end"
CHECK (
  "status" <> 'ACTIF'
  OR ("organism_id" IS NOT NULL AND "ended_at" IS NULL)
);

ALTER TABLE "accompagnement"
ADD CONSTRAINT "accompagnement_termine_requires_ended_at"
CHECK (
  "status" <> 'TERMINE'
  OR "ended_at" IS NOT NULL
);

-- AddForeignKey
ALTER TABLE "accompagnement" ADD CONSTRAINT "accompagnement_candidacy_id_fkey" FOREIGN KEY ("candidacy_id") REFERENCES "candidacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accompagnement" ADD CONSTRAINT "accompagnement_organism_id_fkey" FOREIGN KEY ("organism_id") REFERENCES "organism"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accompagnement" ADD CONSTRAINT "accompagnement_end_accompagnement_candidate_drop_out_reason_fkey" FOREIGN KEY ("end_accompagnement_candidate_drop_out_reason_id") REFERENCES "drop_out_reason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: optional accompagnement_id on child tables
ALTER TABLE "funding_request" ADD COLUMN "accompagnement_id" UUID;
ALTER TABLE "funding_request_unifvae" ADD COLUMN "accompagnement_id" UUID;
ALTER TABLE "payment_request" ADD COLUMN "accompagnement_id" UUID;
ALTER TABLE "payment_request_unifvae" ADD COLUMN "accompagnement_id" UUID;
ALTER TABLE "training_candidacy" ADD COLUMN "accompagnement_id" UUID;
ALTER TABLE "basic_skill_candidacy" ADD COLUMN "accompagnement_id" UUID;
ALTER TABLE "candidacy_on_candidacy_financing_method" ADD COLUMN "accompagnement_id" UUID;

-- CreateIndex (unique when set for 1:1 funding/payment)
CREATE UNIQUE INDEX "funding_request_accompagnement_id_key" ON "funding_request"("accompagnement_id");
CREATE UNIQUE INDEX "funding_request_unifvae_accompagnement_id_key" ON "funding_request_unifvae"("accompagnement_id");
CREATE UNIQUE INDEX "payment_request_accompagnement_id_key" ON "payment_request"("accompagnement_id");
CREATE UNIQUE INDEX "payment_request_unifvae_accompagnement_id_key" ON "payment_request_unifvae"("accompagnement_id");
CREATE INDEX "training_candidacy_accompagnement_id_idx" ON "training_candidacy"("accompagnement_id");
CREATE INDEX "basic_skill_candidacy_accompagnement_id_idx" ON "basic_skill_candidacy"("accompagnement_id");
CREATE INDEX "candidacy_on_candidacy_financing_method_accompagnement_id_idx" ON "candidacy_on_candidacy_financing_method"("accompagnement_id");

-- AddForeignKey for child tables
ALTER TABLE "funding_request" ADD CONSTRAINT "funding_request_accompagnement_id_fkey" FOREIGN KEY ("accompagnement_id") REFERENCES "accompagnement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "funding_request_unifvae" ADD CONSTRAINT "funding_request_unifvae_accompagnement_id_fkey" FOREIGN KEY ("accompagnement_id") REFERENCES "accompagnement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_request" ADD CONSTRAINT "payment_request_accompagnement_id_fkey" FOREIGN KEY ("accompagnement_id") REFERENCES "accompagnement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_request_unifvae" ADD CONSTRAINT "payment_request_unifvae_accompagnement_id_fkey" FOREIGN KEY ("accompagnement_id") REFERENCES "accompagnement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "training_candidacy" ADD CONSTRAINT "training_candidacy_accompagnement_id_fkey" FOREIGN KEY ("accompagnement_id") REFERENCES "accompagnement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "basic_skill_candidacy" ADD CONSTRAINT "basic_skill_candidacy_accompagnement_id_fkey" FOREIGN KEY ("accompagnement_id") REFERENCES "accompagnement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "candidacy_on_candidacy_financing_method" ADD CONSTRAINT "candidacy_on_candidacy_financing_method_accompagnement_id_fkey" FOREIGN KEY ("accompagnement_id") REFERENCES "accompagnement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: one accompagnement per existing ACCOMPAGNE candidacy when organism_id is not null
-- Accompagnement status is: 
-- - TERMINE if end_accompagnement_status is CONFIRMED_BY_CANDIDATE or CONFIRMED_BY_ADMIN or end_accompagnement_date is not null
-- - BROUILLON if status is PROJET, PIRSE_EN_CHARGE, VALIDATION or PARCOURS_ENVOYE
-- - ACTIF otherwise
INSERT INTO "accompagnement" (
    "id",
    "candidacy_id",
    "status",
    "started_at",
    "ended_at",
    "candidacy_status_at_start",
    "candidacy_status_at_end",
    "organism_id",
    "individual_hour_count",
    "collective_hour_count",
    "additional_hour_count",
    "certificate_skills",
    "other_training",
    "is_certification_partial",
    "first_appointment_occured_at",
    "finance_module",
    "end_accompagnement_date",
    "end_accompagnement_status",
    "end_accompagnement_reason",
    "end_accompagnement_candidate_drop_out_reason_id",
    "created_at",
    "updated_at"
)
SELECT
    uuid_generate_v4(),
    c.id,
    CASE
        WHEN c.end_accompagnement_status IN ('CONFIRMED_BY_CANDIDATE', 'CONFIRMED_BY_ADMIN') OR c.end_accompagnement_date IS NOT NULL THEN 'TERMINE'::"AccompagnementStatus"
        WHEN (c.status = 'PRISE_EN_CHARGE' OR c.status = 'VALIDATION' OR c.status = 'PARCOURS_ENVOYE') THEN 'BROUILLON'::"AccompagnementStatus"
        ELSE 'ACTIF'::"AccompagnementStatus"
    END,
    CASE
        WHEN c.end_accompagnement_status IN ('CONFIRMED_BY_CANDIDATE', 'CONFIRMED_BY_ADMIN') OR c.end_accompagnement_date IS NOT NULL
          OR c.organism_id IS NOT NULL
        THEN COALESCE(c.sent_at, c.updated_at)
        ELSE NULL
    END,
    CASE
        WHEN c.end_accompagnement_status IN ('CONFIRMED_BY_CANDIDATE', 'CONFIRMED_BY_ADMIN') OR c.end_accompagnement_date IS NOT NULL
        THEN COALESCE(c.end_accompagnement_date, c.updated_at)
        ELSE NULL
    END,
    'VALIDATION'::"CandidacyStatusStep",
    CASE
        WHEN c.end_accompagnement_status IN ('CONFIRMED_BY_CANDIDATE', 'CONFIRMED_BY_ADMIN') OR c.end_accompagnement_date IS NOT NULL
        THEN c.status
        ELSE NULL
    END,
    c.organism_id,
    c.individual_hour_count,
    c.collective_hour_count,
    c.additional_hour_count,
    c.certificate_skills,
    c.other_training,
    c.is_certification_partial,
    c.first_appointment_occured_at,
    c.finance_module,
    c.end_accompagnement_date,
    c.end_accompagnement_status,
    c.end_accompagnement_reason,
    c.end_accompagnement_candidate_drop_out_reason_id,
    c.created_at,
    c.updated_at
FROM "candidacy" c
WHERE c.type_accompagnement = 'ACCOMPAGNE'
AND c.organism_id IS NOT NULL;

-- Point existing child rows at the backfilled accompagnement
UPDATE "funding_request" fr
SET "accompagnement_id" = a.id
FROM "accompagnement" a
WHERE a.candidacy_id = fr.candidacy_id;

UPDATE "funding_request_unifvae" fr
SET "accompagnement_id" = a.id
FROM "accompagnement" a
WHERE a.candidacy_id = fr.candidacy_id;

UPDATE "payment_request" pr
SET "accompagnement_id" = a.id
FROM "accompagnement" a
WHERE a.candidacy_id = pr.candidacy_id;

UPDATE "payment_request_unifvae" pr
SET "accompagnement_id" = a.id
FROM "accompagnement" a
WHERE a.candidacy_id = pr.candidacy_id;

UPDATE "training_candidacy" tc
SET "accompagnement_id" = a.id
FROM "accompagnement" a
WHERE a.candidacy_id = tc.candidacy_id;

UPDATE "basic_skill_candidacy" bsc
SET "accompagnement_id" = a.id
FROM "accompagnement" a
WHERE a.candidacy_id = bsc.candidacy_id;

UPDATE "candidacy_on_candidacy_financing_method" cfm
SET "accompagnement_id" = a.id
FROM "accompagnement" a
WHERE a.candidacy_id = cfm.candidacy_id;

-- UPDATE "accompagnement" a
-- SET "status" = CASE
--         WHEN c.end_accompagnement_status IN ('CONFIRMED_BY_CANDIDATE', 'CONFIRMED_BY_ADMIN') THEN 'TERMINE'::"AccompagnementStatus"
--         WHEN (c.status= 'PROJET' OR c.status = 'PRISE_EN_CHARGE' OR c.status = 'VALIDATION' OR c.status = 'PARCOURS_ENVOYE') THEN 'BROUILLON'::"AccompagnementStatus"
--         ELSE 'ACTIF'::"AccompagnementStatus"
--     END
-- FROM "candidacy" c
-- WHERE a.candidacy_id = c.id
-- AND c.organism_id IS NOT NULL;
-- Error performing truncate: cannot truncate a table referenced in a foreign key constraint
-- DETAIL: Table "basic_skill_candidacy" references "accompagnement".
-- HINT: Truncate table "basic_skill_candidacy" at the same time, or use TRUNCATE ... CASCADE.