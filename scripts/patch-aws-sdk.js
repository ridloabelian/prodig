import fs from "fs";
import path from "path";

const basePath = path.join("node_modules", "@aws-sdk", "client-s3", "dist-es");
const src = path.join(basePath, "runtimeConfig.browser.js");
const dest = path.join(basePath, "runtimeConfig.js");

try {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log("Successfully patched AWS SDK S3 client config for Cloudflare Workers compatibility.");
  } else {
    console.warn("AWS SDK S3 client config files not found inside node_modules. Skipping patch.");
  }
} catch (error) {
  console.error("Failed to patch AWS SDK S3 client config:", error);
}
