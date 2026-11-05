-- Anonymization script for REVA personal data
-- Covers a broader set of tables than anonymize-reva-db.sql.
--
-- Two strategies are used:
--   1. UPDATE with a deterministic but fake value. Identity-like fields (names, emails,
--      phones, addresses, filenames, entity names) get a value keyed on the row id so
--      rows stay distinguishable for debugging. Freeform commentary fields (decision
--      comments, reasons, descriptions) get a generic placeholder instead, since their
--      content is unstructured and may itself contain PII. JSON columns are cleared to
--      an empty object. Fields are only overwritten when they already hold a non-null,
--      non-empty value, so a field that was blank to begin with stays blank.
--   2. TRUNCATE for tables for which we want to delete all rows
--
BEGIN;

-- aap_log (à purger)
TRUNCATE aap_log;

-- file_upload_spooler (à purger, transient staging table that can hold raw
-- invoice/attendance-sheet file bytes and filenames pending FTPS upload)
TRUNCATE file_upload_spooler;

-- account
UPDATE account
SET
  email = CASE
    WHEN email IS NOT NULL AND email != '' THEN 'account-' || keycloak_id || '@anon.invalid'
    ELSE email
  END,
  firstname = CASE
    WHEN firstname IS NOT NULL AND firstname != '' THEN 'Prénom-' || LEFT(keycloak_id::text, 8)
    ELSE firstname
  END,
  lastname = CASE
    WHEN lastname IS NOT NULL AND lastname != '' THEN 'Nom-' || LEFT(keycloak_id::text, 8)
    ELSE lastname
  END;

-- appointment
UPDATE appointment
SET
  title = CASE
    WHEN title IS NOT NULL AND title != '' THEN 'Titre-' || LEFT(id::text, 8)
    ELSE title
  END,
  description = CASE
    WHEN description IS NOT NULL AND description != '' THEN 'Description anonymisée'
    ELSE description
  END,
  location = CASE
    WHEN location IS NOT NULL AND location != '' THEN 'Lieu-' || LEFT(id::text, 8)
    ELSE location
  END;

-- candidacy_candidate_info
UPDATE candidacy_candidate_info
SET
  street = CASE
    WHEN street IS NOT NULL AND street != '' THEN 'Rue-' || LEFT(id::text, 8)
    ELSE street
  END,
  city = CASE
    WHEN city IS NOT NULL AND city != '' THEN 'Ville-' || LEFT(id::text, 8)
    ELSE city
  END,
  zip = CASE
    WHEN zip IS NOT NULL AND zip != '' THEN '00000'
    ELSE zip
  END,
  address_complement = CASE
    WHEN address_complement IS NOT NULL AND address_complement != '' THEN 'Complément-' || LEFT(id::text, 8)
    ELSE address_complement
  END;

-- candidacy_drop_out
UPDATE candidacy_drop_out
SET
  other_reason_content = CASE
    WHEN other_reason_content IS NOT NULL AND other_reason_content != '' THEN 'Motif anonymisé'
    ELSE other_reason_content
  END;

-- candidacy_log
UPDATE candidacy_log
SET
  user_email = CASE
    WHEN user_email IS NOT NULL AND user_email != '' THEN 'user-' || id || '@anon.invalid'
    ELSE user_email
  END,
  details = CASE
    WHEN details IS NOT NULL THEN '{}'::jsonb
  END;

-- candidate
UPDATE candidate
SET
  email = CASE
    WHEN email IS NOT NULL AND email != '' THEN 'candidate-' || keycloak_id || '@anon.invalid'
    ELSE email
  END,
  phone = CASE
    WHEN phone IS NOT NULL AND phone != '' THEN '0101010101'
    ELSE phone
  END,
  firstname = CASE
    WHEN firstname IS NOT NULL AND firstname != '' THEN 'Prénom-' || LEFT(keycloak_id::text, 8)
    ELSE firstname
  END,
  firstname2 = CASE
    WHEN firstname2 IS NOT NULL AND firstname2 != '' THEN 'Prénom2-' || LEFT(keycloak_id::text, 8)
    ELSE firstname2
  END,
  firstname3 = CASE
    WHEN firstname3 IS NOT NULL AND firstname3 != '' THEN 'Prénom3-' || LEFT(keycloak_id::text, 8)
    ELSE firstname3
  END,
  lastname = CASE
    WHEN lastname IS NOT NULL AND lastname != '' THEN 'Nom-' || LEFT(id::text, 8)
    ELSE lastname
  END,
  given_name = CASE
    WHEN given_name IS NOT NULL AND given_name != '' THEN 'Nom-' || LEFT(keycloak_id::text, 8)
    ELSE given_name
  END,
  middle_names = CASE
    WHEN middle_names IS NOT NULL AND middle_names != '' THEN 'Prénoms-' || LEFT(keycloak_id::text, 8)
    ELSE middle_names
  END,
  birth_city = CASE
    WHEN birth_city IS NOT NULL AND birth_city != '' THEN 'Ville-' || LEFT(keycloak_id::text, 8)
    ELSE birth_city
  END,
  city = CASE
    WHEN city IS NOT NULL AND city != '' THEN 'Ville-' || LEFT(keycloak_id::text, 8)
    ELSE city
  END,
  street = CASE
    WHEN street IS NOT NULL AND street != '' THEN 'Rue-' || LEFT(keycloak_id::text, 8)
    ELSE street
  END,
  zip = CASE
    WHEN zip IS NOT NULL AND zip != '' THEN '00000'
    ELSE zip
  END,
  "addressComplement" = CASE
    WHEN "addressComplement" IS NOT NULL AND "addressComplement" != '' THEN 'Complément-' || LEFT(keycloak_id::text, 8)
    ELSE "addressComplement"
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
    WHEN other_training IS NOT NULL AND other_training != '' THEN 'Formation anonymisée'
    ELSE other_training
  END,
  certification_authority_transfer_reason = CASE
    WHEN certification_authority_transfer_reason IS NOT NULL AND certification_authority_transfer_reason != '' THEN 'Motif anonymisé'
    ELSE certification_authority_transfer_reason
  END,
  archiving_reason_additional_information = CASE
    WHEN archiving_reason_additional_information IS NOT NULL AND archiving_reason_additional_information != '' THEN 'Information anonymisée'
    ELSE archiving_reason_additional_information
  END;

-- accompagnement (duplicates free-text fields from candidacy)
UPDATE accompagnement
SET
  other_training = CASE
    WHEN other_training IS NOT NULL AND other_training != '' THEN 'Formation anonymisée'
    ELSE other_training
  END,
  certificate_skills = CASE
    WHEN certificate_skills IS NOT NULL AND certificate_skills != '' THEN 'Compétences anonymisées'
    ELSE certificate_skills
  END;

-- certification_authority (contact info may identify individuals)
UPDATE certification_authority
SET
  contact_full_name = CASE
    WHEN contact_full_name IS NOT NULL AND contact_full_name != '' THEN 'Contact-' || LEFT(id::text, 8)
    ELSE contact_full_name
  END,
  contact_email = CASE
    WHEN contact_email IS NOT NULL AND contact_email != '' THEN 'ca-' || id || '@anon.invalid'
    ELSE contact_email
  END,
  contact_phone = CASE
    WHEN contact_phone IS NOT NULL AND contact_phone != '' THEN '0101010101'
    ELSE contact_phone
  END;

-- certification_authority_local_account
UPDATE certification_authority_local_account
SET
  contact_full_name = CASE
    WHEN contact_full_name IS NOT NULL AND contact_full_name != '' THEN 'Contact-' || LEFT(id::text, 8)
    ELSE contact_full_name
  END,
  contact_email = CASE
    WHEN contact_email IS NOT NULL AND contact_email != '' THEN 'cala-' || id || '@anon.invalid'
    ELSE contact_email
  END,
  contact_phone = CASE
    WHEN contact_phone IS NOT NULL AND contact_phone != '' THEN '0101010101'
    ELSE contact_phone
  END;

-- cohorte_vae_collective
UPDATE cohorte_vae_collective
SET
  nom = CASE
    WHEN nom IS NOT NULL AND nom != '' THEN 'Cohorte-' || LEFT(id::text, 8)
    ELSE nom
  END;

-- commanditaire_vae_collective
UPDATE commanditaire_vae_collective
SET
  raison_sociale = CASE
    WHEN raison_sociale IS NOT NULL AND raison_sociale != '' THEN 'Commanditaire-' || LEFT(id::text, 8)
    ELSE raison_sociale
  END;

-- dematerialized_feasibility_file
UPDATE dematerialized_feasibility_file
SET
  aap_decision_comment = CASE
    WHEN aap_decision_comment IS NOT NULL AND aap_decision_comment != '' THEN 'Commentaire anonymisé'
    ELSE aap_decision_comment
  END,
  candidate_decision_comment = CASE
    WHEN candidate_decision_comment IS NOT NULL AND candidate_decision_comment != '' THEN 'Commentaire anonymisé'
    ELSE candidate_decision_comment
  END,
  prerequisites_comment = CASE
    WHEN prerequisites_comment IS NOT NULL AND prerequisites_comment != '' THEN 'Commentaire anonymisé'
    ELSE prerequisites_comment
  END,
  complement_experience_parcours_vise = CASE
    WHEN complement_experience_parcours_vise IS NOT NULL AND complement_experience_parcours_vise != '' THEN 'Complément anonymisé'
    ELSE complement_experience_parcours_vise
  END;

-- dff_certification_competence_bloc
UPDATE dff_certification_competence_bloc
SET
  text = CASE
    WHEN text IS NOT NULL AND text != '' THEN 'Texte anonymisé'
    ELSE text
  END;

-- dff_prerequisite
UPDATE dff_prerequisite
SET
  label = CASE
    WHEN label IS NOT NULL AND label != '' THEN 'Prérequis-' || LEFT(id::text, 8)
    ELSE label
  END;

-- dossier_de_validation
UPDATE dossier_de_validation
SET
  decision_comment = CASE
    WHEN decision_comment IS NOT NULL AND decision_comment != '' THEN 'Commentaire anonymisé'
    ELSE decision_comment
  END;

-- experience
UPDATE experience
SET
  title = CASE
    WHEN title IS NOT NULL AND title != '' THEN 'Expérience-' || LEFT(id::text, 8)
    ELSE title
  END,
  description = CASE
    WHEN description IS NOT NULL AND description != '' THEN 'Description anonymisée'
    ELSE description
  END;

-- feasibility
UPDATE feasibility
SET
  decision_comment = CASE
    WHEN decision_comment IS NOT NULL AND decision_comment != '' THEN 'Commentaire anonymisé'
    ELSE decision_comment
  END;

-- feasibility_decision
UPDATE feasibility_decision
SET
  decision_comment = CASE
    WHEN decision_comment IS NOT NULL AND decision_comment != '' THEN 'Commentaire anonymisé'
    ELSE decision_comment
  END;

-- file
UPDATE file
SET
  name = CASE
    WHEN name IS NOT NULL AND name != '' THEN 'fichier-' || LEFT(id::text, 8)
    ELSE name
  END;

-- funding_request
UPDATE funding_request
SET
  other_training = CASE
    WHEN other_training IS NOT NULL AND other_training != '' THEN 'Formation anonymisée'
    ELSE other_training
  END,
  certificate_skills = CASE
    WHEN certificate_skills IS NOT NULL AND certificate_skills != '' THEN 'Compétences anonymisées'
    ELSE certificate_skills
  END;

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
  candidate_firstname = CASE
    WHEN candidate_firstname IS NOT NULL AND candidate_firstname != '' THEN 'Prénom-' || LEFT(id::text, 8)
    ELSE candidate_firstname
  END,
  candidate_secondname = CASE
    WHEN candidate_secondname IS NOT NULL AND candidate_secondname != '' THEN 'Prénom2-' || LEFT(id::text, 8)
    ELSE candidate_secondname
  END,
  candidate_thirdname = CASE
    WHEN candidate_thirdname IS NOT NULL AND candidate_thirdname != '' THEN 'Prénom3-' || LEFT(id::text, 8)
    ELSE candidate_thirdname
  END,
  candidate_lastname = CASE
    WHEN candidate_lastname IS NOT NULL AND candidate_lastname != '' THEN 'Nom-' || LEFT(id::text, 8)
    ELSE candidate_lastname
  END,
  certificate_skills = CASE
    WHEN certificate_skills IS NOT NULL AND certificate_skills != '' THEN 'Compétences anonymisées'
    ELSE certificate_skills
  END,
  other_training = CASE
    WHEN other_training IS NOT NULL AND other_training != '' THEN 'Formation anonymisée'
    ELSE other_training
  END,
  funding_contact_firstname = CASE
    WHEN funding_contact_firstname IS NOT NULL AND funding_contact_firstname != '' THEN 'Prénom-' || LEFT(id::text, 8)
    ELSE funding_contact_firstname
  END,
  funding_contact_lastname = CASE
    WHEN funding_contact_lastname IS NOT NULL AND funding_contact_lastname != '' THEN 'Nom-' || LEFT(id::text, 8)
    ELSE funding_contact_lastname
  END,
  funding_contact_email = CASE
    WHEN funding_contact_email IS NOT NULL AND funding_contact_email != '' THEN 'contact-' || id || '@anon.invalid'
    ELSE funding_contact_email
  END,
  funding_contact_phone = CASE
    WHEN funding_contact_phone IS NOT NULL AND funding_contact_phone != '' THEN '0101010101'
    ELSE funding_contact_phone
  END;

-- jury
UPDATE jury
SET
  address_of_session = CASE
    WHEN address_of_session IS NOT NULL AND address_of_session != '' THEN 'Adresse-' || LEFT(id::text, 8)
    ELSE address_of_session
  END,
  information_of_session = CASE
    WHEN information_of_session IS NOT NULL AND information_of_session != '' THEN 'Information anonymisée'
    ELSE information_of_session
  END,
  information_of_result = CASE
    WHEN information_of_result IS NOT NULL AND information_of_result != '' THEN 'Information anonymisée'
    ELSE information_of_result
  END;

-- payment_request
UPDATE payment_request
SET
  invoice_number = CASE
    WHEN invoice_number IS NOT NULL AND invoice_number != '' THEN 'Facture-' || LEFT(id::text, 8)
    ELSE invoice_number
  END;

-- payment_request_batch (content embeds the invoice number as NumFacture, among other data)
UPDATE payment_request_batch
SET
  content = '{}'::jsonb;

-- payment_request_unifvae
UPDATE payment_request_unifvae
SET
  invoice_number = CASE
    WHEN invoice_number IS NOT NULL AND invoice_number != '' THEN 'Facture-' || LEFT(id::text, 8)
    ELSE invoice_number
  END;

-- payment_request_batch_unifvae (content embeds the invoice number as NumFacture, among other data)
UPDATE payment_request_batch_unifvae
SET
  content = '{}'::jsonb;

-- maison_mere_aap
UPDATE maison_mere_aap
SET
  manager_firstname = CASE
    WHEN manager_firstname IS NOT NULL AND manager_firstname != '' THEN 'Prénom-' || LEFT(id::text, 8)
    ELSE manager_firstname
  END,
  manager_lastname = CASE
    WHEN manager_lastname IS NOT NULL AND manager_lastname != '' THEN 'Nom-' || LEFT(id::text, 8)
    ELSE manager_lastname
  END,
  phone = CASE
    WHEN phone IS NOT NULL AND phone != '' THEN '0101010101'
    ELSE phone
  END,
  site_web = CASE
    WHEN site_web IS NOT NULL AND site_web != '' THEN 'https://site-anonymise-' || LEFT(id::text, 8) || '.invalid'
    ELSE site_web
  END;

-- maison_mere_aap_legal_information_documents
UPDATE maison_mere_aap_legal_information_documents
SET
  manager_firstname = CASE
    WHEN manager_firstname IS NOT NULL AND manager_firstname != '' THEN 'Prénom-' || LEFT(id::text, 8)
    ELSE manager_firstname
  END,
  manager_lastname = CASE
    WHEN manager_lastname IS NOT NULL AND manager_lastname != '' THEN 'Nom-' || LEFT(id::text, 8)
    ELSE manager_lastname
  END,
  gestionnaire_firstname = CASE
    WHEN gestionnaire_firstname IS NOT NULL AND gestionnaire_firstname != '' THEN 'Prénom-' || LEFT(id::text, 8)
    ELSE gestionnaire_firstname
  END,
  gestionnaire_lastname = CASE
    WHEN gestionnaire_lastname IS NOT NULL AND gestionnaire_lastname != '' THEN 'Nom-' || LEFT(id::text, 8)
    ELSE gestionnaire_lastname
  END,
  gestionnaire_email = CASE
    WHEN gestionnaire_email IS NOT NULL AND gestionnaire_email != '' THEN 'gestionnaire-' || id || '@anon.invalid'
    ELSE gestionnaire_email
  END,
  phone = CASE
    WHEN phone IS NOT NULL AND phone != '' THEN '0101010101'
    ELSE phone
  END;

-- maison_mere_aap_legal_information_documents_decision
UPDATE maison_mere_aap_legal_information_documents_decision
SET
  internal_comment = CASE
    WHEN internal_comment IS NOT NULL AND internal_comment != '' THEN 'Commentaire interne anonymisé'
    ELSE internal_comment
  END,
  aap_comment = CASE
    WHEN aap_comment IS NOT NULL AND aap_comment != '' THEN 'Commentaire anonymisé'
    ELSE aap_comment
  END;

-- organism (administrative/public contact info and address)
UPDATE organism
SET
  contact_administrative_email = CASE
    WHEN contact_administrative_email IS NOT NULL AND contact_administrative_email != '' THEN 'organism-' || id || '@anon.invalid'
    ELSE contact_administrative_email
  END,
  contact_administrative_phone = CASE
    WHEN contact_administrative_phone IS NOT NULL AND contact_administrative_phone != '' THEN '0101010101'
    ELSE contact_administrative_phone
  END,
  telephone = CASE
    WHEN telephone IS NOT NULL AND telephone != '' THEN '0101010101'
    ELSE telephone
  END,
  email_contact = CASE
    WHEN email_contact IS NOT NULL AND email_contact != '' THEN 'contact-' || id || '@anon.invalid'
    ELSE email_contact
  END,
  website = CASE
    WHEN website IS NOT NULL AND website != '' THEN 'https://site-anonymise-' || LEFT(id::text, 8) || '.invalid'
    ELSE website
  END,
  site_internet = CASE
    WHEN site_internet IS NOT NULL AND site_internet != '' THEN 'https://site-anonymise-' || LEFT(id::text, 8) || '.invalid'
    ELSE site_internet
  END,
  ll_to_earth = NULL,
  nom_public = CASE
    WHEN nom_public IS NOT NULL AND nom_public != '' THEN 'Organisme-' || LEFT(id::text, 8)
    ELSE nom_public
  END,
  adresse_numero_et_nom_de_rue = CASE
    WHEN adresse_numero_et_nom_de_rue IS NOT NULL AND adresse_numero_et_nom_de_rue != '' THEN 'Rue-' || LEFT(id::text, 8)
    ELSE adresse_numero_et_nom_de_rue
  END,
  adresse_informations_complementaires = CASE
    WHEN adresse_informations_complementaires IS NOT NULL AND adresse_informations_complementaires != '' THEN 'Complément-' || LEFT(id::text, 8)
    ELSE adresse_informations_complementaires
  END,
  adresse_code_postal = CASE
    WHEN adresse_code_postal IS NOT NULL AND adresse_code_postal != '' THEN '00000'
    ELSE adresse_code_postal
  END,
  adresse_ville = CASE
    WHEN adresse_ville IS NOT NULL AND adresse_ville != '' THEN 'Ville-' || LEFT(id::text, 8)
    ELSE adresse_ville
  END;

-- subscription_request (à purger)
TRUNCATE subscription_request;

-- account_email_otp (à purger)
TRUNCATE account_email_otp;

-- certification_additional_info (expert contact details identify an individual)
UPDATE certification_additional_info
SET
  certification_expert_contact_details = CASE
    WHEN certification_expert_contact_details IS NOT NULL AND certification_expert_contact_details != '' THEN 'Contact-' || LEFT(id::text, 8)
    ELSE certification_expert_contact_details
  END,
  certification_expert_contact_phone = CASE
    WHEN certification_expert_contact_phone IS NOT NULL AND certification_expert_contact_phone != '' THEN '0101010101'
    ELSE certification_expert_contact_phone
  END,
  certification_expert_contact_email = CASE
    WHEN certification_expert_contact_email IS NOT NULL AND certification_expert_contact_email != '' THEN 'expert-' || id || '@anon.invalid'
    ELSE certification_expert_contact_email
  END,
  comments_for_aap = CASE
    WHEN comments_for_aap IS NOT NULL AND comments_for_aap != '' THEN 'Commentaire anonymisé'
    ELSE comments_for_aap
  END;

-- amenagement_specifique (justification may contain health/disability-related information)
UPDATE amenagement_specifique
SET
  justification_description = CASE
    WHEN justification_description IS NOT NULL AND justification_description != '' THEN 'Justification anonymisée'
    ELSE justification_description
  END;

-- candidacy_on_candidacy_financing_method
UPDATE candidacy_on_candidacy_financing_method
SET
  additional_information = CASE
    WHEN additional_information IS NOT NULL AND additional_information != '' THEN 'Information anonymisée'
    ELSE additional_information
  END;

COMMIT;
