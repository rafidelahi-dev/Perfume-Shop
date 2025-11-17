// next.config.mjs
/** @type {import('next').NextConfig} */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

// Build remotePatterns array
const remotePatterns = [];

if (supabaseHostname) {
  remotePatterns.push({
    protocol: "https",
    hostname: supabaseHostname,
    pathname: "/storage/v1/object/public/**",
  });
}

// Add Google avatar host
remotePatterns.push({
  protocol: "https",
  hostname: "lh3.googleusercontent.com",
  pathname: "/**",
});

// Add Facebook avatar host
remotePatterns.push({
  protocol: "https",
  hostname: "platform-lookaside.fbsbx.com",
  pathname: "/**",
});

const nextConfig = {
  images: {
    remotePatterns,
  },
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js"],
  },
};

export default nextConfig;
