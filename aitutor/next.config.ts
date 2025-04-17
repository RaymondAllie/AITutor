import type { NextConfig } from "next";
import type { Configuration } from 'webpack';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  webpack: (config: Configuration) => {
    config.module.rules.push({
      test: /\.pdf$/,
      type: 'asset/resource'
    });
    return config;
  }
};

export default nextConfig;
