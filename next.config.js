/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable static image imports (like CRA's import syntax)
    images: {
        disableStaticImages: false,
    },
    // Preserve CRA-style environment variable behavior
    env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
};

module.exports = nextConfig;
