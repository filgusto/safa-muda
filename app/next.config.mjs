/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",

    // ESLint is run separately via `npm run lint` (Phase 1 validation).
    // Skipping it here prevents any lint warning from blocking a production build.
    eslint: { ignoreDuringBuilds: true },

    // CSP headers — mirrors the Traefik middleware policy in docker-compose.prod.yml
    // so violations surface in dev instead of only in production.
    async headers() {
        // O upload é feito pelo navegador direto no MinIO, num host diferente
        // do da aplicação — sem liberar essa origem, o CSP bloqueia o PUT.
        // Ver app/lib/storage.ts.
        const s3Origin = process.env.S3_PUBLIC_ENDPOINT
            ? new URL(process.env.S3_PUBLIC_ENDPOINT).origin
            : ''

        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data:",
            `connect-src 'self' ${s3Origin}`.trim(),
            "worker-src blob:",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; ')

        return [
            {
                source: '/(.*)',
                headers: [{ key: 'Content-Security-Policy', value: csp }],
            },
        ]
    },

    // O catálogo morava em /catalogo. Notificações já gravadas no banco e
    // favoritos antigos ainda apontam para lá.
    async redirects() {
        return [
            { source: '/catalogo', destination: '/safdex', permanent: true },
            { source: '/catalogo/:path*', destination: '/safdex/:path*', permanent: true },
        ]
    },

    // Proxy /media/* → MinIO so media URLs work in dev and production.
    // Traefik passes all traffic through to the web service, so Next.js
    // handles this rewrite directly in production.
    async rewrites() {
        const s3Endpoint = process.env.S3_ENDPOINT || 'http://minio:9000'
        const s3Bucket = process.env.S3_BUCKET || 'safa-muda-media'
        return [
            {
                source: '/media/:path*',
                destination: `${s3Endpoint}/${s3Bucket}/:path*`,
            },
        ]
    },
};

export default nextConfig;
