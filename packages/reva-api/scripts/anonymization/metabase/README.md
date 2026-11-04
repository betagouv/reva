# Anonymization metabase

### Monter un environnment metabase en local

Remonter un environnement docker avec le dump de la db metabase concerné

Utiliser le docker compose si besoin pour remonter l’environnement. Attention, d’abord monter la db, puis restaurer le backup, docker compose up avec metabase pour finaliser.

Se connecter au container docker pour retirer la clé d'encryption

```bash
docker exec -it metabase bash
```

Aller au répertoire suivant

```bash
cd /app
```

Utiliser la commande suivante (voir doc https://www.metabase.com/docs/latest/databases/encrypting-details-at-rest#disabling-an-encryption-key)

```bash
MB_ENCRYPTION_SECRET_KEY="your-current-key" java --add-opens java.base/java.nio=ALL-UNNAMED -jar metabase.jar rotate-encryption-key ""
```

La db n'utilise désormais plus de clé d'encryption

### Anonymiser les données

Utiliser le script `anonymise.sql`

### (Optionel) Finaliser la configuration de l'env local

Accessible via localhost:3010 si copier / coller du docker compose.

username / password d’un compte admin fonctionnelle:

email_id_29@fvae.fr

MotDePasse12345\*

Dans la table setting il faut faire attention aux deux clés qui doivent bien correspondre à l’hostname sur laquelle sera accessible metabase:

redirect-all-requests-to-https

site-url
