import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // `apps/*` as well as `packages/*`. A pattern covering only packages means a
    // test written beside web code is collected by nothing and passes by default.
    include: ["packages/*/src/**/*.test.ts", "apps/*/src/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
