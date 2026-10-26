-- Fill certification_authority_on_account from account.certificationAuthorityId
-- so existing accounts keep their certification authority after the switch to this table.
INSERT INTO "certification_authority_on_account" ("certification_authority_id", "account_id")
SELECT a."certificationAuthorityId", a."id"
FROM "account" a
WHERE a."certificationAuthorityId" IS NOT NULL;
