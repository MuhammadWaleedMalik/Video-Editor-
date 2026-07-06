/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },

  webpack: (config, { isServer }) => {
    // Ignore native .node binary files — treat them as empty asset modules
    config.module.rules.push({
      test: /\.node$/,
      type: 'asset/resource',
    });

    // Provide empty fallbacks for Node.js built-ins on client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        vm: false,
      };
    }

    // Alias onnxruntime-node to false everywhere to prevent bundling native binaries
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node': false,
    };

    // On server side, alias @huggingface/transformers to false to prevent compiling/bundling its native dependencies
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@huggingface/transformers': false,
      };
    }

    return config;
  },

  // Exclude heavy native packages from server component bundling
  experimental: {
    serverComponentsExternalPackages: ['@huggingface/transformers', 'onnxruntime-node'],
  },
};

module.exports = nextConfig;
