-- Anonymization script for REVA personal data
-- Covers a broader set of tables than anonymize-reva-db.sql.
--
-- Two strategies are used:
--   1. UPDATE with a deterministic but fake value. Identity-like fields (names, emails,
--      phones, addresses, filenames, entity names) get a value keyed on the row id so
--      rows stay distinguishable for debugging. Freeform commentary fields (decision
--      comments, reasons, descriptions) get a generic placeholder instead, since their
--      content is unstructured and may itself contain PII. JSON columns are cleared to
--      an empty object.
--   2. TRUNCATE for tables for which we want to delete all rows
--
BEGIN;

-- aap_log (à purger)
TRUNCATE aap_log;

-- account
UPDATE account
SET
  email = 'account-' || keycloak_id || '@anon.invalid',
  firstname = CASE
    WHEN firstname IS NOT NULL THEN 'Prénom-' || LEFT(keycloak_id::text, 8)
  END,
  lastname = CASE
    WHEN lastname IS NOT NULL THEN 'Nom-' || LEFT(keycloak_id::text, 8)
  END;

-- appointment
UPDATE appointment
SET
  description = CASE
    WHEN description IS NOT NULL THEN 'Description anonymisée'
  END,
  location = CASE
    WHEN location IS NOT NULL THEN 'Lieu-' || LEFT(id::text, 8)
  END;

-- candidacy_candidate_info
UPDATE candidacy_candidate_info
SET
  street = CASE
    WHEN street IS NOT NULL THEN 'Rue-' || LEFT(id::text, 8)
  END,
  city = CASE
    WHEN city IS NOT NULL THEN 'Ville-' || LEFT(id::text, 8)
  END,
  zip = CASE
    WHEN zip IS NOT NULL THEN '00000'
  END,
  address_complement = CASE
    WHEN address_complement IS NOT NULL THEN 'Complément-' || LEFT(id::text, 8)
  END;

-- candidacy_drop_out
UPDATE candidacy_drop_out
SET
  other_reason_content = CASE
    WHEN other_reason_content IS NOT NULL THEN 'Motif anonymisé'
  END;

-- candidacy_log
UPDATE candidacy_log
SET
  user_email = 'user-' || id || '@anon.invalid',
  details = CASE
    WHEN details IS NOT NULL THEN '{}'::jsonb
  END;

-- candidate
UPDATE candidate
SET
  email = 'candidate-' || keycloak_id || '@anon.invalid',
  phone = '0101010101',
  firstname = 'Prénom-' || LEFT(keycloak_id::text, 8),
  firstname2 = CASE
    WHEN firstname2 IS NOT NULL THEN 'Prénom2-' || LEFT(keycloak_id::text, 8)
  END,
  firstname3 = CASE
    WHEN firstname3 IS NOT NULL THEN 'Prénom3-' || LEFT(keycloak_id::text, 8)
  END,
  lastname = 'Nom-' || LEFT(id::text, 8),
  given_name = CASE
    WHEN given_name IS NOT NULL THEN 'Nom-' || LEFT(keycloak_id::text, 8)
  END,
  middle_names = CASE
    WHEN middle_names IS NOT NULL THEN 'Prénoms-' || LEFT(keycloak_id::text, 8)
  END,
  birth_city = CASE
    WHEN birth_city IS NOT NULL THEN 'Ville-' || LEFT(keycloak_id::text, 8)
  END,
  city = CASE
    WHEN city IS NOT NULL THEN 'Ville-' || LEFT(keycloak_id::text, 8)
  END,
  street = CASE
    WHEN street IS NOT NULL THEN 'Rue-' || LEFT(keycloak_id::text, 8)
  END,
  zip = CASE
    WHEN zip IS NOT NULL THEN '00000'
  END,
  "addressComplement" = CASE
    WHEN "addressComplement" IS NOT NULL THEN 'Complément-' || LEFT(keycloak_id::text, 8)
  END,
  birthdate = CASE
    WHEN birthdate IS NOT NULL THEN DATE '1970-01-01'
  END,
  birth_department_id = NULL,
  country_id = NULL;

-- candidacy
UPDATE candidacy
SET
  other_training = CASE
    WHEN other_training IS NOT NULL THEN 'Formation anonymisée'
  END,
  certification_authority_transfer_reason = CASE
    WHEN certification_authority_transfer_reason IS NOT NULL THEN 'Motif anonymisé'
  END,
  archiving_reason_additional_information = CASE
    WHEN archiving_reason_additional_information IS NOT NULL THEN 'Information anonymisée'
  END;

-- certification_authority (contact info may identify individuals)
UPDATE certification_authority
SET
  contact_full_name = CASE
    WHEN contact_full_name IS NOT NULL THEN 'Contact-' || LEFT(id::text, 8)
  END,
  contact_email = CASE
    WHEN contact_email IS NOT NULL THEN 'ca-' || id || '@anon.invalid'
  END,
  contact_phone = CASE
    WHEN contact_phone IS NOT NULL THEN '0101010101'
  END;

-- certification_authority_local_account
UPDATE certification_authority_local_account
SET
  contact_full_name = CASE
    WHEN contact_full_name IS NOT NULL THEN 'Contact-' || LEFT(id::text, 8)
  END,
  contact_email = CASE
    WHEN contact_email IS NOT NULL THEN 'cala-' || id || '@anon.invalid'
  END,
  contact_phone = CASE
    WHEN contact_phone IS NOT NULL THEN '0101010101'
  END;

-- cohorte_vae_collective
UPDATE cohorte_vae_collective
SET
  nom = 'Cohorte-' || LEFT(id::text, 8);

-- commanditaire_vae_collective
UPDATE commanditaire_vae_collective
SET
  raison_sociale = 'Commanditaire-' || LEFT(id::text, 8);

-- dematerialized_feasibility_file
UPDATE dematerialized_feasibility_file
SET
  aap_decision_comment = CASE
    WHEN aap_decision_comment IS NOT NULL THEN 'Commentaire anonymisé'
  END,
  candidate_decision_comment = CASE
    WHEN candidate_decision_comment IS NOT NULL THEN 'Commentaire anonymisé'
  END,
  prerequisites_comment = CASE
    WHEN prerequisites_comment IS NOT NULL THEN 'Commentaire anonymisé'
  END;

-- dff_certification_competence_bloc
UPDATE dff_certification_competence_bloc
SET
  text = CASE
    WHEN text IS NOT NULL THEN 'Texte anonymisé'
  END;

-- dff_prerequisite
UPDATE dff_prerequisite
SET
  label = 'Prérequis-' || LEFT(id::text, 8);

-- dossier_de_validation
UPDATE dossier_de_validation
SET
  decision_comment = CASE
    WHEN decision_comment IS NOT NULL THEN 'Commentaire anonymisé'
  END;

-- experience
UPDATE experience
SET
  title = 'Expérience-' || LEFT(id::text, 8),
  description = 'Description anonymisée';

-- feasibility
UPDATE feasibility
SET
  decision_comment = CASE
    WHEN decision_comment IS NOT NULL THEN 'Commentaire anonymisé'
  END;

-- feasibility_decision
UPDATE feasibility_decision
SET
  decision_comment = CASE
    WHEN decision_comment IS NOT NULL THEN 'Commentaire anonymisé'
  END;

-- file
UPDATE file
SET
  name = 'fichier-' || LEFT(id::text, 8);

-- funding_request
UPDATE funding_request
SET
  other_training = 'Formation anonymisée';

-- funding_request_batch
UPDATE funding_request_batch
SET
  content = '{}'::jsonb;

-- funding_request_batch_unifvae
UPDATE funding_request_batch_unifvae
SET
  content = '{}'::jsonb;

-- funding_request_unifvae
UPDATE funding_request_unifvae
SET
  candidate_firstname = 'Prénom-' || LEFT(id::text, 8),
  candidate_secondname = CASE
    WHEN candidate_secondname IS NOT NULL THEN 'Prénom2-' || LEFT(id::text, 8)
  END,
  candidate_thirdname = CASE
    WHEN candidate_thirdname IS NOT NULL THEN 'Prénom3-' || LEFT(id::text, 8)
  END,
  candidate_lastname = 'Nom-' || LEFT(id::text, 8),
  funding_contact_firstname = CASE
    WHEN funding_contact_firstname IS NOT NULL THEN 'Prénom-' || LEFT(id::text, 8)
  END,
  funding_contact_lastname = CASE
    WHEN funding_contact_lastname IS NOT NULL THEN 'Nom-' || LEFT(id::text, 8)
  END,
  funding_contact_email = CASE
    WHEN funding_contact_email IS NOT NULL THEN 'contact-' || id || '@anon.invalid'
  END,
  funding_contact_phone = CASE
    WHEN funding_contact_phone IS NOT NULL THEN '0101010101'
  END;

-- jury
UPDATE jury
SET
  information_of_result = CASE
    WHEN information_of_result IS NOT NULL THEN 'Information anonymisée'
  END;

-- maison_mere_aap
UPDATE maison_mere_aap
SET
  manager_firstname = CASE
    WHEN manager_firstname IS NOT NULL THEN 'Prénom-' || LEFT(id::text, 8)
  END,
  manager_lastname = CASE
    WHEN manager_lastname IS NOT NULL THEN 'Nom-' || LEFT(id::text, 8)
  END,
  phone = CASE
    WHEN phone IS NOT NULL THEN '0101010101'
  END,
  site_web = CASE
    WHEN site_web IS NOT NULL THEN 'https://site-anonymise-' || LEFT(id::text, 8) || '.invalid'
  END;

-- maison_mere_aap_legal_information_documents
UPDATE maison_mere_aap_legal_information_documents
SET
  manager_firstname = 'Prénom-' || LEFT(id::text, 8),
  manager_lastname = 'Nom-' || LEFT(id::text, 8),
  gestionnaire_firstname = CASE
    WHEN gestionnaire_firstname IS NOT NULL THEN 'Prénom-' || LEFT(id::text, 8)
  END,
  gestionnaire_lastname = CASE
    WHEN gestionnaire_lastname IS NOT NULL THEN 'Nom-' || LEFT(id::text, 8)
  END,
  gestionnaire_email = CASE
    WHEN gestionnaire_email IS NOT NULL THEN 'gestionnaire-' || id || '@anon.invalid'
  END,
  phone = CASE
    WHEN phone IS NOT NULL THEN '0101010101'
  END;

-- maison_mere_aap_legal_information_documents_decision
UPDATE maison_mere_aap_legal_information_documents_decision
SET
  internal_comment = 'Commentaire interne anonymisé',
  aap_comment = 'Commentaire anonymisé';

-- organism (administrative/public contact info and address)
UPDATE organism
SET
  contact_administrative_email = 'organism-' || id || '@anon.invalid',
  contact_administrative_phone = CASE
    WHEN contact_administrative_phone IS NOT NULL THEN '0101010101'
  END,
  telephone = CASE
    WHEN telephone IS NOT NULL THEN '0101010101'
  END,
  email_contact = CASE
    WHEN email_contact IS NOT NULL THEN 'contact-' || id || '@anon.invalid'
  END,
  website = CASE
    WHEN website IS NOT NULL THEN 'https://site-anonymise-' || LEFT(id::text, 8) || '.invalid'
  END,
  site_internet = CASE
    WHEN site_internet IS NOT NULL THEN 'https://site-anonymise-' || LEFT(id::text, 8) || '.invalid'
  END,
  ll_to_earth = NULL,
  nom_public = CASE
    WHEN nom_public IS NOT NULL THEN 'Organisme-' || LEFT(id::text, 8)
  END,
  adresse_numero_et_nom_de_rue = CASE
    WHEN adresse_numero_et_nom_de_rue IS NOT NULL THEN 'Rue-' || LEFT(id::text, 8)
  END,
  adresse_informations_complementaires = CASE
    WHEN adresse_informations_complementaires IS NOT NULL THEN 'Complément-' || LEFT(id::text, 8)
  END,
  adresse_code_postal = CASE
    WHEN adresse_code_postal IS NOT NULL THEN '00000'
  END,
  adresse_ville = CASE
    WHEN adresse_ville IS NOT NULL THEN 'Ville-' || LEFT(id::text, 8)
  END;

-- subscription_request (à purger)
TRUNCATE subscription_request;

-- account_email_otp (à purger)
TRUNCATE account_email_otp;

-- certification_additional_info (not in the current anonymization field list,
-- but the expert contact phone is PII)
UPDATE certification_additional_info
SET
  certification_expert_contact_phone = CASE
    WHEN certification_expert_contact_phone IS NOT NULL THEN '0101010101'
  END;

COMMIT;
