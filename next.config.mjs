/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Note: `eslint`, `serverRuntimeConfig` and top-level `api` config are
  // not supported in Next 16. If you need large bodyParser limits for API
  // routes, configure them per-route by exporting `export const config = { api: { bodyParser: { sizeLimit: '5gb' } } }` in the
  // specific route file (e.g. in `app/api/.../route.ts`).
}

export default nextConfig
