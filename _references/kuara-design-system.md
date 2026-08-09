# Kuara Design System

A portable reference of the design directives, tokens, and component conventions used by the
Kuara website, written so another Next.js/Tailwind application can reproduce the same look
and feel from scratch.

Source of truth in the original repo:
- `app/tailwind.config.ts` — palette, type scale, keyframes
- `app/app/(frontend)/globals.css` — CSS variables, base layer, prose/print overrides
- `app/components/ui/*` — Shadcn primitives (New York style)
- `app/components/layout/*`, `app/components/home/*` — composition patterns

---

## 1. Design Directives (the "why")

The visual language is **organic-technical**: a living forest rendered through instrumentation.
Every decision below serves one of these five directives.

1. **Dark is the home state.** The product ships dark-first; light mode is a supported
   alternative, not the baseline. Dark backgrounds are near-black *greens*, never neutral grey.
2. **Green means life, cyan means data.** Primary green (`#3FAF5C`) marks anything living,
   active, or affirmative. Secondary cyan (`#2FA8B8`) marks sensors, links, measurements,
   references — anything that points elsewhere or reports a value.
3. **Restraint over decoration.** No drop shadows for depth, no gradients on surfaces. Depth
   comes from *layered background values* (`base → surface1 → surface2`) and 1px borders.
   The only glow is green, and only on hover/focus/active states.
4. **Motion is breath, not spectacle.** Animations are slow (30–35s ambient) or short
   (240–320ms interactions). Nothing bounces. Everything uses `cubic-bezier(0.4, 0, 0.2, 1)`.
5. **Typography carries the hierarchy.** Serif (Fraunces) for identity and top-level titles,
   sans (IBM Plex Sans) for structure and body, mono (IBM Plex Mono) for anything numeric,
   technical, or label-like. Mono + uppercase + wide tracking is the house "eyebrow" style.

---

## 2. Color

### 2.1 Raw palette (Tailwind `theme.extend.colors`)

```ts
colors: {
  // Background layers – dark mode
  bg: {
    base:     "#0B1411",  // page background
    surface1: "#11201A",  // cards, nav, raised panels
    surface2: "#162A22",  // nested surfaces / hover fills
    border:   "#1F3A30",  // hairlines
  },
  // Background layers – light mode
  light: {
    bg:      "#F2F5F1",
    surface: "#E6ECE7",
    border:  "#CFD8D2",
  },
  // Primary – "Vida" (life)
  primary: {
    DEFAULT:    "#3FAF5C",
    hover:      "#2F8C49",
    glow:       "rgba(63,175,92,0.25)",
    foreground: "#0B1411",
  },
  // Secondary – "Sensores e Dados" (sensors & data)
  secondary: {
    DEFAULT:    "#2FA8B8",
    deep:       "#1F6E78",
    soft:       "#7FD3DD",
    foreground: "#0B1411",
  },
  // Accent – "Inteligência Orgânica" (organic intelligence)
  accent: {
    DEFAULT:    "#5B7F6E",
    deep:       "#3F5C4F",
    light:      "#8AAFA0",
    foreground: "#F2F5F1",
  },
  // Natural support tones (sparingly: illustrations, tags, chart series)
  sand:    "#C9BFA3",
  clay:    "#A56E4A",
  organic: "#4F5A55",
}
```

### 2.2 Semantic tokens (CSS variables, HSL triplets)

**Important inversion:** unlike stock Shadcn, **dark mode lives on `:root`** and light mode is
opted into with a `.light` class. `next-themes` is configured with
`attribute="class" defaultTheme="dark" enableSystem={false}`.

```css
@layer base {
  /* ─── Dark Mode (default) ─── */
  :root {
    --background: 160 30% 6%;    /* #0B1411 */
    --foreground: 120 15% 92%;
    --card: 160 28% 9%;          /* #11201A */
    --card-foreground: 120 15% 90%;
    --popover: 160 28% 9%;
    --popover-foreground: 120 15% 90%;
    --primary: 137 48% 46%;      /* #3FAF5C */
    --primary-foreground: 160 30% 6%;
    --secondary: 188 60% 45%;    /* #2FA8B8 */
    --secondary-foreground: 160 30% 6%;
    --muted: 160 22% 14%;
    --muted-foreground: 160 14% 58%;
    --accent: 155 18% 42%;       /* #5B7F6E */
    --accent-foreground: 120 15% 92%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 120 15% 92%;
    --border: 160 32% 17%;       /* #1F3A30 */
    --input: 160 28% 14%;
    --ring: 137 48% 46%;
    --radius: 0.5rem;
  }

  /* ─── Light Mode ─── */
  .light {
    --background: 120 14% 95%;   /* #F2F5F1 */
    --foreground: 160 30% 8%;
    --card: 120 14% 92%;         /* #E6ECE7 */
    --card-foreground: 160 30% 8%;
    --popover: 120 14% 92%;
    --popover-foreground: 160 30% 8%;
    --primary: 137 48% 46%;      /* unchanged across themes */
    --primary-foreground: 160 30% 6%;
    --secondary: 188 60% 45%;    /* unchanged across themes */
    --secondary-foreground: 160 30% 6%;
    --muted: 120 14% 88%;
    --muted-foreground: 160 12% 36%;
    --accent: 155 18% 42%;
    --accent-foreground: 160 30% 8%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 120 15% 92%;
    --border: 120 10% 83%;
    --input: 120 14% 85%;
    --ring: 137 48% 46%;
  }
}
```

Brand hues (`primary`, `secondary`, `accent`, `destructive`) are **identical in both themes** —
only backgrounds, borders, and text values flip. That is what keeps the identity stable.

### 2.3 Usage rules

| Intent | Token |
|---|---|
| Page background | `bg-background` (`#0B1411` dark / `#F2F5F1` light) |
| Card / raised panel | `bg-card` or `bg-bg-surface1` |
| Hairline, divider | `border-border` (`*` selector already applies `border-border`) |
| Body text | `text-foreground` |
| Secondary / caption text | `text-muted-foreground` |
| Calls to action, active state, metrics | `primary` |
| Links, inline code, references, data values | `secondary` |
| Subtle chrome, de-emphasized fills | `accent` / `organic` |
| Errors only | `destructive` |

Opacity suffixes do the heavy lifting instead of extra tokens:
`border-primary/40`, `bg-primary/5`, `text-secondary/30`.

---

## 3. Typography

### 3.1 Families

Loaded via `next/font/google` in the root layout, exposed as CSS variables:

```tsx
const fraunces    = Fraunces({    subsets:["latin"], variable:"--font-fraunces",     display:"swap" });
const ibmPlexSans = IBM_Plex_Sans({subsets:["latin"], weight:["300","400","500","600"],
                                   variable:"--font-ibm-plex-sans", display:"swap" });
const ibmPlexMono = IBM_Plex_Mono({subsets:["latin"], weight:["400","500"],
                                   variable:"--font-ibm-plex-mono", display:"swap" });
```

```ts
fontFamily: {
  serif: ["Fraunces", "Georgia", "serif"],
  sans:  ["IBM Plex Sans", "system-ui", "sans-serif"],
  mono:  ["IBM Plex Mono", "Menlo", "monospace"],
}
```

Base-layer assignment:

```css
body      { font-family: var(--font-ibm-plex-sans); @apply text-foreground antialiased; }
h1        { font-family: var(--font-fraunces); @apply font-semibold tracking-tight; }
h2, h3    { font-family: var(--font-ibm-plex-sans); @apply font-semibold; }
code, pre { font-family: var(--font-ibm-plex-mono); @apply tracking-wide; }
```

### 3.2 Display scale

```ts
fontSize: {
  "display-xl": ["4.5rem", { lineHeight:"1.05", letterSpacing:"-0.03em",  fontWeight:"600" }],
  "display-lg": ["3.5rem", { lineHeight:"1.1",  letterSpacing:"-0.02em",  fontWeight:"600" }],
  "display-md": ["2.5rem", { lineHeight:"1.15", letterSpacing:"-0.015em", fontWeight:"600" }],
}
```

- `display-xl` — hero headline only, one per page, `font-serif`.
- `display-md` — section headings, `font-sans`.
- Body copy: `text-lg` for lead paragraphs, default size for the rest, always
  `leading-[1.7]` and capped at `max-w-[55ch]`–`max-w-[60ch]`.

### 3.3 The "eyebrow" pattern

The single most recognizable text treatment. Use above every section heading:

```tsx
<span className="text-xs font-mono uppercase tracking-widest text-primary">
  Áreas de atuação
</span>
```

Variants: `text-primary` for section labels, `text-muted-foreground` for stat labels,
`text-organic` for hints (e.g. the scroll cue).

---

## 4. Shape, Spacing, Elevation

- **Radius** is driven by `--radius: 0.5rem`:
  `borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" }`.
  Cards use `rounded-xl`, buttons/badges `rounded-md`, the floating nav `rounded-xl`,
  status pills `rounded-full`.
- **Page container:** `max-w-7xl mx-auto px-6`. Uniform everywhere — nav, sections, footer.
- **Section rhythm:** `py-24` for major sections, `py-16` for bands (stats), `mb-14` between a
  section header block and its content grid.
- **Grid gaps:** `gap-5` for card grids, `gap-8` for stat columns.
- **Elevation:** there is no shadow scale. Depth = background layer + `border-border` hairline.
  The one exception is the floating nav (`shadow-lg`) and the green glow utilities.

---

## 5. Signature Effects

### 5.1 Animated background ("breathe")

A fixed, `z-index: -1` gradient behind everything, drifting over 35s. Pointer-events off.

```css
body::before {
  content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: linear-gradient(135deg, #0B1411 0%, #11201A 40%, #0d1816 70%, #0B1411 100%);
  background-size: 300% 300%;
  animation: bg-breathe 35s ease infinite;
}
.light body::before {
  background: linear-gradient(135deg, #F2F5F1 0%, #E6ECE7 40%, #EDF1EC 70%, #F2F5F1 100%);
  background-size: 300% 300%;
  animation: bg-breathe 35s ease infinite;
}
```

### 5.2 Keyframes & animations

```ts
keyframes: {
  "scroll-reveal":  { "0%":{opacity:"0",transform:"translateY(7px)"}, "100%":{opacity:"1",transform:"translateY(0)"} },
  "glow-pulse":     { "0%, 100%":{boxShadow:"0 0 0 0 rgba(63,175,92,0)"}, "50%":{boxShadow:"0 0 18px 4px rgba(63,175,92,0.25)"} },
  "bg-breathe":     { "0%, 100%":{backgroundPosition:"0% 50%"}, "50%":{backgroundPosition:"100% 50%"} },
  "underline-grow": { "0%":{width:"0%"}, "100%":{width:"100%"} },
  "fade-in":        { "0%":{opacity:"0"}, "100%":{opacity:"1"} },
  "count-up":       { "0%":{opacity:"0",transform:"translateY(8px)"}, "100%":{opacity:"1",transform:"translateY(0)"} },
},
animation: {
  "scroll-reveal":  "scroll-reveal 300ms ease-in-out forwards",
  "glow-pulse":     "glow-pulse 2.5s ease-in-out infinite",
  "bg-breathe":     "bg-breathe 30s ease infinite",
  "underline-grow": "underline-grow 250ms ease-in-out forwards",
  "fade-in":        "fade-in 400ms ease-in-out forwards",
  "count-up":       "count-up 300ms ease-out forwards",
},
transitionTimingFunction: { "bio-ease": "cubic-bezier(0.4, 0, 0.2, 1)" },
transitionDuration: { "240": "240ms", "320": "320ms" },
backgroundSize: { "300%": "300%" },
```

**Duration convention:** `duration-240` for text/color/icon transitions,
`duration-320` for surfaces (cards, nav bar chrome).

### 5.3 Utility classes

```css
@layer utilities {
  /* Scroll-reveal – toggled by an IntersectionObserver adding .visible */
  .reveal          { @apply opacity-0; }
  .reveal.visible  { @apply animate-scroll-reveal; }

  /* Animated underline for nav links */
  .bio-link          { @apply relative no-underline; color: #2FA8B8; }
  .bio-link::after   { content:""; @apply absolute left-0 bottom-0 h-px w-0
                       transition-[width] duration-200; background-color:#2FA8B8; }
  .bio-link:hover::after { @apply w-full; }

  /* Green focus/emphasis ring */
  .glow-border { box-shadow: 0 0 0 1px #3FAF5C, 0 0 14px 0 rgba(63,175,92,0.25); }

  /* Numeric data style */
  .metric { @apply font-medium tracking-wide;
            font-family: var(--font-ibm-plex-mono), Menlo, monospace; color:#3FAF5C; }
}
```

### 5.4 Scroll-reveal recipe

Elements get `className="reveal opacity-0"` plus a staggered
`style={{ animationDelay: "${i * 80}ms" }}`. A client component observes them:

```tsx
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
    { threshold: 0.15 },
  );
  ref.current?.querySelectorAll(".reveal").forEach((c) => observer.observe(c));
  return () => observer.disconnect();
}, []);
```

Stagger increments: 50 → 100 → 180 → 260 → 500ms for hero elements; `i * 80ms` for grids.

### 5.5 Ambient glow

Large, very low-opacity radial gradient behind hero content:

```tsx
<div
  className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
  style={{ background: "radial-gradient(ellipse at center, rgba(63,175,92,0.07) 0%, transparent 70%)" }}
  aria-hidden="true"
/>
```

### 5.6 Hover glow (interactive elements)

```
hover:shadow-[0_0_14px_0_rgba(63,175,92,0.3)]   /* small: buttons, nav CTA */
hover:shadow-[0_0_20px_0_rgba(63,175,92,0.3)]   /* large: hero CTA */
active:scale-[0.98]
```

---

## 6. Component Library

### 6.1 Setup

Shadcn UI, **New York** style, `baseColor: neutral`, CSS variables on, `lucide-react` icons,
RSC enabled. `components.json`:

```json
{
  "style": "new-york", "rsc": true, "tsx": true,
  "tailwind": { "config": "tailwind.config.ts", "css": "app/globals.css",
                "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "iconLibrary": "lucide",
  "aliases": { "components": "@/components", "utils": "@/lib/utils",
               "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" }
}
```

Required deps: `tailwindcss-animate`, `@tailwindcss/typography`, `class-variance-authority`,
`clsx`, `tailwind-merge`, `next-themes`, `lucide-react`, `@radix-ui/react-*`.

The `cn` helper (`lib/utils.ts`) is used in every component:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

### 6.2 Primitives in use

`button`, `card`, `badge`, `navigation-menu`, `scroll-area`, `separator`, `sheet` — stock
Shadcn New York, unmodified. The theming happens entirely through the CSS variables above.

**Button** — variants `default | destructive | outline | secondary | ghost | link`,
sizes `default (h-9 px-4) | sm (h-8 px-3 text-xs) | lg (h-10 px-8) | icon (h-9 w-9)`,
base `rounded-md text-sm font-medium transition-colors focus-visible:ring-1 focus-visible:ring-ring`.

**Card** — `rounded-xl border bg-card text-card-foreground shadow`, with
`CardHeader/Title/Description/Content/Footer` at `p-6` (`pt-0` for content/footer).
Note the sub-parts render as `<div>`, not `<h3>/<p>` — deliberate, so cards can be nested
inside arbitrary content without invalid HTML.

**Badge** — `rounded-md border px-2.5 py-0.5 text-xs font-semibold`, variants
`default | secondary | destructive | outline`.

### 6.3 The "outline CTA" — the house button

Primary actions are *not* filled by default. They're outlined in green and fill on hover:

```tsx
<Button size="lg" className="group border border-primary text-primary bg-transparent
  hover:bg-primary hover:text-bg-base transition-all duration-240
  hover:shadow-[0_0_20px_0_rgba(63,175,92,0.3)] active:scale-[0.98]" asChild>
  <Link href="#x">
    Explorar Pesquisas
    <ArrowRight size={16} className="ml-2 transition-transform duration-240 group-hover:translate-x-1" />
  </Link>
</Button>
```

Secondary action next to it is always `variant="ghost"` with
`text-muted-foreground hover:text-foreground`.

### 6.4 Status pill

```tsx
<span className="flex items-center gap-1.5 text-xs font-mono text-primary
  border border-primary/40 rounded-full px-3 py-1 bg-primary/5">
  <Activity size={11} className="animate-pulse" />
  Monitoramento Ativo · 75 sensores online
</span>
```

### 6.5 Feature card

Icon tile (left) + mono badge (right) in the header; body copy; mono metric footer.
Border lights up green on hover, icon tile gains a glow.

```tsx
<Card className="h-full bg-bg-surface1 border-bg-border
  hover:border-primary/50 transition-all duration-320 group">
  <CardHeader className="pb-3">
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="p-2.5 rounded-md bg-primary-glow border border-primary/20 text-primary
        group-hover:shadow-[0_0_14px_0_rgba(63,175,92,0.2)] transition-all duration-320">
        <Icon size={18} />
      </div>
      <Badge variant="outline"
        className="text-xs font-mono text-secondary border-secondary/30 bg-secondary/5">
        {badge}
      </Badge>
    </div>
    <CardTitle className="text-base font-sans font-semibold text-foreground leading-snug">
      {title}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground leading-[1.7] mb-4">{description}</p>
    <span className="metric text-sm">{metric}</span>
  </CardContent>
</Card>
```

Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5`.

### 6.6 Stats bar

Full-bleed band, divided columns on desktop, animated count-up on scroll into view.

```tsx
<section className="py-16 border-y border-bg-border bg-bg-surface1/40 backdrop-blur-sm">
  <div className="max-w-7xl mx-auto px-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0
                    md:divide-x md:divide-bg-border">
      {/* per stat: */}
      <div className="flex flex-col items-start md:items-center md:px-8 gap-2">
        <span className="metric text-3xl md:text-4xl">{prefix}{count}{suffix}</span>
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  </div>
</section>
```

Count-up: `IntersectionObserver` at `threshold: 0.5`, fires once (`started` ref),
`setInterval` at 16ms over a 1200ms duration.

### 6.7 Navigation — two patterns

**A. Marketing navbar** (`fixed top-0 z-50`) — transparent over the hero, gains a blurred
surface and hairline once `window.scrollY > 20`:

```tsx
<header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-320 ${
  scrolled ? "bg-bg-base/80 backdrop-blur-md border-b border-bg-border" : "bg-transparent"
}`}>
  <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">…</div>
</header>
```
Links use `.bio-link`; mobile menu is a Radix `Sheet` (`side="right"`, `w-[260px]`).

**B. App shell nav** (`sticky top-0 z-30`) — a *floating pill*, inset from the viewport edges,
carrying logo → section links → breadcrumbs → theme/sidebar toggles:

```tsx
<div className="sticky top-0 z-30 px-3 pt-3 pb-2">
  <nav className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/60 backdrop-blur
                  border border-border/40 text-sm text-muted-foreground shadow-lg">
```
Active section is `text-foreground font-medium`; inactive are `text-muted-foreground`;
breadcrumbs are separated by a `/` in `text-border` and `truncate` on mobile.

### 6.8 Theme toggle

```tsx
const { theme, setTheme } = useTheme();
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);          // avoids hydration mismatch
…
{mounted && (
  <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    aria-label="Alternar tema"
    className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted
               transition-colors text-muted-foreground hover:text-foreground">
    {theme === "dark" ? <Sun className="h-3.5 w-3.5"/> : <Moon className="h-3.5 w-3.5"/>}
  </button>
)}
```

### 6.9 Callout (content admonition)

Four types, each a tinted left-border block. Uses raw Tailwind color scales (not brand tokens)
so the semantics read universally, with `dark:` text overrides:

```tsx
note:    "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-200"      // Info
warning: "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200"  // AlertTriangle
tip:     "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200" // Lightbulb
danger:  "border-red-500/30 bg-red-500/5 text-red-900 dark:text-red-200"          // AlertOctagon
```

Shell: `my-6 rounded-lg border-l-4 p-4`, header row
`flex items-center gap-2 mb-2 font-semibold text-sm` with a `h-4 w-4` icon, body `text-sm`.

### 6.10 Footer

Deliberately quiet: `border-t border-border/30 mt-16`, content at
`text-xs text-muted-foreground/60`, logo mark + serif wordmark on the left, external links
on the right, `flex-col sm:flex-row`.

---

## 7. Long-Form Content (`@tailwindcss/typography`)

If the new app renders articles/MDX, these overrides are what make `.prose` match the brand.

### 7.1 Links and inline code

```css
.prose a {
  color: hsl(var(--secondary)) !important;
  text-decoration: underline !important;
  text-decoration-color: hsl(var(--secondary) / 0.45) !important;
  text-underline-offset: 3px !important;
  font-weight: inherit !important;
  transition: color .2s ease, text-decoration-color .2s ease !important;
}
.prose a:hover {
  color: hsl(var(--primary)) !important;
  text-decoration-color: hsl(var(--primary) / .6) !important;
}

/* kill Typography's backtick pseudo-quotes */
.prose :not(pre) > code::before,
.prose :not(pre) > code::after { content: none !important; }

.prose :not(pre) > code {
  background-color: hsl(var(--muted));
  color: hsl(var(--secondary));
  border: 1px solid hsl(var(--border));
  border-radius: .25rem;
  padding: .1em .4em;
  font-size: .875em;
  font-weight: 400;
  font-family: var(--font-ibm-plex-mono), Menlo, monospace;
}
.light .prose :not(pre) > code { color: hsl(188 60% 32%); }
```

Global anchor default (outside prose) is intentionally muted, not colored:

```css
a       { color: hsl(var(--muted-foreground)); text-decoration: none; transition: color .2s ease; }
a:hover { color: hsl(var(--foreground)); }
```

### 7.2 Heading rhythm inside `.prose`

The page title lives *outside* `.prose`; inside it, `h1` is a section, `h2` a subsection, etc.

| | size | weight | line-height | margin-top | margin-bottom |
|---|---|---|---|---|---|
| `h1` | `1.75em` | 600 | 1.3 | `2.5em` | `0.6em` |
| `h2` | `1.375em` | 600 | 1.4 | `2em` | `0.5em` |
| `h3` | `1.125em` | 600 | 1.5 | `1.5em` | `0.4em` |
| `h4` | `1em` | 600 | 1.5 | `1.25em` | `0.3em` |

All four get `scroll-margin-top: 5rem` to clear the sticky nav.

### 7.3 Code highlighting

`highlight.js` with `atom-one-dark` imported globally, plus a hand-written `.light .hljs-*`
override set matching `atom-one-light` (keywords `#a626a4`, strings `#50a14f`,
numbers/attrs `#986801`, titles `#4078f2`, built-ins `#c18401`, comments `#717277` italic,
background `#f6f8fa` on `#383a42`).

### 7.4 Reference-highlight animation

Clicking a cross-reference pulses a green ring around the target — no fill, so text stays legible:

```css
@keyframes ref-highlight {
  0%   { box-shadow: 0 0 0 0    rgba(63,175,92,0); }
  15%  { box-shadow: 0 0 0 10px rgba(63,175,92,.35); }
  75%  { box-shadow: 0 0 0 10px rgba(63,175,92,.35); }
  100% { box-shadow: 0 0 0 0    rgba(63,175,92,0); }
}
.fig-highlight-active { border-radius: 8px; animation: ref-highlight 1s ease-in-out forwards; }
```

### 7.5 Print / PDF

`@page { size: A4; margin: 2cm 2.5cm }`; the animated background is disabled; `nav, header,
aside, .fixed` are hidden; the whole `--tw-prose-*` variable set is redefined to dark-on-white;
`hljs` falls back to `#f5f5f5`/`#333`; external link hrefs are appended via
`.prose a[href^="http"]::after { content: " (" attr(href) ")" }`.

---

## 8. Root Layout Skeleton

```tsx
<html lang="pt-BR" suppressHydrationWarning
      className={`${fraunces.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
  <body className="min-h-screen flex flex-col">
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}
                   disableTransitionOnChange>
      <SiteNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </ThemeProvider>
  </body>
</html>
```

Notes: `suppressHydrationWarning` on `<html>` is required by `next-themes`;
`disableTransitionOnChange` prevents a color-transition flash when toggling;
`flex flex-col` + `flex-1` keeps the footer at the bottom of short pages.

---

## 9. Porting Checklist

1. `npx shadcn@latest init` → New York, neutral, CSS variables. Copy `components.json` aliases.
2. Install: `tailwindcss-animate @tailwindcss/typography class-variance-authority clsx
   tailwind-merge next-themes lucide-react`.
3. Paste `theme.extend` (colors, fontFamily, fontSize, keyframes, animation,
   transitionTimingFunction, transitionDuration, backgroundSize) into `tailwind.config.ts`;
   keep `darkMode: ["class"]` and both plugins.
4. Paste the `:root` / `.light` variable blocks — remember dark is `:root`, light is `.light`.
5. Paste the base layer (`body`, `body::before`, heading fonts, anchor defaults) and the
   `@layer utilities` block (`.reveal`, `.bio-link`, `.glow-border`, `.metric`).
6. Wire the three Google fonts in the root layout as CSS variables.
7. Configure `ThemeProvider` with `defaultTheme="dark" enableSystem={false}`.
8. Adopt the container (`max-w-7xl mx-auto px-6`), section rhythm (`py-24`), the eyebrow
   pattern, the outline CTA, and the scroll-reveal observer.
9. Only add the `.prose` overrides (§7) if the app renders long-form content.

---

## 10. Quick Rules of Thumb

- Never use a neutral grey background — greens (`160 30% 6%`) or off-white greens (`120 14% 95%`).
- Any number the user should read is `.metric` (mono, green).
- Any label above a heading is mono, uppercase, `tracking-widest`, `text-xs`.
- Filled green buttons are rare; outlined-that-fills-on-hover is the default CTA.
- Hover on a surface = border turns `primary/50`; hover on text = goes to `text-foreground`.
- Transitions: 240ms text/color, 320ms surfaces, nothing else.
- Cap measure at ~55–60ch and set `leading-[1.7]` on body copy.
- Prefer `token/opacity` over inventing a new color.
