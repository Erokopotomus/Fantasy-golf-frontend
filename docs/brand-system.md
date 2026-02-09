# CLUTCH BRAND SYSTEM — Implementation Guide for Claude Code

> **Purpose:** This is the design system source of truth. Read this whenever building or modifying any UI component, page, or layout. Every color, font, spacing decision, and component pattern is defined here. Do not deviate from these tokens without explicit instruction from the project owner.

---

## BRAND IDENTITY: AURORA EMBER

Clutch uses the **Aurora Ember** design direction — a warm, glassmorphic, living interface with a dark charcoal base, gold and burnt orange accents, and frosted glass card surfaces. The design should feel premium, forward-thinking, and distinctly unlike any existing fantasy sports platform (especially Sleeper).

**One-line brand description:** "Built in 2030, dropped in 2026."

---

## COLOR TOKENS

Add these as CSS custom properties in your global stylesheet (`globals.css` or equivalent):

```css
:root {
  /* ── Base ── */
  --bg:                 #0A0908;
  --bg-alt:             #0E0C0A;

  /* ── Surface (glass cards) ── */
  --surface:            rgba(255, 245, 230, 0.04);
  --surface-hover:      rgba(255, 245, 230, 0.07);
  --surface-bright:     rgba(255, 245, 230, 0.10);

  /* ── Border ── */
  --border:             rgba(255, 245, 230, 0.08);
  --border-bright:      rgba(232, 184, 77, 0.18);

  /* ── Brand Colors ── */
  --gold:               #E8B84D;
  --gold-bright:        #F5CC65;
  --gold-muted:         #C49A3A;
  --orange:             #E07838;
  --rose:               #D4607A;
  --green:              #6ABF8A;

  /* ── Text ── */
  --text:               #F2EDE8;
  --text-muted:         #958E84;
  --text-dim:           #5E5850;

  /* ── Semantic ── */
  --success:            #6ABF8A;
  --danger:             #D4607A;
  --warning:            #E8B84D;
  --info:               #E07838;

  /* ── Gradients ── */
  --gradient-primary:   linear-gradient(135deg, #E8B84D 0%, #E07838 100%);
  --gradient-soft:      linear-gradient(135deg, #E8B84D 0%, #D4607A 100%);

  /* ── Shadows ── */
  --shadow-sm:          0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md:          0 8px 32px rgba(0, 0, 0, 0.25);
  --shadow-lg:          0 16px 48px rgba(0, 0, 0, 0.35);
  --shadow-glow:        0 4px 28px rgba(232, 184, 77, 0.20);
}
```

### Tailwind Config Overrides

If using Tailwind, extend the config:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: '#0A0908',
        'bg-alt': '#0E0C0A',
        gold: { DEFAULT: '#E8B84D', bright: '#F5CC65', muted: '#C49A3A' },
        orange: '#E07838',
        rose: '#D4607A',
        green: '#6ABF8A',
        text: { DEFAULT: '#F2EDE8', muted: '#958E84', dim: '#5E5850' },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        'card-lg': '20px',
        button: '12px',
        badge: '6px',
      },
    },
  },
};
```

---

## TYPOGRAPHY

### Font Imports

Add to `<head>` in your root layout (`layout.tsx` or `_document.tsx`):

```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Or import via Next.js font optimization:

```tsx
// src/app/layout.tsx
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

// Apply to <body>:
<body className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-body`}>
```

### Typography Hierarchy — THE RULES

| Role | Font | Sizes | Weight | Letter-spacing | When to use |
|------|------|-------|--------|----------------|------------|
| **Display** | Syne (`font-display`) | 18px and above ONLY | 700–800 | -0.02em | Hero headlines, section titles, page titles, league card names, primary CTA button text, the CLUTCH wordmark |
| **Body** | DM Sans (`font-body`) | All sizes | 400–700 | normal | Everything people read: nav links, descriptions, body text, player names, form labels, secondary buttons, chat messages, settings, help text |
| **Data** | JetBrains Mono (`font-mono`) | All sizes | 400–700 | 0.04–0.08em (uppercase labels) | Scores, points, stats, badge labels, status tags, tier labels, round indicators, timestamps, prediction numbers, any numerical data |

### THE ONE RULE

> If you're reading it to get information → **DM Sans**.
> If it's a number, stat, badge, or status → **JetBrains Mono**.
> If it's the first thing your eye hits on the page → **Syne**.

**Syne never appears below 18px.** If text is smaller than 18px, use DM Sans. No exceptions.

### Tailwind Utility Classes

```css
/* In globals.css */
.text-display { font-family: var(--font-display), 'Syne', sans-serif; }
.text-body    { font-family: var(--font-body), 'DM Sans', sans-serif; }
.text-data    { font-family: var(--font-mono), 'JetBrains Mono', monospace; }
```

---

## LOGO: THE SPARK

The Clutch logo is a lightning bolt inside a rounded square. It represents the clutch moment — the electric instant when everything matters.

### SVG Component

```tsx
// src/components/ui/ClutchLogo.tsx
interface ClutchLogoProps {
  size?: number;
  className?: string;
}

export function ClutchLogo({ size = 32, className }: ClutchLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="clutch-logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8B84D" />
          <stop offset="100%" stopColor="#E07838" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#clutch-logo-gradient)" />
      <path d="M27 10 L19 25 L25 25 L21 38 L33 21 L26 21 Z" fill="#0A0908" />
    </svg>
  );
}
```

### Wordmark Pairing

The logo always appears with the text "CLUTCH" in Syne weight 800, letter-spacing -0.02em, colored `var(--gold)`.

```tsx
// Logo + Wordmark lockup
<div className="flex items-center gap-2.5">
  <ClutchLogo size={28} />
  <span className="text-display text-lg font-extrabold tracking-tight text-gold">
    CLUTCH
  </span>
</div>
```

### Logo Usage Rules

- **App icon / favicon:** Gold gradient fill, dark bolt
- **On dark backgrounds:** Gold gradient fill (default)
- **On white/light backgrounds:** Dark fill (`#0A0908`), gold bolt
- **Minimum size:** 16px (never render smaller)
- **Clear space:** Minimum padding of 50% of logo width on all sides

---

## GLASS CARD SYSTEM

All content cards use a glassmorphic style — translucent, blurred, floating above the aurora background.

### Base Glass Card

```tsx
// src/components/ui/GlassCard.tsx
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  highlighted?: boolean;
}

export function GlassCard({ children, className, highlighted }: GlassCardProps) {
  return (
    <div
      className={`
        rounded-card backdrop-blur-xl backdrop-saturate-150
        ${highlighted
          ? 'bg-white/[0.06] border border-gold/20 shadow-lg'
          : 'bg-white/[0.04] border border-white/[0.08] shadow-md'
        }
        ${className || ''}
      `}
    >
      {children}
    </div>
  );
}
```

### CSS Version (if not using Tailwind)

```css
.glass-card {
  background: rgba(255, 245, 230, 0.04);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgba(255, 245, 230, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}

.glass-card--highlighted {
  background: rgba(255, 245, 230, 0.06);
  border-color: rgba(232, 184, 77, 0.18);
}
```

### Important: Glass cards must have a background behind them to blur. They look best floating over the aurora gradient background. On flat solid backgrounds they lose their effect.

---

## AURORA BACKGROUND

The background uses slow-moving radial gradient orbs to create a living, breathing atmosphere.

### Implementation

```tsx
// src/components/layout/AuroraBackground.tsx
'use client';
import { useEffect, useState } from 'react';

export function AuroraBackground() {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 1), 50);
    return () => clearInterval(interval);
  }, []);

  const orbs = [
    { color: 'rgba(232, 184, 77, 0.07)', left: '20%', top: '70%', size: 500, speedX: 0.015, speedY: 0.012 },
    { color: 'rgba(224, 120, 56, 0.05)', left: '75%', top: '25%', size: 450, speedX: 0.020, speedY: 0.016 },
    { color: 'rgba(212, 96, 122, 0.04)', left: '50%', top: '50%', size: 350, speedX: 0.025, speedY: 0.020 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: orb.left,
            top: orb.top,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            filter: 'blur(50px)',
            transform: `translate(${Math.sin(time * orb.speedX) * 30}px, ${Math.cos(time * orb.speedY) * 20}px)`,
          }}
        />
      ))}
    </div>
  );
}
```

### Usage in Root Layout

```tsx
// src/app/layout.tsx
import { AuroraBackground } from '@/components/layout/AuroraBackground';

export default function RootLayout({ children }) {
  return (
    <html>
      <body className="bg-bg text-text min-h-screen relative">
        <AuroraBackground />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
```

### Performance Note
The aurora animation uses `setInterval` at 50ms (20fps). If performance is a concern on lower-end devices, consider:
- Using CSS animations instead of JS-driven transforms
- Reducing to 2 orbs on mobile
- Adding a `prefers-reduced-motion` media query check

---

## BUTTON STYLES

### Primary Button (Gold Gradient)
Used for main CTAs: "Start Playing Free", "Create League", "Manage Lineup"

```css
.btn-primary {
  background: var(--gradient-primary);
  color: var(--bg);
  font-family: var(--font-display); /* Syne */
  font-weight: 700;
  font-size: 14px;
  padding: 12px 28px;
  border-radius: 12px;
  border: none;
  box-shadow: var(--shadow-glow);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 32px rgba(232, 184, 77, 0.30);
}
```

### Secondary Button (Glass Ghost)
Used for secondary actions: "View League", "See How It Works"

```css
.btn-secondary {
  background: transparent;
  color: var(--text);
  font-family: var(--font-body); /* DM Sans */
  font-weight: 600;
  font-size: 14px;
  padding: 12px 28px;
  border-radius: 12px;
  border: 1px solid var(--border-bright);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(232, 184, 77, 0.28);
}
```

### Tertiary Button (Subtle)
Used for less prominent actions: "View Leaderboard", quick action links

```css
.btn-tertiary {
  background: rgba(232, 184, 77, 0.08);
  color: var(--gold);
  font-family: var(--font-display); /* Syne */
  font-weight: 700;
  font-size: 13px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
}
```

---

## BADGE & TAG STYLES

Badges use JetBrains Mono, are small, and have low-opacity color fills.

```css
/* Status badges */
.badge {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 3px 10px;
  border-radius: 6px;
}

.badge-active   { background: rgba(106, 191, 138, 0.12); color: var(--green); }
.badge-predraft { background: rgba(232, 184, 77, 0.12); color: var(--gold); }
.badge-live     { background: rgba(239, 68, 68, 0.12); color: #EF4444; }
.badge-pro      { background: rgba(232, 184, 77, 0.10); color: var(--gold); border: 1px solid rgba(232, 184, 77, 0.15); }

/* Format tags */
.tag {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 5px;
  background: rgba(232, 184, 77, 0.12);
  color: var(--gold);
}
```

---

## ANTI-SLEEPER RULES

Follow these rules strictly to ensure Clutch never looks like a Sleeper clone:

1. **NO cyan or teal as an accent color.** Green is allowed ONLY for success/active status — never as a brand color or button color.
2. **NO blue or purple anywhere** except `var(--rose)` which is warm pink, not purple.
3. **Background is warm charcoal** (`#0A0908` — has brown undertone). NOT cool gray. NOT dark blue.
4. **NO robot mascots or cartoon characters.** The Spark logo is abstract. AI features use the ✦ symbol or spark icon, never a face or character.
5. **NO rounded, friendly typography.** Syne is geometric and sharp. If it looks "cute" or "playful", you've used the wrong font.
6. **Cards use glass (translucent + blur)**, not solid backgrounds with visible gray borders. If you can't see the aurora behind the card, the card style is wrong.
7. **Primary buttons are always gold gradient**, never green fill.
8. **Data labels use JetBrains Mono** in uppercase with letter-spacing. This is the single biggest visual differentiator from Sleeper's rounded sans-serif aesthetic.
9. **Animations are smooth and subtle** — ease curves, gentle transforms. NO bouncy/springy animations, NO confetti, NO playful transitions.
10. **Border radius is 12-20px** for cards, 10-14px for buttons, 5-6px for badges. NOT 24px+ (too rounded = too Sleeper).

---

## COMPONENT QUICK REFERENCE

### Nav Bar
- Glass background with blur
- Logo (Spark) + Wordmark (Syne 800) on left
- Nav links (DM Sans 500, 13px) in center
- "Live" indicator uses green dot with glow + JetBrains Mono
- Search (⌘K) + avatar on right
- Avatar is user initial in gold gradient rounded square

### League Card
- Glass card container
- League name: Syne 17px 700
- Tags (Snake, Auction, etc.): JetBrains Mono badge style
- Member count: DM Sans 11px dim
- Status badge: JetBrains Mono with colored background
- Points display: JetBrains Mono 24px bold gold
- Two buttons: secondary (View League) + primary (Manage Lineup)

### Live Tournament Widget
- Glass card with LIVE badge (red dot + JetBrains Mono)
- Tournament name: DM Sans 14px 700 (NOT Syne — it's informational, not a hero)
- Venue: DM Sans 11px muted
- Round indicators: JetBrains Mono in row, active round uses gold gradient fill

### Performance Call Card
- Section label: JetBrains Mono 10px uppercase dim
- Player name: DM Sans 15px 700 (NOT Syne — it's data context)
- Benchmark number: JetBrains Mono 22px bold gold
- OVER/UNDER buttons: green/rose tinted backgrounds
- Consensus bar: thin progress bar with JetBrains Mono percentage

### Bottom Tab Bar (Mobile)
- Fixed bottom
- 5 tabs: Home, Leagues, Draft, Live, Profile
- Icons + labels (DM Sans 10px)
- Active tab: gold color
- Inactive: dim

---

## Z-INDEX SCALE

```
0   — Aurora background orbs
1   — Page content
10  — Cards and panels
50  — Dropdowns and popovers
100 — Sticky nav bar
150 — Modals and overlays
200 — Toast notifications
250 — Dev tools / fixed toggles
```

---

## SPACING SCALE

Use Tailwind's default spacing scale. Key values used throughout:
- Card padding: `p-5` (20px) or `p-6` (24px)
- Card gap: `gap-3` (12px) to `gap-4` (16px)
- Section padding: `py-16` (64px) to `py-20` (80px) vertical, `px-8` (32px) to `px-10` (40px) horizontal
- Inner element gap: `gap-2` (8px) to `gap-3` (12px)

---

## FILE STRUCTURE

```
src/
├── components/
│   ├── ui/
│   │   ├── ClutchLogo.tsx        ← Spark SVG logo
│   │   ├── GlassCard.tsx         ← Base glass card component
│   │   ├── Button.tsx            ← Primary, Secondary, Tertiary variants
│   │   ├── Badge.tsx             ← Status/format badge component
│   │   └── Tag.tsx               ← Small format tags
│   ├── layout/
│   │   ├── AuroraBackground.tsx  ← Living gradient orb background
│   │   ├── Navbar.tsx            ← Top navigation bar
│   │   └── MobileTabBar.tsx      ← Bottom tab bar for mobile
│   └── ...
├── styles/
│   └── globals.css               ← CSS variables, base styles, utilities
└── ...
```

---

*Last updated: February 7, 2026*
*Brand direction: Aurora Ember*
*Logo: The Spark*
*Display font: Syne | Body font: DM Sans | Data font: JetBrains Mono*
