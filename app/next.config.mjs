/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",

    // ESLint is run separately via `npm run lint` (Phase 1 validation).
    // Skipping it here prevents any lint warning from blocking a production build.
    eslint: { ignoreDuringBuilds: true },

    // CSP só em desenvolvimento. Em produção a política vem do Traefik
    // (docker-compose.prod.yml) — duas políticas se somam por interseção no
    // navegador, e a do Next não conhece o host público do S3 em tempo de build,
    // o que bloquearia o upload de fotos.
    async headers() {
        if (process.env.NODE_ENV === 'production') return []

        // O upload é feito pelo navegador direto no Garage, num host diferente
        // do da aplicação — sem liberar essa origem, o CSP bloqueia o PUT.
        // Ver app/lib/storage.ts.
        const s3Origin = process.env.S3_PUBLIC_ENDPOINT
            ? new URL(process.env.S3_PUBLIC_ENDPOINT).origin
            : ''

        // Imagens de fora que a interface exibe: os tiles do mapa de fundo
        // (lib/tiles.ts) e a prévia de importação do Wikimedia Commons.
        // Mantenha em sincronia com o CSP de produção, em
        // docker-compose.prod.yml.
        const origensDeImagem = [
            'https://tile.openstreetmap.org',
            'https://upload.wikimedia.org',
        ]
        try {
            if (process.env.NEXT_PUBLIC_SATELLITE_TILE_URL) {
                origensDeImagem.push(
                    new URL(process.env.NEXT_PUBLIC_SATELLITE_TILE_URL).origin,
                )
            }
        } catch {
            // URL de satélite inválida: o mapa só não mostra essa camada.
        }

        const csp = [
            "default-src 'self'",
            // challenges.cloudflare.com: desafio anti-robô do cadastro
            // (Turnstile), que carrega um script e abre um iframe de lá.
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://challenges.cloudflare.com",
            "frame-src https://challenges.cloudflare.com",
            "style-src 'self' 'unsafe-inline'",
            `img-src 'self' data: blob: ${origensDeImagem.join(' ')}`,
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

};

export default nextConfig;
