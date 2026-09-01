import type { NextConfig } from "next";

const config: NextConfig = {
  // Workspace packages ship TypeScript source rather than build output.
  transpilePackages: ["@rc/shared", "@rc/rubric", "@rc/sources", "@rc/engine"],

  webpack: (config) => {
    /*
     * The packages import each other with `./model.js` specifiers, as
     * TypeScript's ESM output requires, while the files on disk are `.ts`.
     * tsx and vitest resolve that themselves; webpack needs telling.
     *
     * This only became load-bearing when apps/web started importing runtime
     * code from @rc/engine - before that it took types only, which the
     * compiler erases before webpack ever sees them.
     */
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default config;
