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

/**
 * Send a vault invite email to an owner.
 *
 * @param {{ to: string, ownerName: string, leagueName: string, personalUrl: string, fromName: string }} opts
 * @returns {{ success: boolean, error?: string }}
 */
async function sendVaultInviteEmail({ to, ownerName, leagueName, personalUrl, fromName }) {
  if (!isConfigured || !resendClient) {
    return { success: false, error: 'Email service not configured' }
  }

  try {
    await resendClient.emails.send({
      from: 'Clutch Fantasy <onboarding@resend.dev>',
      to,
      subject: `${leagueName} — Your All-Time Fantasy Stats`,
      text:
        `Hey ${ownerName},\n\n` +
        `${fromName} set up your league history on Clutch Fantasy Sports.\n` +
        `Check out your all-time stats, ranking, and season-by-season breakdown:\n\n` +
        `${personalUrl}\n\n` +
        `See where you stack up against everyone else!`,
    })
    return { success: true }
  } catch (err) {
    console.error('[email] Send failed:', err.message)
    return { success: false, error: err.message }
  }
}

module.exports = { sendVaultInviteEmail, isConfigured }
