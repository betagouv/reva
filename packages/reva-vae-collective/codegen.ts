import path from "path";

import dotenv from "dotenv";

import type { CodegenConfig } from "@graphql-codegen/cli";

dotenv.config({ path: path.join(process.cwd(), "..", "..", ".env") });

const config: CodegenConfig = {
  overwrite: true,
  schema: ["../reva-api/modules/generated-graphql-schema.graphql"],
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
  },
  config: { scalars: { Timestamp: "number" } },
};

// eslint-disable-next-line import/no-unused-modules
export default config;
