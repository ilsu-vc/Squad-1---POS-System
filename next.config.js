/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable static image imports (like CRA's import syntax)
    images: {
        disableStaticImages: false,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Preserve CRA-style environment variable behavior
    env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
    },
    // Microservice URLs — read by Next.js API gateway routes (server-side only)
    serverRuntimeConfig: {
        AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
        INVENTORY_SERVICE_URL: process.env.INVENTORY_SERVICE_URL || 'http://localhost:4002',
        SALES_SERVICE_URL: process.env.SALES_SERVICE_URL || 'http://localhost:4003',
        REPORTING_SERVICE_URL: process.env.REPORTING_SERVICE_URL || 'http://localhost:4004',
        ROLE_SERVICE_URL: process.env.ROLE_SERVICE_URL || 'http://localhost:4005',
        RECEIPT_SERVICE_URL: process.env.RECEIPT_SERVICE_URL || 'http://localhost:4006',
        TRANSACTION_SERVICE_URL: process.env.TRANSACTION_SERVICE_URL || 'http://localhost:4007',
    },
};

module.exports = nextConfig;
