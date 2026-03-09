import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "cd ../backend-express && npx ts-node src/index.ts",
      port: 4010,
      timeout: 15000,
      reuseExistingServer: true,
    },
    {
      command: "npm run dev",
      port: 3000,
      timeout: 30000,
      reuseExistingServer: true,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
