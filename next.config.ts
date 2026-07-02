import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Keep your "@" alias pointing at /app (if you're using it)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.join(process.cwd(), "app"),
    };

    // Make sure canvas is treated as a server-only dep
    config.externals = config.externals || [];
    config.externals.push({
      canvas: "canvas",
    });

    return config;
  },
};

export default nextConfig;
