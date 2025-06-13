import { execSync } from "node:child_process";
import { resolve } from "node:path";

execSync(`"${process.execPath}" index.js`, {
  cwd: resolve("build"),
  stdio: "inherit",
  env: {
    ...process.env,
    WEBHOOK_ENCRYPTED_SECRET:
      "59b59363e172f9ac076f1b7eb9e47fe6:f6a1dd8d90a1b227e364aa68145e795d8e6124d3eda421c24d846b01caca4ba3",
    WEBHOOK_PRIVATE_KEY: "sj6qQxZdaUgtC1rK",
    LUST_CONFIG_DOMAIN: "https://lustcdn.ru"
  }
});
