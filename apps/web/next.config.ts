import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@tidemeter/ui", "@tidemeter/analytics"],
  serverExternalPackages: [
    "@clickhouse/client",
    "postgres",
    "clickhouse-migrations",
  ],
};

export default withPayload(nextConfig);
