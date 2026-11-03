import path from "path";

import dotenv from "dotenv";

import type { CodegenConfig } from "@graphql-codegen/cli";

dotenv.config({ path: path.join(process.cwd(), "..", "..", ".env") });

const config: CodegenConfig = {
  overwrite: true,
  schema: ["../reva-api/modules/generated-graphql-schema.graphql"],
  documents: ["./routes/**/*.tsx", "./routes/**/*.ts"],
  emitLegacyCommonJSImports: false,
  generates: {
    "./graphql/generated/": {
      preset: "client",
      plugins: [],
      config: {
        enumsAsTypes: true,
        defaultScalarType: "any",
      },
    },
    "./graphql/generated/types.ts": {
      plugins: ["typescript"],
      config: {
        enumsAsTypes: true,
        defaultScalarType: "any",
      },
    },
  },
  config: { scalars: { Timestamp: "number" } },
};

export default config;
