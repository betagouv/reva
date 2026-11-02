import path from "path";

import { CodegenConfig } from "@graphql-codegen/cli";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), "..", "..", ".env") });

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    "../reva-api/modules/generated-graphql-schema.graphql",
    process.env.NEXT_PUBLIC_WEBSITE_STRAPI_BASE_URL + "/graphql" ||
      "http://localhost:1337/graphql",
  ],
  documents: ["src/**/*.tsx", "src/**/*.ts"],
  ignoreNoDocuments: true, // for better experience with the watcher
  generates: {
    "./src/graphql/generated/": {
      preset: "client",
      plugins: [],
      config: {
        enumsAsTypes: true,
        defaultScalarType: "any",
      },
    },
  },
  config: { scalars: { Timestamp: "Date" } },
};

export default config;
