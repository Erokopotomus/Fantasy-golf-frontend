/**
 * Email Service (Resend)
 *
 * Sends transactional emails via the Resend API.
 * Gracefully degrades if resend is not installed or API key isn't set.
 */

let resendClient = null
let isConfigured = false

try {
  const { Resend } = require('resend')
  const apiKey = process.env.RESEND_API_KEY

  if (apiKey) {
    resendClient = new Resend(apiKey)
    isConfigured = true
    console.log('[email] Resend configured')
  } else {
    console.log('[email] RESEND_API_KEY not set — email disabled')
  }
} catch {
  console.log('[email] resend package not installed — email disabled')
}

function sportEmoji(sport) {
  const s = (sport || '').toLowerCase()
  if (s.includes('golf')) return '⛳'
  if (s.includes('nfl') || s.includes('football')) return '🏈'
  if (s.includes('nba') || s.includes('basketball')) return '🏀'
  if (s.includes('mlb') || s.includes('baseball')) return '⚾'
  return '🏆'
}

function emailWrapper(bodyHtml, { showManagePrefs = false } = {}) {
  const prefsLink = showManagePrefs
    ? '<div style="margin-top:8px;"><a href="https://clutchfantasysports.com/profile?tab=notifications" style="color:#999;font-size:11px;text-decoration:none;">Manage notification preferences</a></div>'
    : ''
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F5F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F0;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#FFFFFF;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;">
<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#1E2A3A,#2D3F54);padding:24px 32px;text-align:center;">
<div style="font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:2px;">CLUTCH</div>
<div style="font-size:11px;font-weight:600;color:#D4930D;letter-spacing:3px;margin-top:2px;">FANTASY SPORTS</div>
</td></tr>
<!-- Body -->
<tr><td style="padding:32px;">
${bodyHtml}
</td></tr>
<!-- Footer -->
<tr><td style="padding:0 32px 24px;">
<div style="border-top:1px solid #EEEAE2;padding-top:16px;text-align:center;">
<a href="https://clutchfantasysports.com" style="color:#D4930D;font-size:12px;text-decoration:none;font-weight:600;">clutchfantasysports.com</a>
${prefsLink}
</div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

/**
 * Send a league invite email with branded HTML.
 */
async function sendLeagueInviteEmail({ to, commissionerName, leagueName, joinUrl, sportName, memberCount, maxTeams }) {
  if (!isConfigured || !resendClient) {
    return { success: false, error: 'Email service not configured' }
  }

  const emoji = sportEmoji(sportName)
  const memberLine = memberCount && maxTeams
    ? `<div style="font-size:13px;color:#666;margin-top:6px;">${memberCount}/${maxTeams} members joined</div>`
    : ''

  const bodyHtml = `
<div style="font-size:15px;color:#1A1A1A;line-height:1.5;margin-bottom:24px;">
  ${commissionerName} invited you to join their fantasy league:
</div>
<div style="background-color:#FAFAF6;border:1px solid #EEEAE2;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
  <div style="font-size:11px;font-weight:700;color:#D4930D;letter-spacing:2px;margin-bottom:8px;">${emoji} LEAGUE INVITE</div>
  <div style="font-size:22px;font-weight:700;color:#1A1A1A;">${leagueName}</div>
  ${memberLine}
</div>
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
  <tr>
    <td align="center" style="border-radius:10px;background-color:#F06820;" bgcolor="#F06820">
      <a href="${joinUrl}" target="_blank"
         style="display:inline-block;background-color:#F06820;color:#FFFFFF;font-size:17px;font-weight:700;text-decoration:none;padding:16px 52px;border-radius:10px;border:1px solid #E05A10;">
        Join the League
      </a>
    </td>
  </tr>
</table>
<div style="font-size:13px;color:#888;line-height:1.5;text-align:center;">
  Clutch is a season-long fantasy platform with AI-powered coaching, deep stats, league history, and more.
</div>`

  const text =
    `${commissionerName} invited you to join "${leagueName}" on Clutch Fantasy Sports.\n\n` +
    `Join here: ${joinUrl}\n\n` +
    `Clutch is a season-long fantasy platform with AI coaching, league history, and more.`

  try {
    await resendClient.emails.send({
      from: 'Clutch Fantasy <noreply@clutchfantasysports.com>',
      to,
      subject: `${emoji} ${commissionerName} invited you to ${leagueName}`,
      html: emailWrapper(bodyHtml),
      text,
    })
    return { success: true }
  } catch (err) {
    console.error('[email] League invite send failed:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Send a vault invite email with branded HTML.
 */
async function sendVaultInviteEmail({ to, ownerName, leagueName, personalUrl, fromName }) {
  if (!isConfigured || !resendClient) {
    return { success: false, error: 'Email service not configured' }
  }

  const bodyHtml = `
<div style="font-size:15px;color:#1A1A1A;line-height:1.5;margin-bottom:24px;">
  Hey ${ownerName}, ${fromName} set up your league history on Clutch Fantasy Sports.
</div>
<div style="background-color:#FAFAF6;border:1px solid #EEEAE2;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
  <div style="font-size:11px;font-weight:700;color:#D4930D;letter-spacing:2px;margin-bottom:8px;">🏆 YOUR LEAGUE HISTORY IS READY</div>
  <div style="font-size:22px;font-weight:700;color:#1A1A1A;">${leagueName}</div>
</div>
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
  <tr>
    <td align="center" style="border-radius:10px;background-color:#F06820;" bgcolor="#F06820">
      <a href="${personalUrl}" target="_blank"
         style="display:inline-block;background-color:#F06820;color:#FFFFFF;font-size:17px;font-weight:700;text-decoration:none;padding:16px 52px;border-radius:10px;border:1px solid #E05A10;">
        View Your Stats
      </a>
    </td>
  </tr>
</table>
<div style="font-size:13px;color:#888;line-height:1.5;text-align:center;">
  Check out your all-time stats, ranking, and season-by-season breakdown. See where you stack up!
</div>`

  const text =
    `Hey ${ownerName},\n\n` +
    `${fromName} set up your league history on Clutch Fantasy Sports.\n` +
    `Check out your all-time stats, ranking, and season-by-season breakdown:\n\n` +
    `${personalUrl}\n\n` +
    `See where you stack up against everyone else!`

  try {
    await resendClient.emails.send({
      from: 'Clutch Fantasy <noreply@clutchfantasysports.com>',
      to,
      subject: `${leagueName} — Your All-Time Fantasy Stats`,
      html: emailWrapper(bodyHtml),
      text,
    })
    return { success: true }
  } catch (err) {
    console.error('[email] Send failed:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Send a generic notification email with branded HTML.
 * Used by notificationService to email users about activity.
 */
async function sendNotificationEmail({ to, subject, headline, body, ctaText, ctaUrl, accentColor }) {
  if (!isConfigured || !resendClient) {
    return { success: false, error: 'Email service not configured' }
  }

  const accent = accentColor || '#F06820'
  const ctaBlock = ctaText && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
  <tr>
    <td align="center" style="border-radius:10px;background-color:${accent};" bgcolor="${accent}">
      <a href="${ctaUrl}" target="_blank"
         style="display:inline-block;background-color:${accent};color:#FFFFFF;font-size:17px;font-weight:700;text-decoration:none;padding:16px 52px;border-radius:10px;border:1px solid #E05A10;">
        ${ctaText}
      </a>
    </td>
  </tr>
</table>`
    : ''

  const bodyHtml = `
<div style="font-size:18px;font-weight:700;color:#1A1A1A;margin-bottom:16px;">${headline}</div>
<div style="font-size:15px;color:#1A1A1A;line-height:1.6;margin-bottom:24px;">${body}</div>
${ctaBlock}`

  const text = `${headline}\n\n${body.replace(/<[^>]+>/g, '')}${ctaUrl ? `\n\n${ctaText}: ${ctaUrl}` : ''}`

  try {
    await resendClient.emails.send({
      from: 'Clutch Fantasy <noreply@clutchfantasysports.com>',
      to,
      subject,
      html: emailWrapper(bodyHtml, { showManagePrefs: true }),
      text: text + '\n\nManage notification preferences: https://clutchfantasysports.com/profile?tab=notifications',
    })
    return { success: true }
  } catch (err) {
    console.error('[email] Notification email failed:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Send a weekly tournament recap email with per-league sections.
 * @param {{ to: string, recaps: Array }} opts
 */
async function sendWeeklyRecapEmail({ to, recaps }) {
  if (!isConfigured || !resendClient) {
    return { success: false, error: 'Email service not configured' }
  }
  if (!recaps || recaps.length === 0) return { success: false, error: 'No recap data' }

  const weekName = recaps[0].weekName || 'This Week'

  const leagueSections = recaps.map(r => {
    const topLine = r.topPerformer
      ? `<div style="font-size:13px;color:#666;margin-top:8px;">Top performer: <strong>${r.topPerformer.playerName}</strong> (${r.topPerformer.points} pts)</div>`
      : ''

    const standingsRows = (r.standings || []).map((s, i) => {
      const medals = ['🥇', '🥈', '🥉']
      return `<tr><td style="padding:2px 8px;font-size:13px;color:#1A1A1A;">${medals[i] || ''} ${s.teamName}</td><td style="padding:2px 8px;font-size:13px;color:#666;text-align:right;">${s.totalPoints} pts</td></tr>`
    }).join('')

    return `
<div style="background-color:#FAFAF6;border:1px solid #EEEAE2;border-radius:12px;padding:20px;margin-bottom:16px;">
  <div style="font-size:11px;font-weight:700;color:#D4930D;letter-spacing:2px;margin-bottom:6px;">⛳ ${r.leagueName.toUpperCase()}</div>
  <div style="font-size:18px;font-weight:700;color:#1A1A1A;">Your team: ${r.totalPoints} pts</div>
  <div style="font-size:14px;color:#666;margin-top:4px;">Rank: ${r.rank} of ${r.totalTeams}</div>
  ${topLine}
  ${standingsRows ? `<table style="width:100%;margin-top:12px;border-top:1px solid #EEEAE2;padding-top:8px;">${standingsRows}</table>` : ''}
</div>
<div style="text-align:center;margin-bottom:20px;">
  <a href="https://clutchfantasysports.com/leagues/${r.leagueId}/scoring" style="color:#F06820;font-size:13px;font-weight:600;text-decoration:none;">View Full Scoreboard →</a>
</div>`
  }).join('')

  const bodyHtml = `
<div style="font-size:18px;font-weight:700;color:#1A1A1A;margin-bottom:20px;">${weekName} Results</div>
${leagueSections}`

  const text = recaps.map(r =>
    `${r.leagueName}: ${r.totalPoints} pts (Rank ${r.rank}/${r.totalTeams})` +
    (r.topPerformer ? ` | Top: ${r.topPerformer.playerName} (${r.topPerformer.points} pts)` : '')
  ).join('\n')

  try {
    await resendClient.emails.send({
      from: 'Clutch Fantasy <noreply@clutchfantasysports.com>',
      to,
      subject: `⛳ ${weekName} — Your Fantasy Recap`,
      html: emailWrapper(bodyHtml, { showManagePrefs: true }),
      text: `${weekName} Results\n\n${text}\n\nManage preferences: https://clutchfantasysports.com/profile?tab=notifications`,
    })
    return { success: true }
  } catch (err) {
    console.error('[email] Weekly recap send failed:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Send a draft recap email with grade and highlights.
 */
async function sendDraftRecapEmail({ to, leagueName, sportName, grade, overallScore, bestPick, picks, leagueId }) {
  if (!isConfigured || !resendClient) {
    return { success: false, error: 'Email service not configured' }
  }

  const emoji = sportEmoji(sportName)
  const gradeColors = { 'A+': '#0D9668', 'A': '#0D9668', 'A-': '#0D9668', 'B+': '#2563EB', 'B': '#2563EB', 'B-': '#2563EB', 'C+': '#D4930D', 'C': '#D4930D', 'C-': '#D4930D', 'D+': '#F06820', 'D': '#F06820', 'D-': '#F06820', 'F': '#E83838' }
  const gradeColor = gradeColors[grade] || '#666'

  const bestPickLine = bestPick
    ? `<div style="font-size:14px;color:#1A1A1A;margin-top:12px;"><strong>Best Pick:</strong> ${bestPick.playerName} at #${bestPick.pickNumber} ${bestPick.adpDiff > 0 ? '— Steal!' : '— Solid pick'}</div>`
    : ''

  const pickRows = (picks || []).slice(0, 12).map(p => {
    const pg = gradeColors[p.grade] || '#666'
    return `<tr><td style="padding:3px 8px;font-size:13px;color:#666;">R${p.round}</td><td style="padding:3px 8px;font-size:13px;color:#1A1A1A;">${p.playerName}</td><td style="padding:3px 8px;font-size:13px;font-weight:700;color:${pg};text-align:right;">${p.grade}</td></tr>`
  }).join('')

  const bodyHtml = `
<div style="font-size:18px;font-weight:700;color:#1A1A1A;margin-bottom:20px;">${emoji} Draft Complete — ${leagueName}</div>
<div style="text-align:center;margin-bottom:20px;">
  <div style="display:inline-block;width:80px;height:80px;border-radius:50%;background:${gradeColor};color:#fff;font-size:32px;font-weight:800;line-height:80px;">${grade}</div>
  <div style="font-size:14px;color:#666;margin-top:8px;">${overallScore}/100</div>
</div>
${bestPickLine}
${pickRows ? `<table style="width:100%;margin-top:16px;border-top:1px solid #EEEAE2;padding-top:8px;">${pickRows}</table>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 0;">
  <tr>
    <td align="center" style="border-radius:10px;background-color:#F06820;" bgcolor="#F06820">
      <a href="https://clutchfantasysports.com/leagues/${leagueId}/draft-recap" target="_blank"
         style="display:inline-block;background-color:#F06820;color:#FFFFFF;font-size:17px;font-weight:700;text-decoration:none;padding:16px 52px;border-radius:10px;border:1px solid #E05A10;">
        View Full Draft Recap
      </a>
    </td>
  </tr>
</table>`

  const text = `Draft Complete — ${leagueName}\nYour Grade: ${grade} (${overallScore}/100)\n${bestPick ? `Best Pick: ${bestPick.playerName} at #${bestPick.pickNumber}` : ''}\n\nView recap: https://clutchfantasysports.com/leagues/${leagueId}/draft-recap`

  try {
    await resendClient.emails.send({
      from: 'Clutch Fantasy <noreply@clutchfantasysports.com>',
      to,
      subject: `${emoji} Your Draft Grade: ${grade} — ${leagueName}`,
      html: emailWrapper(bodyHtml, { showManagePrefs: true }),
      text,
    })
    return { success: true }
  } catch (err) {
    console.error('[email] Draft recap send failed:', err.message)
    return { success: false, error: err.message }
  }
}

module.exports = { sendVaultInviteEmail, sendLeagueInviteEmail, sendNotificationEmail, sendWeeklyRecapEmail, sendDraftRecapEmail, isConfigured }
