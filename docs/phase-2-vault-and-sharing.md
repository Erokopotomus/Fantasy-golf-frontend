# League Vault — Phase 2 Implementation Plan

You just finished the Claim Mode (team-to-owner assignment flow). Now we're building the three pieces that come AFTER assignment is complete. These should be implemented in order since each builds on the previous.

Reference prototypes are attached as JSX files. Use them as visual/interaction guides but implement against our actual codebase, data models, and component library.

---

## PHASE 2A: The Vault Reveal (Confirmation Step Replacement)

### What It Is
Replace the current plain confirmation step (Step 3) with a cinematic reveal experience. When the commissioner finishes assigning teams and clicks "Review & Save", instead of showing a boring form review, we show them their league's unified history for the first time — big animated stats, ranked owner cards, sparklines, championship trophies.

### When It Triggers
- Only on FIRST completion of team assignment (store a flag like `hasSeenVaultReveal` per league)
- After the commissioner clicks "Review & Save" from the claim mode (Step 2)

### The Flow
1. **Loading transition** (2-2.5 seconds): Dark screen, "Building your league history..." text with a pulsing animation, and a progress bar that fills. Even if data processing is instant, this artificial pause creates anticipation. Keep it short enough to not be annoying.

2. **Reveal**: Screen transitions to the vault view with staggered animations:
   - Title area fades up first: "Your League History is Ready" subtitle + "League Vault" in shimmer gold gradient text
   - League headline stats count up with eased animation (total seasons, total owners, total games played, total points scored, total championships). Stagger each stat's start by ~150ms.
   - "All-Time Owner Rankings" section divider fades in
   - Owner cards cascade in one by one with ~80-100ms stagger delay, sorted by all-time win percentage descending

3. **Owner Cards**: Each card is a horizontal row showing:
   - Rank number (#1 gets an animated crown SVG that gently bobs)
   - Owner avatar (first initial in colored circle with owner's assigned color)
   - Name + metadata (season count, best season name + year, active/former badge)
   - Sparkline showing win% by season (small SVG, chronological left-to-right)
   - All-time record (W-L)
   - Win percentage (green if ≥60%, red if <50%, neutral otherwise)
   - Total PF (abbreviated, e.g., "20.6k")
   - Championship trophies (🏆 emojis, stacked)

4. **Owner Detail Modal**: Clicking any owner card opens a modal with:
   - Larger avatar, name, rank, season count
   - Stat grid: Record, Win %, Titles, Total PF
   - Larger sparkline with season year labels on x-axis
   - Season-by-season table: year, team name, record (color-coded W/L), PF, championship indicator

5. **Save CTA**: Below the owner cards:
   - "Everything look right?" confirmation text
   - "Save & Unlock Your League Vault" button (gold gradient, prominent)
   - "You can edit assignments anytime in League Settings" subtext
   - On click: persist all assignments, set `hasSeenVaultReveal = true`, redirect to the persistent vault view

### Data Requirements
Compute from the assignment mapping + imported season data:
- Per owner: total W, total L, total PF, total PA, win%, title count, best season (highest win%), win% array by season (for sparkline)
- Per league: total unique seasons, total owners, total games (sum of all W+L divided by 2), total PF across all owners, total championships

### Reference Prototype
See `league-reveal.jsx` — this is the standalone reveal experience.

---

## PHASE 2B: Dual-Mode Vault (First Visit vs Returning)

### What It Is
The League Vault page needs two rendering modes sharing the same layout/components:
1. **First Visit Mode**: The cinematic reveal from Phase 2A (animations, counting numbers, staggered cards, save CTA)
2. **Returning Visit Mode**: Same page, instant load, no animations, with live season data

### How To Determine Mode
```
if (!league.hasCompletedImport) → redirect to import flow
else if (!user.hasSeenVaultReveal[leagueId]) → First Visit Mode
else → Returning Visit Mode
```

After the first visit reveal + save, set the flag and all subsequent visits use returning mode.

### Differences Between Modes

| Element | First Visit | Returning Visit |
|---------|-------------|-----------------|
| Loading screen | Yes (2.2s) | No |
| "Your History is Ready" subtitle | Yes | No |
| Title shimmer animation | Yes | No (static gold text) |
| Stat counting animation | Yes | No (instant numbers) |
| Card stagger animation | Yes (80ms per card) | No (all visible immediately) |
| Save CTA at bottom | Yes | No |
| Live season indicators | No (data just imported) | Yes |
| Subtitle content | "X years unified for the first time" | "X seasons · Y owners · ● 2024 Season Live" |

### Live Season Indicators (Returning Mode Only)
For owners with an active/in-progress season:
- Green pulse dot on their avatar in the owner row
- Current season record shown inline next to their name (e.g., "5-3" in green)
- In the detail modal: a highlighted "2024 — In Progress" card at the top showing current team name, record, and week number, styled with the owner's color, ABOVE the historical stats

### Active Only Filter
Add an "Active Only" toggle button next to the rankings section header. When enabled, filter out owners marked as `active: false`. Preserve ranking numbers from the full list (so if #3 is filtered out, you see #1, #2, #4...).

### Shared Components
Extract these into reusable components since they're used in both modes AND in the share/invite flow later:
- `OwnerRow` — the horizontal card for the rankings list
- `OwnerDetailModal` — the click-through career breakdown
- `Sparkline` — the mini win% trend SVG
- `AnimatedNumber` — counting animation (only runs if `animate` prop is true)
- `Crown` — the SVG crown icon with optional bob animation
- `StatGrid` — the 4-up stat boxes (Record, Win%, Titles, PF)

### Reference Prototype
See `vault-dual-mode.jsx` — has a toggle at top to switch between modes for testing. Remove the toggle in production; mode is determined by the flag.

---

## PHASE 2C: Share & Invite Funnel

### What It Is
Three connected pieces that turn the vault reveal into a viral acquisition funnel:
1. **Share Modal** (commissioner sees this after saving the vault)
2. **Invite Email** (personalized per recipient)
3. **Public Landing Page** (what recipients see when they click the link)

### 2C-1: Share Modal

Trigger: After commissioner clicks "Save & Unlock Your League Vault" in the reveal, show this modal (or navigate to this view).

**Shareable Link Section:**
- Generate a unique invite URL: `clutch.gg/vault/{league-slug}/invite`
- "Copy Link" button with copied confirmation state
- Helper text: "Anyone with this link can view the league vault and claim their spot"

**Email Invites Section:**
- List of all active owners (except the commissioner)
- Each row shows: owner avatar, name, rank + record preview, email input field, "Preview" button, "Send" button
- "Send All" button at the top to batch send
- Sent state: button changes to "✓ Sent" with green styling
- "Preview" opens the email preview for that specific person

**Implementation Notes:**
- Email addresses should be optional — some commissioners might not have everyone's email and will just use the link
- Store invite status per owner per league
- The share modal should also be accessible later from League Settings (not just post-reveal)

### 2C-2: Invite Email

Each email is personalized to the recipient. Key personalization points:

**Subject line:** `"{Commissioner} unlocked the {League Name} Vault — you're #{rank} all-time"`

This subject line is critical. It has the commissioner's name (trust), the league name (context), and the recipient's rank (curiosity hook). This is an email people open.

**Email body structure:**
1. Header: "{Commissioner} invited you to {League Name}" + "16 seasons of history. Your legacy, unified."
2. Personal stat card: Recipient's avatar, name, rank, with their 4 key stats (Record, Win%, Titles, Seasons) and their sparkline. Styled in recipient's owner color.
3. Mini leaderboard: Top 6 owners with the recipient highlighted ("← You" indicator). Shows rank, avatar, name, record, win%, trophies.
4. CTA button: "View Your Full History" (gold, prominent)
5. Subtext: "Claim your spot and see your complete season-by-season breakdown, head-to-head records, and where you rank in every stat."
6. Footer: "Sent via Clutch Fantasy · Invited by {Commissioner}"

**Technical notes:**
- The email body needs to be HTML email compatible (tables for layout, inline styles, no flexbox/grid)
- But for the prototype/preview in the app, use normal React
- Consider generating a static image version of the stat card for email clients that block HTML

### 2C-3: Public Landing Page

URL: `clutch.gg/vault/{league-slug}/invite?member={owner-id}` (personalized) or `clutch.gg/vault/{league-slug}/invite` (generic)

**If personalized (clicked from email):**
- Nav bar with Clutch logo + Log In / Sign Up buttons
- Hero: "{Commissioner} invited you to {League Name}"
- Personal stat hero card (large): avatar, name, rank, record, win%, titles, PF, sparkline — all in recipient's color
- Full leaderboard with recipient highlighted
- **Blurred teaser sections**: Show head-to-head records and draft history sections with blur(3px) + 50% opacity + overlay text "Claim your spot to unlock". These tease additional value behind signup.
- CTA: "Claim Your Spot" button → triggers signup flow → on completion, redirect to the full vault view with their first-visit reveal

**If generic (shared via link in group chat):**
- Same layout but no personalized hero card
- Show the league headline stats + full leaderboard
- Blurred teasers still present
- CTA: "Join {League Name}" → signup → they'll need to claim their owner identity on the next screen

**Post-signup flow for invited members:**
1. User creates account (or logs in)
2. If they came from a personalized link, auto-associate them with their owner identity
3. If generic link, show a "Which owner are you?" selector (list of unclaimed owners)
4. Redirect to League Vault in first-visit reveal mode (they get the cinematic experience too)

**Important:** The landing page should work WITHOUT authentication. The whole point is that someone who has never heard of Clutch can click this link, see impressive personalized data, and be motivated to sign up. Don't gate the leaderboard behind auth — gate the deep features (H2H, drafts, etc.) behind it via the blurred teasers.

### Reference Prototype
See `share-experience.jsx` — has tabs to switch between all three views with a recipient selector.

---

## Implementation Order

1. **Phase 2A first** — Get the reveal working as the new Step 3 of the import flow. This is self-contained and replaces the existing confirmation step.

2. **Phase 2B second** — Extract shared components from the reveal and build the returning-visit mode of the vault page. Add the `hasSeenVaultReveal` flag logic.

3. **Phase 2C last** — Build the share modal, email template, and landing page. This depends on the shared components from 2B and the vault data structures from 2A.

## Component Architecture Summary

```
/components/vault/
  OwnerRow.tsx          — Horizontal owner card for rankings
  OwnerDetailModal.tsx  — Full career breakdown modal
  Sparkline.tsx         — Mini SVG win% trend chart
  AnimatedNumber.tsx    — Counting animation component
  Crown.tsx             — Crown SVG with optional animation
  StatGrid.tsx          — 4-up stat display boxes
  VaultReveal.tsx       — First-visit cinematic experience
  VaultPersistent.tsx   — Returning-visit instant view
  VaultPage.tsx         — Router that picks Reveal vs Persistent
  ShareModal.tsx        — Commissioner share/invite modal
  InviteEmail.tsx       — Email template + preview component
  InviteLanding.tsx     — Public landing page for recipients
```

## Data Flow

```
Import Data (Yahoo/ESPN)
  → Claim Mode (team-to-owner mapping)
    → Compute owner stats (W/L/PF/titles/sparklines)
      → Vault Reveal (first view)
        → Share Modal (commissioner sends invites)
          → Invite Email (personalized per member)
            → Landing Page (member clicks through)
              → Signup → Associate owner → Vault Reveal (member's first view)
```

Each step feeds the next. The output of claim mode (assignments) is the input for stat computation, which feeds the vault, which feeds the share funnel, which feeds member acquisition.
