BEGIN;

-- Generated columns cannot reference another table. This helper reads
-- certification_authority_structure.label so it can be stored in
-- certification.searchable_text. It is IMMUTABLE because generated columns
-- require it. The trigger below recomputes the column when the label changes.
CREATE OR REPLACE FUNCTION certification_authority_structure_label(structure_id uuid) RETURNS character varying LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE SET search_path = public AS $func$
BEGIN
    RETURN (
        SELECT
            cas.label
        FROM
            certification_authority_structure cas
        WHERE
            cas.id = structure_id
    );
END;
$func$;

DROP VIEW available_certification_based_on_formacode;

DROP VIEW active_organism_by_available_certification_based_on_formacode;

ALTER TABLE "certification" DROP COLUMN "searchable_text";

ALTER TABLE "certification"
ADD COLUMN "searchable_text" tsvector GENERATED ALWAYS AS (
    setweight(
        to_tsvector(
            'simple',
            immutable_unaccent(
                (
                    (
                        (COALESCE(label, ''::character varying))::text || ' '::text
                    ) || (
                        (COALESCE(rncp_id, ''::character varying))::text || ' '::text
                    ) || (
                        (COALESCE(rncp_type_diplome, ''::character varying))::text || ' '::text
                    ) || (
                        (
                            COALESCE(
                                certification_authority_structure_label(certification_authority_structure_id),
                                ''::character varying
                            )
                        )::text || ' '::text
                    )
                )
            )
        ),
        'A'
    ) || setweight(
        to_tsvector(
            'simple',
            immutable_unaccent(COALESCE(rncp_objectifs_contexte, ''::text))
        ),
        'B'
    )
) STORED;

CREATE OR REPLACE FUNCTION refresh_certification_searchable_text_from_structure_label() RETURNS trigger LANGUAGE plpgsql AS $func$
BEGIN
    IF NEW.label IS DISTINCT FROM OLD.label THEN
        UPDATE certification
        SET
            certification_authority_structure_id = certification_authority_structure_id
        WHERE
            certification_authority_structure_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$func$;

CREATE TRIGGER certification_authority_structure_label_refresh_searchable_text
AFTER UPDATE OF label ON certification_authority_structure
FOR EACH ROW
EXECUTE PROCEDURE refresh_certification_searchable_text_from_structure_label();

-- available_certification
-- used by candidate app to view available certification
CREATE
OR REPLACE VIEW available_certification_based_on_formacode AS
-- expert filiere and expertBrancheEtFiliere filiere part
SELECT DISTINCT
    cer.id as certification_id,
    cer.searchable_text as certification_searchable_text
FROM
    certification cer,
    organism org
    LEFT JOIN maison_mere_aap mma ON org.maison_mere_aap_id = mma.id,
    formacode code,
    organism_on_formacode org_code,
    certification_on_formacode cer_code,
    organism_on_degree org_degree,
    degree degree
WHERE
    (
        org.typology = 'expertFiliere'
        or org.typology = 'expertBrancheEtFiliere' -- "expertBrancheEtFiliere" is both "expertBranche" and "expertFiliere"
    )
    AND code.type = 'SUB_DOMAIN'
    AND mma.is_active = true
    AND org.ferme_pour_absence_ou_conges = false
    AND cer.visible = true
    AND org_code.organism_id = org.id
    AND org_code.formacode_id = code.id
    AND cer_code.certification_id = cer.id
    AND cer_code.formacode_id = code.id
    AND org_degree.organism_id = org.id
    AND org_degree.degree_id = degree.id
    AND degree.level = cer.level
    AND NOT EXISTS (
        select
            certification_on_ccn.certification_id
        from
            certification_on_ccn
        where
            certification_on_ccn.certification_id = cer.id
    )
UNION DISTINCT --
-- expert branche and expertBrancheEtFiliere branche part
SELECT DISTINCT
    cer.id as certification_id,
    cer.searchable_text as certification_searchable_text
FROM
    certification cer,
    organism org
    LEFT JOIN maison_mere_aap mma ON org.maison_mere_aap_id = mma.id,
    convention_collective ccn,
    organism_on_ccn org_ccn,
    certification_on_ccn cer_ccn,
    organism_on_degree org_degree,
    degree degree
WHERE
    (
        org.typology = 'expertBranche'
        or org.typology = 'expertBrancheEtFiliere' -- "expertBrancheEtFiliere" is both "expertBranche" and "expertFiliere"
    )
    AND mma.is_active = true
    AND org.ferme_pour_absence_ou_conges = false
    AND cer.visible = true
    AND org_ccn.organism_id = org.id
    AND org_ccn.ccn_id = ccn.id
    AND cer_ccn.certification_id = cer.id
    AND cer_ccn.ccn_id = ccn.id
    AND org_degree.organism_id = org.id
    AND org_degree.degree_id = degree.id
    AND degree.level = cer.level;

--active_organism_by_available_certification
--used by candidate app to view active organisms for a given certificate
CREATE
OR REPLACE VIEW active_organism_by_available_certification_based_on_formacode AS
--expert filiere and expertBrancheEtFiliere filiere part
SELECT DISTINCT
    org.id as organism_id,
    cer.id as certification_id,
    cer.searchable_text as certification_searchable_text
FROM
    certification cer,
    organism org
    LEFT JOIN maison_mere_aap mma ON org.maison_mere_aap_id = mma.id,
    formacode code,
    organism_on_formacode org_code,
    certification_on_formacode cer_code,
    organism_on_degree org_degree,
    degree degree
WHERE
    (
        org.typology = 'expertFiliere'
        or org.typology = 'expertBrancheEtFiliere' -- "expertBrancheEtFiliere" is both "expertBranche" and "expertFiliere"
    )
    AND code.type = 'SUB_DOMAIN'
    AND mma.is_active = true
    AND cer.visible = true
    AND org_code.organism_id = org.id
    AND org_code.formacode_id = code.id
    AND cer_code.certification_id = cer.id
    AND cer_code.formacode_id = code.id
    AND org_degree.organism_id = org.id
    AND org_degree.degree_id = degree.id
    AND degree.level = cer.level
    AND NOT EXISTS (
        select
            certification_on_ccn.certification_id
        from
            certification_on_ccn
        where
            certification_on_ccn.certification_id = cer.id
    )
UNION DISTINCT --
-- expert branche and expertBrancheEtFiliere branche part
SELECT DISTINCT
    org.id as organisme_id,
    cer.id as certification_id,
    cer.searchable_text as certification_searchable_text
FROM
    certification cer,
    organism org
    LEFT JOIN maison_mere_aap mma ON org.maison_mere_aap_id = mma.id,
    convention_collective ccn,
    organism_on_ccn org_ccn,
    certification_on_ccn cer_ccn,
    organism_on_degree org_degree,
    degree degree
WHERE
    (
        org.typology = 'expertBranche'
        or org.typology = 'expertBrancheEtFiliere' -- "expertBrancheEtFiliere" is both "expertBranche" and "expertFiliere"
    )
    AND mma.is_active = true
    AND cer.visible = true
    AND org_ccn.organism_id = org.id
    AND org_ccn.ccn_id = ccn.id
    AND cer_ccn.certification_id = cer.id
    AND cer_ccn.ccn_id = ccn.id
    AND org_degree.organism_id = org.id
    AND org_degree.degree_id = degree.id
    AND degree.level = cer.level;

COMMIT;
