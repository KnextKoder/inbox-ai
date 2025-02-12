import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{
      protocol: "https",
      hostname: "github.com",
      port: "",
    }
  ],
  },
};

export default nextConfig;
