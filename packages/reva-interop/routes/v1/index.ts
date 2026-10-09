import { readFileSync } from "fs";

import formBody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import fastifySwagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";

import { ERROR_UNAUTHORIZED } from "../../utils/errors.js";

import authRoutesApiV1 from "./auth/routes.js";
import { validateJwt } from "./authMiddleware.js";
import candidacyRoutesApiV1 from "./candidacy/routes.js";
import dossierValidationRoutesApiV1 from "./dossierValidation/routes.js";
import feasibilityRoutesApiV1 from "./feasibility/routes.js";
import { addInputSchemas } from "./inputSchemas.js";
import juryRoutesApiV1 from "./jury/routes.js";
import { addResponseSchemas } from "./responseSchemas.js";
import { addSchemas } from "./schemas.js";

declare module "openapi-types" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace OpenAPIV3 {
    interface InfoObject {
      "x-logo"?: {
        url: string;
        altText?: string;
      };
    }
  }
}

declare module "fastify" {
  interface FastifyReply {
    keycloakId: string;
  }
}

const logo = readFileSync("./static/fvae_logo.svg");

const routesApiV1: FastifyPluginAsyncJsonSchemaToTs = async (fastify) => {
  const security: Array<{ [key: string]: string[] }> = [
    {
      bearerAuth: [],
    },
  ];
  const securitySchemes: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  } = {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description:
        "Votre jeton d'authentification doit être placé dans le header 'Authorization: Bearer VOTRE_JWT'.",
    },
  };

  if (
    process.env.ENVIRONMENT !== "production" &&
    process.env.ENVIRONMENT !== "sandbox" &&
    process.env.ENVIRONMENT !== "preprod"
  ) {
    security.push({
      oauth: [],
    });
    securitySchemes["oauth"] = {
      type: "oauth2",
      flows: {
        authorizationCode: {
          authorizationUrl: `${process.env.KEYCLOAK_ADMIN_URL}/realms/${process.env.KEYCLOAK_REVA_ADMIN_REALM}/protocol/openid-connect/auth`,
          tokenUrl: "/interop/v1/documentation/openid-connect/token",
          scopes: {
            openid: "openid",
            profile: "profile",
            roles: "roles",
          },
        },
      },
    };
  }

  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: `API d'intéropérabilité France VAE (${process.env.ENVIRONMENT})`,
        summary:
          "API d'intéropérabilité de la plateforme France VAE à destination des certificateurs",
        version: "1.0.0",
        "x-logo": {
          url: "https://vae.gouv.fr/fvae_logo.svg",
          altText: "Logo France VAE",
        },
      },
      externalDocs: {
        url: "https://francevae.notion.site/Documentation-API-interop-rabilit-France-VAE-2ea100b69ece81e4adfbc0eeeaafa64d?source=copy_link",
        description: "Guide de démarrage",
      },
      servers: [
        {
          url: `${process.env.BASE_URL}`,
          description: `${process.env.ENVIRONMENT?.toUpperCase()} server`,
        },
      ],
      tags: [
        process.env.ENVIRONMENT !== "sandbox" &&
        process.env.ENVIRONMENT !== "production" &&
        process.env.ENVIRONMENT !== "preprod"
          ? {
              name: "Authentification",
              description: "Gestion de l'authentification et des utilisateurs",
              externalDocs: {
                url: "https://github.com/betagouv/reva/tree/master/packages/reva-interop/routes/v1/auth",
                description: "Comment utiliser ces routes",
              },
            }
          : undefined,
        {
          name: "Candidature",
          description: "Gestion des candidatures",
        },
        {
          name: "Dossier de faisabilité",
          description: "Gestion des dossiers de faisabilité",
        },
        {
          name: "Dossier de validation",
          description: "Gestion des dossiers de validation",
        },
        {
          name: "Informations jury",
          description: "Gestion de la session et des résultats liés au jury",
        },
      ].filter((t) => typeof t !== "undefined"),
      security,
      components: {
        securitySchemes,
      },
    },
  });

  await fastify.register(swaggerUi, {
    initOAuth: {
      clientId: process.env.OAUTH_CLIENT_ID,
      realm: "reva",
      scopes: "openid profile roles",
    },
    logo: {
      type: `image/svg+xml`,
      content: Buffer.from(logo),
      href: "/interop/v1/documentation",
    },
    theme: {
      css: [
        {
          filename: "custom.css",
          content:
            ".swagger-ui .topbar { background-color: #fff !important; img { height: 80px } }",
        },
      ],
    },
    indexPrefix: "/interop/v1",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
      defaultModelsExpandDepth: 0,
    },
  });

  fastify.register(formBody);
  fastify.register(multipart, {
    attachFieldsToBody: true,
    limits: { fileSize: 1024 * 1024 * 10 }, // 10MB
  });

  addSchemas(fastify);
  addInputSchemas(fastify);
  addResponseSchemas(fastify);

  const securePathes = [
    "candidatures",
    "dossiersDeFaisabilite",
    "dossiersDeValidation",
    "informationsJury",
    "auth/createAccount",
  ];

  // Validate JWT for pathes :
  // /candidatures
  // /dossiersDeFaisabilite
  // /dossiersDeValidation
  // /informationsJury
  fastify.decorateRequest("graphqlClient");
  fastify.decorateRequest("keycloakId");
  fastify.addHook("onRequest", (request) => validateJwt(securePathes, request));

  fastify.decorateReply("keycloakId");
  fastify.addHook("onResponse", async (request, reply) => {
    reply.keycloakId = request.keycloakId;
  });

  type HandlerError = Error & {
    code?: string;
    graphQLErrors?: Array<{ message: string }>;
  };

  // Handle errors for pathes :
  // /candidatures
  // /dossiersDeFaisabilite
  // /dossiersDeValidation
  // /informationsJury
  fastify.setErrorHandler((error: HandlerError, request, reply) => {
    const isSecurePath = securePathes.some((path) =>
      request.url.startsWith(`/interop/v1/${path}`),
    );

    request.log.error(error);

    if (!isSecurePath) {
      reply.send(error);
      return;
    }

    if (error.message == ERROR_UNAUTHORIZED) {
      reply.status(401).send();
      return;
    }

    // It means it's FastifyError
    if (Object.hasOwn(error, "code")) {
      reply.status(500).send(error);
      return;
    }

    // Try parse reva gql api errors
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (error as any).graphQLErrors[0].message;
      reply.status(409).send({ statusCode: 409, error: message });
      return;
    } catch (error) {
      console.log(error);
    }

    // Manual throw new Error("something went wrong")
    if (error?.message) {
      reply.status(409).send({ statusCode: 409, error: error.message });
      return;
    }

    reply.status(500).send({ statusCode: 500, error: "Internal Server Error" });
  });
  fastify.register(authRoutesApiV1);
  fastify.register(candidacyRoutesApiV1);
  fastify.register(feasibilityRoutesApiV1);
  fastify.register(dossierValidationRoutesApiV1);
  fastify.register(juryRoutesApiV1);

  fastify.get("/docs", { schema: { hide: true } }, async (_request, reply) => {
    reply.type("text/html");
    return `<!DOCTYPE html>
<html>
  <head>
    <title>Documentation API intéropérabilité France VAE</title>
    <!-- needed for adaptive design -->
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">

    <!--
    Redoc doesn't change outer page styles
    -->
    <style>
      body {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <redoc spec-url='${process.env.BASE_URL}/interop/v1/documentation/json' download-file-name="France-VAE-API-Interop-v1.json" schema-expansion-level="1" json-sample-expand-level="3" hide-schema-titles></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"> </script>
  </body>
</html>`;
  });
};

export default routesApiV1;
