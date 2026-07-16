import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@credicel/domain", "@credicel/validation"],
  experimental: {
    serverActions: {
      bodySizeLimit: "32mb",
    },
  },
};

export default config;
