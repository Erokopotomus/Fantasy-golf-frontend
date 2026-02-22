# BUSINESS REFERENCE

> **Moved from CLAUDE.md** — Revenue model, tooling checklist, and competitive insights. Not needed in every coding session but valuable for product decisions.

---

## THIRD-PARTY TOOLS TO INSTALL

### Day One (install as you build)
- [ ] **PostHog** (or start with console logging via analytics abstraction) — Product analytics, funnels, session replay. Free up to 1M events/month.
- [ ] **Sentry** — Error tracking. Captures JS errors, API failures with full context. Free tier.
- [ ] **Vercel Analytics** (if on Vercel) or **Google Analytics 4** — Traffic analytics. Page views, referrers, geography.

### First Month
- [ ] **Stripe** — Payments, subscriptions, financial dashboard built in.
- [ ] **UptimeRobot** — Uptime monitoring, alerts if site goes down. Free for 50 monitors.
- [ ] **Hotjar** — Session recordings, heatmaps. Free tier. Install once you have real users.

### As You Scale
- [ ] **Attention Insight** ($24/mo) — AI-predicted heatmaps for testing page designs pre-launch.
- [ ] **Applitools or Mabl** — Visual regression testing in CI/CD.
- [ ] **Datadog or Grafana Cloud** — Infrastructure monitoring.

---

## REVENUE MODEL

### Subscription Tiers
| Tier | Price | Key Features |
|------|-------|-------------|
| Free | $0 | Full league management, ads, 3 AI Caddie uses/month, current season only, basic predictions |
| Clutch Pro | $7.99/mo | No ads, unlimited AI Caddie, full league history vault, advanced analytics, Draft Wizard, basic trade analyzer, premium themes |
| Clutch Elite | $12.99/mo | All Pro features + priority AI, history exports, full analytics with projections, full AI trade analyzer, mock simulator, full customization |

### Additional Revenue Streams (Future)
- League entry fee processing (5-10% platform fee via Stripe Connect)
- Creator revenue share program
- Branded content partnerships (golf equipment, courses)
- White-label licensing (golf courses, country clubs, corporate events)

---

## KEY COMPETITIVE INSIGHTS

These are research-backed pain points from Reddit, forums, and app reviews that Clutch should solve:

1. **MFL features + Sleeper UX gap** — Nobody combines deep customization with modern mobile UX. We do both.
2. **App crashes on game day** — Sleeper crashed on 2025 NFL opening night. Reliability is a differentiator.
3. **Yahoo hiding features behind paywalls** — Yahoo putting basic lineup tools behind Yahoo+. Users actively migrating.
4. **ESPN slow to innovate** — "Fine except entering waivers is too many clicks." We make everything fewer clicks.
5. **League history loss** — ESPN deleted pre-2018 data. MFL has history but terrible UX. Our League Vault + Migration solves this.
6. **Contract/salary cap dynasty poorly served** — MFL requires custom coding for contracts. We build it native.
7. **DFS/gambling creep** — Sleeper users hate the betting noise. We are explicitly no-gambling.
8. **No prediction accountability** — Every podcast host and Twitter expert talks big with no provable track record. We track accuracy.

---

*Last updated: February 22, 2026*
