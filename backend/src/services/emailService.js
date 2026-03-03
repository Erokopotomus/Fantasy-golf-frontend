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
<div style="text-align:center;margin-bottom:24px;">
  <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#F06820,#D4930D);color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 48px;border-radius:10px;">Join the League</a>
</div>
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
<div style="text-align:center;margin-bottom:24px;">
  <a href="${personalUrl}" style="display:inline-block;background:linear-gradient(135deg,#F06820,#D4930D);color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 48px;border-radius:10px;">View Your Stats</a>
</div>
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
    ? `<div style="text-align:center;margin-bottom:24px;">
  <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,${accent},#D4930D);color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 48px;border-radius:10px;">${ctaText}</a>
</div>`
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

module.exports = { sendVaultInviteEmail, sendLeagueInviteEmail, sendNotificationEmail, isConfigured }
