-- Anonymization script for Metabase

BEGIN;

TRUNCATE core_session, login_history, mcp_query_handle;

TRUNCATE audit_log;

TRUNCATE metabase_fieldvalues;

TRUNCATE query;

TRUNCATE query_cache;

TRUNCATE field_usage, query_execution;

-- le suffix peut varier en fonction du dump;
TRUNCATE search_index__uwhwiilz83ho6_efzjw8i;

-- le suffix peut varier en fonction du dump;
TRUNCATE search_index__i3kk6jvcwootxq0nikfr6;

-- auth_identity
UPDATE auth_identity
SET
  provider_id = 'email_id_' || user_id || '@fvae.fr',
  credentials = '{"password_hash":"","password_salt":""}';

DELETE FROM auth_identity
WHERE provider != 'password';

-- collection
UPDATE collection
SET
  name = 'Collection ' || id,
  slug = 'collection_' || id
WHERE name ILIKE '%Personal Collection%'
   OR name ILIKE '%Collection personnelle%';

-- core_user
UPDATE core_user
SET
  email = 'email_id_' || id || '@fvae.fr',
  first_name = 'first_name_id_' || id,
  last_name = 'last_name_id_' || id;

UPDATE core_user
SET
  password = 'password'
WHERE password != '' OR email = 'email_id_29@fvae.fr';

-- metabase_database
UPDATE metabase_database
SET
  details = '{"ssl-use-client-auth":false,"ssl":true,"password":"","write-data-connection":false,"destination-database":false,"port":"","admin-connection":false,"advanced-options":false,"schema-filters-type":"all","dbname":"","host":"","tunnel-enabled":false,"user":"","ssl-mode":"require"}'
WHERE name = 'reva_prod_2_3436' OR name = 'ClassifIA';

--native_query_snippet
UPDATE native_query_snippet
SET
  description = 'Liste de 4 IDs recevables et 16 IDs en attente de jurys mis dans le batch de 372 de Prénom Nom. Ils doivent être considérés hors financement alors que les 352 autres restent dans la cohorte unifvae car abandons et recevables avant d être archivés.',
  content = $list$'16da34e7-e524-4791-a931-1d4fa4eee5a1',
'73c1a72d-524f-4203-9f6c-dff89d0af449',
'370d887a-db98-4b77-9ad1-2a0040bb2c4d',
'e16fd914-00b8-4647-b4bf-067e72534826',
'181eafba-1e49-4905-9770-662cdba07af6',
'8cb448c5-49de-44f7-9156-9cfc8b539348',
'e4d77ab8-eabc-47be-b74b-6a903f54f310',
'e2746b80-2d8d-4b17-84e0-9b1fe1d15437',
'af869f75-c6b4-4fb3-9527-7303c46020f0',
'a1661433-1336-4c5f-b7d8-31214bc6c99f',
'57929c94-fe34-4401-949c-c30e227d7220',
'45a1ca92-8aa3-430e-8d81-6919cf6aae48',
'bcf02096-3bc8-4bf7-a307-b80b9a3f4901',
'f41ade4f-8244-4bca-be3a-a2c194d825ac',
'a2971cec-bb09-43f3-aa2b-6d64af2ca0b5',
'0da83aa7-c3b3-42bf-9c32-a4685561f401',
'ad8109b3-8d56-4363-acc3-05f19728de56',
'ecd6cedd-8fac-4d0d-908a-1428680b4808',
'39b53549-f237-4b47-9dbe-8c4ec28fb027',
'c5652a68-44e7-44e1-bd31-a0a9bc294ac8'$list$
WHERE name = 'id_hors_fin_manuel';

-- setting
UPDATE setting
SET
  value = 'password',
  value_with_aad = 'password'
WHERE key = 'email-smtp-password';

UPDATE setting
SET
  value = 'host',
  value_with_aad = 'host'
WHERE key = 'email-smtp-host';

UPDATE setting
SET
  value = 'http://localhost',
  value_with_aad = 'http://localhost'
WHERE key = 'site-url';

UPDATE setting
SET
  value = 'false',
  value_with_aad = 'false'
WHERE key = 'redirect-all-requests-to-https';

UPDATE setting
SET
  value = 'client_id',
  value_with_aad = 'client_id'
WHERE key = 'google-auth-client-id';

UPDATE setting
SET
  value = 'secret_key',
  value_with_aad = 'secret_key'
WHERE key = 'embedding-secret-key';

COMMIT;
