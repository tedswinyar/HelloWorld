import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built bundle works from S3/CloudFront or a subpath.
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2022",
  },
  server: {
    port: 8080,
  },
});
