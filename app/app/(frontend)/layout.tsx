import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Footer } from "@/components/layout/footer";
import { SiteNav } from "@/components/layout/SiteNav";
import { NavProvider } from "@/components/layout/NavContext";
import { MenuDoUsuario } from "@/components/layout/MenuDoUsuario";
import { ID_CONTEUDO_DO_SITE } from "@/components/layout/conteudoDoSite";
import { AvisoNoTopo } from "@/components/layout/AvisoNoTopo";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const DESCRICAO =
  "Sistema integrado de planejamento e gestão agroflorestal: catálogo de espécies, planejamento no tempo e no espaço, e diário de campo.";

export const metadata: Metadata = {
  title: "Safa Muda",
  description: DESCRICAO,
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
  },
  openGraph: {
    title: "Safa Muda",
    description: DESCRICAO,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${fraunces.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <NavProvider>
            {/*
              `data-desfocado` é ligado pelo modal da ficha. Desfocar o conteúdo
              custa uma rasterização; desfocar o fundo pelo overlay custa uma por
              quadro. Ver o comentário em `ModalDaEspecie`.
            */}
            <div
              id={ID_CONTEUDO_DO_SITE}
              className="flex flex-1 flex-col data-[desfocado=true]:blur-md"
            >
              <SiteNav menu={<MenuDoUsuario />} />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <AvisoNoTopo />
          </NavProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
