# LANDING PAGE REBUILD SPEC
## Clutch Fantasy Sports — March 2026

> **Context:** This spec rebuilds `frontend/src/pages/Landing.jsx` from scratch using the Edge Doctrine v2 narrative, powered by Magic UI animated components. The current page (875 lines) uses retired "credit score" / "receipts" framing and hand-rolled animations. This replaces it with a premium, conversion-focused page that looks like a funded startup, not a developer side project.
>
> **Read first:** `docs/CLUTCH_EDGE_DOCTRINE_v2.md` — the product philosophy driving every word on this page.

---

## TECH REQUIREMENTS

### Install Dependencies
```bash
cd frontend
npm install framer-motion clsx tailwind-merge
```

### Install Magic UI Components (copy-paste via CLI)
```bash
npx shadcn@latest add "https://magicui.design/r/animated-gradient-text"
npx shadcn@latest add "https://magicui.design/r/shimmer-button"
npx shadcn@latest add "https://magicui.design/r/bento-grid"
npx shadcn@latest add "https://magicui.design/r/magic-card"
npx shadcn@latest add "https://magicui.design/r/number-ticker"
npx shadcn@latest add "https://magicui.design/r/animated-list"
npx shadcn@latest add "https://magicui.design/r/particles"
npx shadcn@latest add "https://magicui.design/r/dot-pattern"
npx shadcn@latest add "https://magicui.design/r/blur-fade"
npx shadcn@latest add "https://magicui.design/r/word-rotate"
npx shadcn@latest add "https://magicui.design/r/typing-animation"
```

> **Note:** Magic UI uses the shadcn CLI with remote URLs. Components are copied into `frontend/src/components/ui/` as local files you own. No external runtime dependency. If the shadcn CLI init hasn't been run yet, run `npx shadcn@latest init` first and configure for React + Vite + Tailwind + src/components/ui path alias.

### Tailwind Config
Ensure `tailwind.config.js` has:
- `darkMode: 'class'` (already configured)
- The Magic UI components may add animation keyframes — accept them

### Existing Assets to Keep
- `ClutchLogo` component (`components/common/ClutchLogo.tsx`)
- `Button` component (`components/common/Button.jsx`)
- `ThemeContext` / `useTheme` hook
- Brand color tokens (CSS variables in `index.css`)
- Font stack: Bricolage Grotesque (display), DM Sans (body), JetBrains Mono (data), Instrument Serif (editorial)

---

## PAGE STRUCTURE — 8 SECTIONS

The narrative follows the Edge Doctrine's landing page arc exactly. Each section maps to a doctrine principle.

---

### SECTION 1 — HERO
**Doctrine mapping:** "The more you put in, the further ahead you get."

**Layout:** Full viewport height. Centered text. Particles background (subtle, floating dots). Sticky nav above.

**Components:**
- `Particles` — background effect, low density (quantity: 40), brand colors (blaze + crown), mouse-interactive
- `AnimatedGradientText` or `WordRotate` — headline word cycling
- `ShimmerButton` — primary CTA
- `BlurFade` — stagger content entrance (headline → subhead → CTA)

**Content:**
```
[Nav: Logo | Golf Hub | Import | Prove It | Log In | [Create League - shimmer button]]

[Particles background — subtle, cream/dark adaptive]

[BlurFade stagger, 150ms delays]

Headline (font-display, 56-70px):
"The more you put in,
the further ahead you get."

Subhead (font-body, 18px, text-2 color):
"A private AI co-pilot that learns how you play fantasy sports —
your draft tendencies, your roster habits, your blind spots —
and gets sharper every season."

[ShimmerButton, blaze gradient]:
"Start Building Your Edge"

[Secondary link, subtle]:
"Already have a league? Import it →"

[Mono tag below CTAs]:
"Season-long fantasy · Golf live · NFL Fall 2026"
```

**No floating cards, no mock data, no rating gauge.** The hero is copy-driven with atmospheric background. Clean, premium, Linear-inspired.

---

### SECTION 2 — THE PROBLEM
**Doctrine mapping:** "Fantasy has always confused luck with skill."

**Layout:** Dark section (slate background in light mode, deep dark in dark mode). Centered editorial text. Subtle radial glow behind text.

**Components:**
- `BlurFade` — text entrance
- No Magic UI needed — just typography and atmosphere

**Content:**
```
[font-editorial italic, 36-48px, cream text]

"The best manager in your league
might not have the ring."

[font-body, 15px, muted text, max-w-560px]
"Fantasy rewards luck as much as skill. You can make the right
call every week and still lose to the schedule. Clutch doesn't
fix variance — but it finds the specific edges that tilt it
back in your favor."

[font-mono, 11px, crown color]
"BUILT FOR THE MANAGER WHO DOES THE WORK"
```

---

### SECTION 3 — THE "AI vs AI" REFRAME
**Doctrine mapping:** "It's not AI vs AI. It's you vs. a worse version of you."

**Layout:** Two-column on desktop (text left, visual right). Light background. This is the key differentiation section.

**Components:**
- `BlurFade` — content entrance
- `MagicCard` — two cards side by side showing "Your co-pilot" vs "Their co-pilot"
- `NumberTicker` — animated stat numbers inside cards

**Content:**
```
[Section label: font-mono, "THE AI QUESTION"]

[Headline, font-display, 36-44px]:
"Everyone in your league gets the same platform.
Nobody gets the same co-pilot."

[Body, font-body, 15px, max-w-520px]:
"Your co-pilot is built from you — every mock draft, every
trade review, every Lab session. Theirs is built from them.
If they half-ass it, their co-pilot half-asses it back."

[Two MagicCard components side by side]

Card 1 — "Your Co-Pilot" (spotlight effect, blaze accent):
- Mock drafts completed: [NumberTicker → 14]
- Lab sessions this month: [NumberTicker → 23]
- Draft board refined: [NumberTicker → 8] times
- Blind spots identified: [NumberTicker → 3]
- "Your co-pilot knows your tendencies."

Card 2 — "Their Co-Pilot" (muted, no spotlight, gray):
- Mock drafts completed: 0
- Lab sessions this month: 2
- Draft board refined: 0 times
- Blind spots identified: —
- "Their co-pilot has nothing to work with."

[Pull quote below cards, font-editorial italic, 18px]:
"Same software. Completely different weapons."
```

---

### SECTION 4 — TWO LAYERS
**Doctrine mapping:** Public leaderboards vs. private co-pilot. Never conflate them.

**Layout:** `BentoGrid` with two large cards. Clear visual separation between public and private.

**Components:**
- `BentoGrid` + `BentoCard` — two cards, asymmetric sizes
- `AnimatedList` — inside the public card, showing leaderboard entries
- `BlurFade` — section entrance

**Content:**
```
[Section label: "HOW IT WORKS"]

[Headline, font-display]:
"Two layers. Two jobs. Never mixed."

[BentoGrid — two cards]

Card 1 — "The Scoreboard" (60% width, field/green accent):
  Subtitle: "Public · Competitive · Bragging rights"
  [AnimatedList showing mock leaderboard entries]:
  - 🏆 ChaseTheTrophy — 82.6% accuracy — 147-31
  - StatSurgeon — 81.5% accuracy — 128-29
  - ClutchCallKing — 78.7% accuracy — 122-33
  Caption: "Win rates. Head-to-head records. Pick accuracy.
  Everyone sees this. This is where you talk trash."

Card 2 — "Your Edge" (40% width, crown/gold accent, darker):
  Subtitle: "Private · Personal · Compounding"
  [Icon list, no animation]:
  - 🎯 Draft Intelligence — "You reach in rounds 3-5"
  - 📊 Roster Gaps — "Slow to react after injuries"
  - 🧠 Research Depth — "Off-season engagement is your gap"
  - ⚡ One Action — "Run 2 mock drafts this week"
  Caption: "Only you see this. This is what you do
  before you show up and beat them."
```

---

### SECTION 5 — THE FIVE COMPETENCIES
**Doctrine mapping:** Draft Intelligence, In-Season Management, Trade Acumen, Research Depth, Decision Quality.

**Layout:** Five compact cards in a horizontal scroll (mobile) or grid (desktop). Each card has an icon, title, one-line description, and 2-3 behavioral signals.

**Components:**
- `MagicCard` — five cards with spotlight hover effect
- `BlurFade` — staggered card entrance

**Content:**
```
[Section label: "WHAT YOUR CO-PILOT WATCHES"]

[Headline, font-display]:
"Five competencies. All behavioral.
Wins and losses don't move these numbers."

[5 MagicCards in a row/grid]

1. Draft Intelligence (blaze accent)
   "Mock drafts, ADP study, board refinement, post-draft review"
   Signal: "Watched 14 mock drafts → Board getting sharper"

2. Roster Management (field accent)
   "Lineup decisions, waiver timing, injury response speed"
   Signal: "Responded to injury within 4 hours → Top 10%"

3. Trade Acumen (crown accent)
   "Buy-low timing, trade frequency, negotiation behavior"
   Signal: "3 trades won out of 4 this season"

4. Research Depth (slate accent)
   "Lab time, pick accuracy, off-season engagement"
   Signal: "Pick accuracy up 8% since October"

5. Decision Quality (blaze accent)
   "Process consistency, confidence calibration, post-mortem habit"
   Signal: "Stayed disciplined at 1-5 → Better than 90% of managers"
```

---

### SECTION 6 — COACH VIEW vs GAMIFIED VIEW
**Doctrine mapping:** Two presentation modes. Same engine, different skin.

**Layout:** Two-column comparison. Left = Coach View (clean, minimal). Right = Gamified View (XP bars, tiers). Toggle between them.

**Components:**
- `MagicCard` — two side-by-side views
- Subtle tab toggle above

**Content:**
```
[Section label: "YOUR CHOICE"]

[Headline, font-display]:
"Pick your style. Same intelligence underneath."

[Toggle: Coach View | Gamified View]

Coach View card:
  "No numbers. No gamification. Just the breakdown."
  - Your strongest competency: Trade Acumen
  - Your biggest gap: Off-season research depth
  - One action this week: Run 2 mock drafts
  - Pattern: "Your trades have been your edge for 3 years.
    Your draft prep has been inconsistent."

Gamified View card:
  "XP. Tiers. Challenges. Same coaching, dopamine-friendly."
  - Overall: Gold III → [progress bar 72%] → Clutch tier
  - Draft Intelligence: Silver II [XP bar]
  - Weekly Challenge: "Complete 2 mock drafts (+150 XP)"
  - Streak: 🔥 4 weeks active
```

---

### SECTION 7 — IMPORT CTA
**Doctrine mapping:** "Bring your history. Let's find your gaps."

**Layout:** Dark section. Single centered CTA. High-intrigue, low-friction.

**Components:**
- `ShimmerButton` — primary CTA (gold/crown shimmer)
- `Particles` — subtle background, lower density than hero
- `BlurFade` — entrance

**Content:**
```
[Dark background, radial crown glow]

[font-editorial italic, 36-48px, cream]:
"You've always been good.
Now you'll know exactly what to fix."

[font-body, 15px, muted]:
"Import from ESPN, Yahoo, Sleeper, Fantrax, or MFL.
Your co-pilot starts learning from day one."

[ShimmerButton, crown/gold]:
"Import Your League History"

[Below button, font-mono, 11px]:
"Free · Takes 2 minutes · All seasons preserved"
```

---

### SECTION 8 — FOOTER
**Layout:** Minimal. Logo, nav links, social, theme toggle.

**Content:**
```
[ClutchLogo] Clutch Fantasy Sports

Links: Golf Hub · NFL Hub · Prove It · The Lab · Import · Blog
Legal: Privacy · Terms
Social: Twitter/X · Discord

[font-mono, 10px, muted]:
"Season-long fantasy. No gambling. No noise."
```

---

## LANGUAGE RULES (from Edge Doctrine)

### Use everywhere on this page:
- "Your co-pilot" / "your edge" / "your coach"
- "The more you put in, the further ahead you get"
- "Private. Compounding. Yours."
- "Your co-pilot only knows what you've taught it"

### Never use on this page:
- "Credit score" — RETIRED
- "Receipts" — RETIRED
- "Get graded" — RETIRED
- "One number for everything you know" — RETIRED
- "Know how good you are" — RETIRED
- Any language implying AI does the work for you

---

## WHAT THIS REPLACES

The current `Landing.jsx` (875 lines) has these problems:
1. Hero says "Prove You Know Sports" — wrong framing, sounds like a quiz
2. Right side has floating Clutch Rating card with "Your Clutch Rating" gauge — credit score framing
3. Editorial section says "Everyone's got opinions. We've got receipts." — RETIRED language
4. "Why Clutch" section says "One number for everything you know" — RETIRED
5. Score Breakdown section shows outcome metrics (Prediction Accuracy, Win Rate, etc.) — wrong model
6. Mock leaderboard with mock data doesn't sell anything
7. All animations are hand-rolled CSS (float, spin-slow, pulse-dot) — amateur compared to Framer Motion
8. Inline styles everywhere instead of Tailwind classes
9. No scroll animations, no entrance effects, no interactive hover states
10. 875 lines of monolithic JSX with no component extraction

**Delete the entire current Landing.jsx and rebuild from scratch.**

---

## IMPLEMENTATION NOTES

1. **Component extraction:** Each section should be its own component in `components/landing/` (HeroSection, ProblemSection, AiReframeSection, TwoLayersSection, CompetenciesSection, ViewToggleSection, ImportCtaSection, LandingFooter). Landing.jsx imports and composes them.

2. **Dark mode:** All sections must work in both light and dark mode. Use CSS variables (`var(--bg)`, `var(--surface)`, `var(--text-1)`, etc.) and `dark:` Tailwind prefixes.

3. **Mobile-first:** Design for 390px width first (iPhone 14). Desktop enhancements via `sm:`, `md:`, `lg:` breakpoints. Minimum 44px touch targets. Sticky CTA on mobile.

4. **Performance:** Lazy-load below-fold sections. Particles component should use `lazy` prop or only render after hero is visible. Keep total bundle impact under 50KB for Magic UI components.

5. **No mock data that looks fake:** The leaderboard in Section 4 should feel illustrative, not like dummy data. Use realistic-looking usernames and stats.

6. **Scroll behavior:** Use `BlurFade` from Magic UI on every section entrance. Stagger child elements by 100-150ms. This single effect makes the whole page feel premium.

7. **SEO:** Keep semantic HTML — `h1` only on hero headline, `h2` on section headlines, proper `section` + `aria-label` tags.

---

## SUCCESS CRITERIA

- [ ] Visitor immediately understands: "This is a private AI co-pilot for fantasy managers"
- [ ] No "credit score" or "receipts" language anywhere
- [ ] Page feels like a funded startup, not a developer project
- [ ] Every section has smooth entrance animation (BlurFade)
- [ ] MagicCard hover spotlight works on the AI comparison and competency cards
- [ ] ShimmerButton CTAs have visible shimmer effect
- [ ] Particles background renders smoothly without performance issues
- [ ] Full dark mode support
- [ ] Mobile responsive at 390px
- [ ] Total page load < 3 seconds on 4G
- [ ] Lighthouse performance score > 80

---

*Spec created: March 24, 2026*
*Author: Eric + Cowork*
*References: CLUTCH_EDGE_DOCTRINE_v2.md, Magic UI docs (magicui.design)*
