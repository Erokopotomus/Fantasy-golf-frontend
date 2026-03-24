# Landing Page V2 — "The AI Is Already Alive" Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the landing page from boring brochure to cutting-edge dark AI platform feel — Linear/Vercel energy with sports intensity.

**Architecture:** 8 section components in `frontend/src/components/landing/`, composed by `frontend/src/pages/Landing.jsx`. Dark-first landing page using existing Magic UI components (Particles, BlurFade, ShimmerButton, MagicCard, NumberTicker, AnimatedList, AnimatedGradientText, WordRotate, TypingAnimation, DotPattern). No new dependencies.

**Tech Stack:** React, Tailwind CSS v3, Framer Motion (via motion/react), Magic UI components, existing Clutch brand tokens.

---

## Design Decisions

### Dark-first landing page
The landing page uses a dark color scheme regardless of the user's theme preference. This is the storefront — it needs to look premium. The app itself stays light-first.

### Visual language
- **Gradient orbs**: Large, soft, animated background blobs (CSS radial-gradients with animation)
- **Glassmorphic cards**: backdrop-blur, semi-transparent backgrounds, glowing borders
- **Gradient text**: AnimatedGradientText on key headlines (blaze → crown cycling)
- **Neural particles**: Particles component with higher visibility, connection feel
- **Glow effects**: box-shadow glows on cards, buttons, accents
- **Tight spacing**: No more "floating in void" — dense, intentional whitespace

### Color palette for landing (dark context)
- Background: `#07080C` (near-black with blue tint)
- Surface: `rgba(255,255,255,0.04)` to `rgba(255,255,255,0.08)`
- Borders: `rgba(255,255,255,0.08)` with glow on hover
- Primary glow: blaze `#F06820` → crown `#D4930D`
- Secondary glow: `#7C3AED` (purple) for AI/neural accents
- Text: `#F0EDE6` (cream), `#908C84` (muted), `#5C5952` (faint)

---

## Tasks

### Task 1: HeroSection.jsx — "The brain is on"
**Files:** Modify `frontend/src/components/landing/HeroSection.jsx`

- Dark background `#07080C` with NO theme awareness — always dark
- Large animated gradient orb: CSS radial-gradient with slow rotation animation (blaze → crown → purple → blaze)
- AnimatedGradientText on headline (blaze → crown cycling)
- WordRotate in subhead cycling: "your draft tendencies" → "your roster habits" → "your blind spots" → "your trading patterns"
- Particles with quantity=80, larger size=1.0, mixed colors
- DotPattern behind everything for grid depth (glow=true, low opacity)
- Remove the landing-specific nav (the app nav is already showing) — just show the hero content
- Tighter vertical spacing — content starts higher, less dead space
- ShimmerButton with glow halo (box-shadow)

### Task 2: ProblemSection.jsx — "The gut punch"
**Files:** Modify `frontend/src/components/landing/ProblemSection.jsx`

- Background: slightly lighter dark `#0C0E14`
- TypingAnimation on the editorial quote — types character by character
- Larger, more dramatic pulsing glow behind the text (blaze tinted)
- Tighter section padding
- "BUILT FOR THE MANAGER WHO DOES THE WORK" gets a subtle AnimatedGradientText treatment

### Task 3: AiReframeSection.jsx — "The split personality"
**Files:** Modify `frontend/src/components/landing/AiReframeSection.jsx`

- Background: `#07080C`
- "Your Co-Pilot" card: glassmorphic — `backdrop-blur-xl`, `bg-white/[0.04]`, animated gradient border (blaze → crown), subtle glow
- "Their Co-Pilot" card: dead/dim — `bg-white/[0.02]`, gray border, no glow, lower opacity text
- NumberTicker animates on scroll into view (already does this)
- AnimatedGradientText on the "Nobody gets the same co-pilot." line
- Pull quote gets a glow treatment

### Task 4: TwoLayersSection.jsx — "The split"
**Files:** Modify `frontend/src/components/landing/TwoLayersSection.jsx`

- Full-bleed visual split: left card lighter surface, right card darker with gold glow
- Both cards glassmorphic with backdrop-blur
- AnimatedList entries have glassmorphic styling
- "Your Edge" card has a subtle scanning line animation (CSS) — a horizontal line that sweeps top to bottom slowly, like the AI is scanning
- DotPattern behind the section for grid texture
- Tighter spacing, more visual density

### Task 5: CompetenciesSection.jsx — "The pentagon"
**Files:** Modify `frontend/src/components/landing/CompetenciesSection.jsx`

- Background: `#0C0E14`
- Replace boring card row with an interactive pentagon/radar visualization at center
- 5 nodes around a pentagon, each with a glowing dot in its accent color
- Connecting lines between nodes with subtle pulse animation
- Below the pentagon: 5 compact glassmorphic cards in a row/scroll
- Each card has a glowing top-border accent in its color
- DotPattern behind for depth
- Signal text in mono with a subtle typewriter feel

### Task 6: ViewToggleSection.jsx — "Feel the difference"
**Files:** Modify `frontend/src/components/landing/ViewToggleSection.jsx`

- Background: `#07080C`
- Side-by-side cards (not toggle) — both visible simultaneously
- Coach View: clean, dark glassmorphic, minimal
- Gamified View: XP bars that animate with gradient fills, tier badge with glow, streak flame emoji
- Cards have animated gradient borders
- "VS" divider between them with a glow

### Task 7: ImportCtaSection.jsx — "The closer"
**Files:** Modify `frontend/src/components/landing/ImportCtaSection.jsx`

- Aggressive gradient orb (larger than hero, more saturated)
- AnimatedGradientText on the editorial quote (crown → blaze)
- ShimmerButton with crown glow halo and pulse animation
- Platform logos row: ESPN, Yahoo, Sleeper, Fantrax, MFL — white/muted, spaced evenly
- Particles with higher quantity
- Tighter, more intense

### Task 8: LandingFooter.jsx — "Clean close"
**Files:** Modify `frontend/src/components/landing/LandingFooter.jsx`

- Dark background matching landing
- ClutchLogo with subtle glow
- Minimal links, tight spacing
- "Private. Compounding. Yours." tagline in gradient text

### Task 9: Landing.jsx — orchestrator cleanup
**Files:** Modify `frontend/src/pages/Landing.jsx`

- Force dark background on the entire page wrapper
- Ensure no theme-dependent styles leak through
- Hide the app nav overflow if needed

### Task 10: Build verification + language audit
- `npm run build` passes
- Grep for retired language
- Visual check: no beige/cream backgrounds, no flat CSS, everything glows

---

## Execution: Subagent-Driven

Dispatch tasks 1-8 in parallel (all independent component rewrites), then tasks 9-10 sequentially.
