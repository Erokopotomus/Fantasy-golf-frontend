# EVENT TRACKING SCHEMA

> **Moved from CLAUDE.md** — Analytics event type definitions. Implementation lives in `frontend/src/services/analytics.js`.

Every meaningful user action should fire an event. Build this as an abstraction layer now, connect to PostHog (or any provider) later.

```typescript
// lib/analytics.ts
type AnalyticsEvent = {
  // Auth
  'user_signed_up': { method: 'email' | 'google' | 'apple' }
  'user_logged_in': { method: string }

  // League
  'league_created': { sport: string, format: string, scoring_type: string }
  'league_joined': { league_id: string, via: 'invite_link' | 'search' | 'direct' }
  'league_settings_updated': { league_id: string, fields_changed: string[] }
  'member_invited': { league_id: string, method: 'link' | 'email' | 'sms' }

  // Draft
  'draft_started': { league_id: string, type: 'snake' | 'auction' | 'linear' }
  'draft_pick_made': { league_id: string, pick_number: number, is_auto: boolean }
  'draft_completed': { league_id: string, duration_minutes: number }

  // Roster
  'lineup_set': { league_id: string, changes_made: number }
  'player_added': { league_id: string, player_id: string, source: 'free_agent' | 'waiver' }
  'player_dropped': { league_id: string, player_id: string }
  'waiver_bid_placed': { league_id: string, amount: number }

  // Trading
  'trade_proposed': { league_id: string, players_offered: number, players_requested: number }
  'trade_accepted': { league_id: string }
  'trade_rejected': { league_id: string }
  'trade_vetoed': { league_id: string }

  // Chat
  'message_sent': { league_id: string, type: 'text' | 'image' | 'gif' | 'poll' }
  'poll_created': { league_id: string }

  // Predictions
  'prediction_submitted': { sport: string, type: string, confidence: string }
  'prediction_resolved': { sport: string, type: string, outcome: string }
  'leaderboard_viewed': { sport: string, timeframe: string }
  'badge_earned': { badge_type: string }

  // Migration
  'import_started': { source_platform: string }
  'import_completed': { source_platform: string, seasons_imported: number, duration_minutes: number }
  'import_failed': { source_platform: string, error_type: string }
  'league_vault_viewed': { league_id: string }
  'historical_team_claimed': { league_id: string }

  // Analyst
  'analyst_profile_created': {}
  'analyst_followed': { analyst_id: string }
  'analyst_unfollowed': { analyst_id: string }
  'expert_insight_viewed': { context: 'roster' | 'player_card' | 'feed' }

  // Premium
  'upgrade_started': { from_tier: string, to_tier: string }
  'upgrade_completed': { tier: string, price: number }
  'upgrade_cancelled': { tier: string, reason?: string }
  'ai_caddie_used': { sport: string, feature: 'start_sit' | 'trade_analysis' | 'waiver' }

  // Navigation
  'page_viewed': { path: string, referrer?: string }
  'feature_discovered': { feature: string } // first time user interacts with a feature
}
```

---

*Last updated: February 22, 2026*
