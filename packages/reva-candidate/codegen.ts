import path from "path";

import dotenv from "dotenv";

import type { CodegenConfig } from "@graphql-codegen/cli";

dotenv.config({ path: path.join(process.cwd(), "..", "..", ".env") });

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    "../reva-api/modules/generated-graphql-schema.graphql",
    process.env.NEXT_PUBLIC_WEBSITE_STRAPI_BASE_URL + "/graphql" ||
      "http://localhost:1337/graphql",
  ],
  documents: ["src/**/*.tsx", "src/**/*.ts"],
  generates: {
    "src/graphql/generated/": {
      preset: "client",
      plugins: [],
      config: {
        enumsAsTypes: true,
        defaultScalarType: "any",
      },
    },
    "src/graphql/generated/types.ts": {
      plugins: ["typescript"],
      config: {
        enumsAsTypes: true,
        defaultScalarType: "any",
      },
    },
  },
  config: {
    scalars: { Timestamp: "number", Date: "string", DateTimeISO: "string" },
  },
};

export default config;
