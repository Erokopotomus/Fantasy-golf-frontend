# CLUTCH BRAND SYSTEM & DESIGN TOKENS
**Version 1.0 — February 2026 — Implementation-Ready Specification**

---

## Brand Philosophy

Clutch is the only fantasy sports platform that makes light mode its identity. Every competitor (Sleeper, Underdog, PrizePicks, ESPN) hides in dark mode. Clutch steps into the light.

**Core Identity:** Warm, confident, alive. Strava meets The Athletic meets Notion. Smart but not corporate. Competitive but not intimidating.

**Key Differentiators:**
- Light-first brand identity — dark mode exists as user preference, not default
- Four-color system where each color has ONE job
- Editorial serif moments (Instrument Serif italic) on key words — no other fantasy platform uses serif
- Mixed card treatment — bold dark cards for key elements, tinted cards for utility
- Electric orange accent (not coral, not red) — Strava/McLaren territory

---

## Color System

Every color has one job. This prevents visual competition and creates clear hierarchy.

### Brand Colors

| Name | Hex | Role | When to Use |
|------|-----|------|-------------|
| **Blaze** | `#F06820` | Action, CTAs, brand energy | Primary buttons, links, active states |
| **Blaze Hot** | `#FF8828` | Lighter accent | Hover states, gradient endpoints |
| **Blaze Deep** | `#D45A10` | Darker anchor | Active/pressed states, gradient starts |
| **Slate** | `#1E2A3A` | Structure, authority | Nav bar, secondary buttons, editorial blocks |
| **Slate Mid** | `#2C3E50` | Slate gradients | Card gradient endpoints |
| **Slate Light** | `#3D5166` | Muted structure | Section labels, muted icons |
| **Field** | `#0D9668` | Positive, live, golf | Live badges, golf cards, success states |
| **Field Bright** | `#14B880` | Bright positive | Pulse dots, highlights, accent text |
| **Crown** | `#D4930D` | Achievement, rating | Clutch Rating, rank #1, tier labels |
| **Crown Bright** | `#F0B429` | Bright achievement | Rating labels, tier badges |
| **Live Red** | `#E83838` | Live/urgent status | Live badges ONLY |

### Surface & Background Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg` | `#FAFAF6` | `#0E1015` | Page background |
| `--bg-alt` | `#F0EDE6` | `#151820` | Alternate/section bg |
| `--surface` | `#FFFFFF` | `#1A1D26` | Standard card bg |
| `--surface-alt` | `#F7F5F0` | `#1F222E` | Raised card bg |
| `--stone` | `#E0DBD2` | `#2A2D38` | Borders, dividers |
| `--text-1` | `#1A1A1A` | `#EEEAE2` | Primary text |
| `--text-2` | `#65615A` | `#908C84` | Secondary text |
| `--text-3` | `#A09A90` | `#5C5952` | Tertiary/muted text |
| `--card-border` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` | Card border |
| `--card-shadow` | `0 2px 8px rgba(0,0,0,0.04)` | `0 2px 8px rgba(0,0,0,0.2)` | Card shadow |
| `--card-shadow-hover` | `0 12px 40px rgba(0,0,0,0.07)` | `0 12px 40px rgba(0,0,0,0.3)` | Card hover shadow |
| `--gauge-bg` | `#E0DBD2` | `rgba(255,255,255,0.08)` | Gauge track |
| `--nav-bg` | `#1E2A3A` | `#111318` | Navigation background |

### Tinted Card Backgrounds (Light Mode)

In light mode, utility cards pick up a subtle wash of their accent color. In dark mode, use standard surface with a very subtle accent overlay.

| Context | Light Tint | Dark Overlay |
|---------|-----------|-------------|
| Golf / Field cards | `#F0F7F4` | Field at 4% opacity over surface |
| NFL / Blaze cards | `#FFF5EE` | Blaze at 3% opacity over surface |
| News / Neutral | `#F4F3F0` | Slate at 8% opacity over surface |
| Rating / Crown | `#FDF8EE` | Crown at 4% opacity over surface |
| AI / Slate cards | `#F0F2F5` | Slate Light at 5% opacity over surface |

### Bold Card Backgrounds

Key cards use dark backgrounds in BOTH modes for visual hierarchy. Eye hits these first.

| Card | Light Mode BG | Dark Mode BG |
|------|--------------|-------------|
| Rating Card | `linear-gradient(160deg, #1E2A3A, #2C3E50)` | `linear-gradient(160deg, #1E1B16, #252018)` |
| Live Tournament | `linear-gradient(160deg, #0B1F15, #142E20)` | `linear-gradient(160deg, #0B1F15, #142E20)` |
| Rating Hero (page) | `linear-gradient(135deg, #1E2A3A, #2C3E50)` | `linear-gradient(135deg, #1E1B16, #252018)` |
| Editorial Block | `#1E2A3A` (Slate) | `linear-gradient(135deg, #18140E, #1E1810)` |
| CTA Block | `#131118` (Ink) | `linear-gradient(135deg, #18140E, #1E1810)` |

**CRITICAL:** In dark mode, the rating card uses warm charcoal-brown (`#1E1B16`), NOT slate blue. This prevents "too much blue" and makes the gold Crown accent glow against a warm base.

---

## Typography

### Font Stack

| Font | Weight(s) | Role | Usage |
|------|-----------|------|-------|
| **Bricolage Grotesque** | 700, 800 | Display / Headlines | Page titles, card titles, nav brand, buttons |
| **Instrument Serif** | 400 italic | Editorial accent | Key words: "Sports." "Eric." "know." "score." "it?" |
| **DM Sans** | 300–700 | Body | Paragraphs, descriptions, UI labels, navigation |
| **JetBrains Mono** | 400–700 | Data / Monospace | Stats, badges, timestamps, ratings, section labels |

### Font Loading

```html
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### CSS Custom Properties

```css
--font-display: 'Bricolage Grotesque', sans-serif;
--font-body: 'DM Sans', sans-serif;
--font-data: 'JetBrains Mono', monospace;
--font-editorial: 'Instrument Serif', serif;
```

### Type Scale

| Element | Font | Size | Weight | Letter Spacing |
|---------|------|------|--------|---------------|
| Hero headline | Bricolage Grotesque | `clamp(42px, 5.5vw, 70px)` | 800 | `-0.035em` |
| Section title | Bricolage Grotesque | `clamp(28px, 4vw, 44px)` | 800 | `-0.025em` |
| Card title | Bricolage Grotesque | `15px` | 700 | normal |
| Body text | DM Sans | `16–18px` | 400 | normal |
| Description | DM Sans | `13px` | 400 | normal |
| Section label | JetBrains Mono | `11px` | 600 | `0.15em` uppercase |
| Badge / status | JetBrains Mono | `9–10px` | 600 | `0.1–0.2em` uppercase |
| Stat value | JetBrains Mono | `17–18px` | 700 | normal |
| Rating number | Bricolage Grotesque | ~32% of gauge size | 800 | normal |
| Serif accent | Instrument Serif | `1.05em` of parent | 400 italic | normal |

### Serif Accent Rules

The Instrument Serif italic is used ONLY on specific "pop" words within Bricolage Grotesque headlines. Rules:

- Only ONE serif word per headline (occasionally two)
- Always the most important word: "Sports." "know." "score." "it?" "Eric."
- Color is always the contextual accent (Blaze for action, Crown for achievement)
- Font size is `1.05em` of parent headline size
- NEVER used in body text, buttons, nav, or data displays

---

## Component Patterns

### Navigation Bar

Always Slate navy background in BOTH modes. White text. This is the structural anchor.

- **Brand:** Spark icon (28×28, 7px radius, Blaze gradient) + "CLUTCH" in Bricolage Grotesque 800
- **Active tab:** white text, `rgba(255,255,255,0.08)` background
- **Inactive tabs:** `rgba(255,255,255,0.45)` text
- **Live badge:** Red pulse dot + "Live" in JetBrains Mono, red background tint
- **Search:** `rgba(255,255,255,0.06)` bg, `⌘K` kbd hint
- **Avatar:** 28×28 circle, Blaze gradient, initials in Bricolage 800

### Buttons

| Type | Background | Text | Shadow | Border |
|------|-----------|------|--------|--------|
| Primary (Blaze) | `linear-gradient(135deg, #F06820, #FF8828)` | White, Bricolage 700 | `0 4px 16px` Blaze at 16% | none |
| Secondary (Slate) | `#1E2A3A` solid | White, Bricolage 700 | `0 4px 16px` Slate at 19% | none |
| Ghost (light) | transparent | text-1, Bricolage 600 | none | `1.5px solid` Stone |
| Ghost (on dark) | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.7)` | none | `1px solid rgba(255,255,255,0.1)` |

All buttons: `padding: 14px 26px`, `font-size: 15px`, `border-radius: 12px`.

### Cards

Three treatments:

**1. Standard (Tinted) Cards**
- Background: accent tint in light mode, surface in dark mode
- Border: `1px solid var(--card-border)`
- Shadow: `var(--card-shadow)`
- Border radius: `14px`
- Padding: `20px`
- Feature cards get `3px` left border in their accent color

**2. Bold (Dark) Cards**
- Dark gradient background in BOTH modes
- No visible border (or transparent)
- Heavier shadow with accent glow: `0 8px 32px rgba(color, 0.2)`
- Internal radial gradient glow of accent color (Crown for rating, Field for live)
- Text uses light cream `#F0EBE0` and accent colors

**3. Floating Pills**
- Position absolute on parent card
- Golf pill: dark forest `#0B1F15` with `1px solid Field at 20%` border, green shadow glow
- NFL pill (light mode): Slate gradient with subtle white border
- NFL pill (dark mode): warm brown-black `#1F1812` with orange border glow
- Animation: `float 5s ease-in-out infinite` with staggered delays
- JetBrains Mono 11px, weight 600

### Gauge Ring (Clutch Rating)

SVG circular progress. Three concentric circles:

1. **Glow layer:** accent color, strokeWidth + 5, 8% opacity, gaussian blur 4px
2. **Track:** `var(--gauge-bg)` (Stone light / rgba white dark), base strokeWidth
3. **Fill:** linear gradient of accent color, round linecap, `drop-shadow(0 0 8px color at 19%)`

- Center number: Bricolage Grotesque 800 at 32% of gauge diameter
- Crown colors for rating context
- Radius = 40% of container size
- Stroke width: 7px for large (>130px), 5px for small

### Section Labels

```
[20px line] LABEL TEXT
```

- JetBrains Mono `11px`, weight 600, letter-spacing `0.15em`, uppercase
- Preceded by 20px horizontal line (2px height) in label color
- Color varies by context (Crown for rating sections, Slate Light for general)

### Badges & Status Pills

- JetBrains Mono `9–10px`, weight 600, letter-spacing `0.1–0.2em`, uppercase
- Pill-shaped: `border-radius: 100px`
- Background: accent color at 6–12% opacity
- Border: accent color at 10–20% opacity
- Padding: `3px 9px` (small), `5px 14px` (large)

### Live Pulse Dot

- 6px circle, accent color background
- Animation: `pulse 2s ease-in-out infinite` (scale 0.8→1, opacity 0.4→1)
- Used next to "Live" text and live tournament indicators

### Background Gradient Mesh

Every major section uses 2–3 `radial-gradient` ellipses for visual depth:

```css
background:
  radial-gradient(ellipse 65% 50% at 70% 20%, var(--blaze) 5%, transparent),
  radial-gradient(ellipse 45% 40% at 15% 75%, var(--field) 3%, transparent),
  radial-gradient(ellipse 35% 30% at 85% 70%, var(--crown) 3%, transparent),
  linear-gradient(180deg, var(--bg) 0%, var(--bg-alt) 100%);
```

- Colors at very low opacity (3–10%)
- Positioned asymmetrically
- Dark mode: bump opacity ~2–4% higher
- Linear gradient base from `--bg` to `--bg-alt` for vertical transition

### Decorative Rings

- Positioned absolute, various sizes (140–320px)
- `1px solid` accent color at 3–5% opacity
- Animation: `spin 30–50s linear infinite` (some reversed)
- Pointer-events: none

---

## Animation & Motion

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| Theme transition | `0.4s` | ease | All theme-aware properties |
| Card hover lift | `0.3s` | ease | `translateY(-3px)` + shadow upgrade |
| Float | `5–6s` | ease-in-out infinite | Hero rating card, floating pills |
| Pulse dot | `1.5–2s` | ease-in-out infinite | Live indicators |
| Ring spin | `30–50s` | linear infinite | Decorative background rings |

---

## Critical Rules

1. **Light mode is the DEFAULT.** Dark mode is a user toggle.
2. **NEVER use pure white `#FFFFFF` as a page background.** Always `--bg` (`#FAFAF6` light, `#0E1015` dark).
3. **Cards should NEVER be the same color as their background.** Use tint or bold treatment.
4. **In dark mode, avoid Slate for cards.** Use warm brown-black gradients (`#1E1B16`) to prevent too-much-blue.
5. **Section labels** always use JetBrains Mono uppercase with a 20px line before them.
6. **The Clutch Rating gauge** is always Crown-colored.
7. **Feature cards** have a 3px left border in their accent color.
8. **All buttons** use Bricolage Grotesque, 12px radius, 14px 26px padding.
9. **Serif accent words** are Instrument Serif italic, 1.05em, ONE per headline max.
10. **Nav bar** is always Slate navy in both modes — it's the structural constant.
11. **Don't change any functionality, routing, data fetching, or business logic.** Only visual styling.

---

## Implementation Order

1. **Theme foundation** — CSS variables / theme provider with all tokens above, light/dark toggle
2. **Font loading** — Google Fonts link, CSS custom properties
3. **Global styles** — page background, text colors, base font
4. **Navigation** — Slate nav bar, brand mark, active states
5. **Buttons** — Primary, Secondary, Ghost variants
6. **Cards** — Tinted, Bold, and Floating Pill patterns
7. **Gauge component** — SVG ring with Crown colors
8. **Section labels & badges** — JetBrains Mono patterns
9. **Background meshes** — Radial gradients on major sections
10. **Animations** — Float, pulse, hover, theme transitions
11. **Page-by-page application** — Landing → Dashboard → Rating → other pages
