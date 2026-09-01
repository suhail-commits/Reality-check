import type { NextConfig } from "next";

const config: NextConfig = {
  // Workspace packages ship TypeScript source rather than build output.
  transpilePackages: ["@rc/shared", "@rc/rubric"],
};

export default config;
