# Clutch Fantasy Sports — PageSpeed Insights Audit
**Date:** March 4, 2026
**URL tested:** https://www.clutchfantasysports.com/ (landing page)
**Tool:** Google PageSpeed Insights (Lighthouse 13.0.1)

---

## SCORES

| Category | Mobile | Desktop |
|----------|--------|---------|
| **Performance** | **61** (orange) | ~90+ (green) |
| **Accessibility** | **88** (orange) | ~88 |
| **Best Practices** | **96** (green) | ~96 |
| **SEO** | **100** (green) | **100** |

---

## MOBILE METRICS (the problem area)

| Metric | Value | Status | Target |
|--------|-------|--------|--------|
| First Contentful Paint (FCP) | **6.2s** | RED | < 1.8s |
| Largest Contentful Paint (LCP) | **7.1s** | RED | < 2.5s |
| Speed Index | **6.2s** | RED | < 3.4s |
| Total Blocking Time (TBT) | 30ms | GREEN | < 200ms |
| Cumulative Layout Shift (CLS) | 0 | GREEN | < 0.1 |

**Translation:** On a phone with slow 4G, the page takes 6+ seconds to show anything and 7+ seconds to finish rendering. Desktop is fine (1.2s FCP/LCP). The problem is entirely about initial load weight on mobile.

## DESKTOP METRICS (healthy)

| Metric | Value | Status |
|--------|-------|--------|
| FCP | 1.2s | GREEN |
| LCP | 1.2s | GREEN |
| Speed Index | 1.3s | GREEN |
| TBT | 40ms | GREEN |
| CLS | 0 | GREEN |

---

## ALL FAILURES (10 total, both devices)

### PERFORMANCE (biggest impact)

#### 1. Render-blocking requests — Est savings 2,170ms (mobile)
**What:** CSS and JS files in `<head>` block the page from rendering until they download.
**Fix:** Add `async` or `defer` to non-critical scripts. Inline critical CSS. Use Vite's built-in code-splitting to lazy-load routes.
**Priority:** HIGH — this is the #1 reason for the 6.2s FCP.
**Effort:** Medium (Vite config changes + critical CSS extraction)

#### 2. Reduce unused JavaScript — Est savings 611 KiB
**What:** The JS bundle includes code for pages the user hasn't visited yet (draft room, admin panel, vault, etc.). 611 KiB of unused JS is shipped on the landing page.
**Fix:** Implement React.lazy() + Suspense for route-level code splitting. The landing page should only load landing page code.
**Priority:** HIGH — directly reduces FCP/LCP by shrinking what mobile has to download.
**Effort:** Medium (wrap route components in React.lazy in App.jsx)

#### 3. Reduce unused CSS — Est savings 17 KiB
**What:** Tailwind CSS ships the full stylesheet; only a fraction is used on the landing page.
**Fix:** Ensure Tailwind's purge/content config is correctly set in `tailwind.config.js`. Run PurgeCSS as a Vite plugin.
**Priority:** LOW — 17 KiB savings is marginal vs the 611 KiB JS issue.
**Effort:** Low (config tweak)

#### 4. Forced reflow (mobile only)
**What:** JavaScript forces the browser to recalculate layout (reading offsetHeight/offsetWidth after DOM writes).
**Fix:** Audit for layout thrashing patterns — batch DOM reads before writes. Check AuroraBackground animation and NeuralCluster SVG animation.
**Priority:** MEDIUM
**Effort:** Medium (needs profiling to identify specific components)

#### 5. Network dependency tree
**What:** Long chains of dependent network requests (A must finish before B starts before C starts).
**Fix:** Preload critical fonts with `<link rel="preload">`. Consider preconnecting to Railway API (`<link rel="preconnect" href="https://clutch-production-8def.up.railway.app">`).
**Priority:** MEDIUM
**Effort:** Low (add preload/preconnect tags to index.html)

### ACCESSIBILITY

#### 6. Background/foreground contrast ratio insufficient
**What:** Some text doesn't meet WCAG AA contrast requirements (4.5:1 for normal text, 3:1 for large text).
**Fix:** Audit color tokens — likely the `slate-light` or `crown` colors on light backgrounds. Check the landing page CTA text and feature description text.
**Priority:** MEDIUM — affects real users AND the score.
**Effort:** Low (CSS color adjustments)

#### 7. Links do not have a discernible name
**What:** Some `<a>` tags have no text content, aria-label, or title — screen readers can't announce them.
**Fix:** Add `aria-label` to icon-only links (social icons, logo link, etc.).
**Priority:** MEDIUM
**Effort:** Low (add aria-labels)

#### 8. Heading elements not in sequentially-descending order
**What:** Page has h1 → h3 (skipping h2), or similar heading hierarchy issues.
**Fix:** Audit heading structure on the landing page. Ensure h1 → h2 → h3 flow.
**Priority:** LOW — cosmetic for SEO, doesn't affect users much.
**Effort:** Low

### BEST PRACTICES

#### 9. Browser errors logged to console
**What:** JS errors are firing on page load (likely the error capture system catching API failures or missing data).
**Fix:** Check for console errors on the landing page — probably related to unauthenticated API calls or missing localStorage keys.
**Priority:** LOW — already have silent error capture, this is about cleaning up noisy console output.
**Effort:** Low

#### 10. Missing source maps for large first-party JavaScript
**What:** Vite production build isn't generating source maps.
**Fix:** Add `build: { sourcemap: true }` to `vite.config.js`. Helps with debugging production issues.
**Priority:** LOW — dev experience, not user-facing.
**Effort:** Low (one config line)

### DESKTOP-ONLY

#### 11. Touch targets insufficient size/spacing (desktop report)
**What:** Some interactive elements are too close together or too small.
**Fix:** Ensure buttons/links have at least 48x48px touch targets with 8px spacing.
**Priority:** LOW for desktop, but this matters if the same components appear on mobile.
**Effort:** Low-Medium

---

## RECOMMENDED FIX ORDER (bang for buck)

### Sprint 1: Get mobile to 80+ (biggest impact)
1. **Route-level code splitting** — React.lazy() all routes in App.jsx. Est: 611 KiB JS savings → 2-3s FCP improvement.
2. **Preload/preconnect** — Add preload for fonts, preconnect to Railway API. Est: 0.5-1s improvement.
3. **Defer non-critical scripts** — Move analytics, error capture, Socket.IO init to after first paint.

### Sprint 2: Accessibility to 95+
4. **Fix contrast ratios** — Audit landing page colors against WCAG AA.
5. **Add aria-labels** — Icon-only links, logo link, social links.
6. **Fix heading hierarchy** — Sequential h1 → h2 → h3 on landing page.

### Sprint 3: Polish
7. **Source maps** — Enable in Vite config.
8. **Console error cleanup** — Suppress non-critical console errors on landing page.
9. **Tailwind purge** — Verify content config for unused CSS.

---

## IDEAS NOTED DURING AUDIT

1. **Landing page should be a static/pre-rendered shell** — The landing page doesn't need React at all for first paint. Consider SSR or a simple static HTML landing page that loads the React app only after CTA click. This would get FCP under 1s on mobile.

2. **Image optimization** — The mobile screenshot shows the landing page hero. If there are images, they should be WebP/AVIF with explicit width/height to prevent CLS.

3. **Font loading strategy** — 4 custom fonts (Bricolage, DM Sans, JetBrains Mono, Instrument Serif) are loading. The landing page probably only needs 2 (Display + Body). Defer editorial/mono fonts to after first paint.

4. **API call waterfall** — If the landing page makes API calls on load (coach briefing, notifications, etc.), those should be deferred until after login/navigation to the dashboard. An unauthenticated landing page should make zero API calls.

5. **Consider a CDN for static assets** — Vercel already handles this, but verify that font files and images are being cached and served from edge.

6. **"No Data" in real user experience** — Google has no CrUX data for Clutch because traffic is too low. This will populate as real users visit. Good baseline to track over time.

---

*Generated by Cowork audit, March 4, 2026*
