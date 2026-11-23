-- CreateEnum
CREATE TYPE "DeadLinkSource" AS ENUM (
  'CERTIFICATION_ADDITIONAL_INFO',
  'CERTIFICATION_AUTHORITY',
  'ORGANISM',
  'MAISON_MERE_AAP',
  'MANUAL'
);

-- CreateEnum
CREATE TYPE "DeadLinkResolvedReason" AS ENUM (
  'RECOVERED',
  'NO_LONGER_PRESENT'
);

-- CreateTable
CREATE TABLE "manual_monitored_link" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "url" TEXT NOT NULL,
    "label" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled_at" TIMESTAMPTZ(6),

    CONSTRAINT "manual_monitored_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_link" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "source_table" "DeadLinkSource" NOT NULL,
    "source_id" UUID NOT NULL,
    "field_name" VARCHAR(100),
    "url" TEXT NOT NULL,
    "http_status" INTEGER,
    "error_message" TEXT,
    "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_checked_at" TIMESTAMPTZ(6) NOT NULL,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_reason" "DeadLinkResolvedReason",

    CONSTRAINT "dead_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manual_monitored_link_url_key" ON "manual_monitored_link"("url");

-- CreateIndex
CREATE INDEX "dead_link_source_table_source_id_idx" ON "dead_link"("source_table", "source_id");

-- CreateIndex
CREATE INDEX "dead_link_resolved_at_idx" ON "dead_link"("resolved_at");

-- CreateIndex: at most one open incident per stored column value
CREATE UNIQUE INDEX "dead_link_one_open_incident_key"
ON "dead_link" ("source_table", "source_id", "field_name", "url")
WHERE "resolved_at" IS NULL AND "field_name" IS NOT NULL;

-- CreateIndex: at most one open incident per manual registry row.
-- field_name is null for MANUAL, and Postgres treats nulls as distinct,
-- so this index cannot share the stored-column key above.
CREATE UNIQUE INDEX "dead_link_one_open_manual_incident_key"
ON "dead_link" ("source_id")
WHERE "resolved_at" IS NULL AND "source_table" = 'MANUAL';

-- CheckConstraints
ALTER TABLE "dead_link"
ADD CONSTRAINT "dead_link_source_shape"
CHECK (
  (
    "source_table" = 'MANUAL'
    AND "field_name" IS NULL
  )
  OR (
    "source_table" <> 'MANUAL'
    AND "field_name" IS NOT NULL
  )
);

ALTER TABLE "dead_link"
ADD CONSTRAINT "dead_link_resolved_reason_matches_resolved_at"
CHECK (
  (
    "resolved_at" IS NULL
    AND "resolved_reason" IS NULL
  )
  OR (
    "resolved_at" IS NOT NULL
    AND "resolved_reason" IS NOT NULL
  )
);

INSERT INTO "features" ("key", "label", "is_active")
VALUES (
  'batch.detect-and-flag-dead-links',
  'Active la détection hebdomadaire des liens morts',
  false
);
