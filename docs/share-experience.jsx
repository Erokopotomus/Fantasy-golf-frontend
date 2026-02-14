import { useState, useEffect, useMemo } from "react";

// ============================================================
// DATA
// ============================================================
const LEAGUE_NAME = "BroMontana Bowl";
const COMMISSIONER = "Eric";

const OWNERS = [
  { id: "o1", name: "Eric", color: "#D4A853", active: true, email: "eric@email.com", claimed: true },
  { id: "o2", name: "Nick", color: "#4D96FF", active: true, email: "nick@email.com", claimed: false },
  { id: "o3", name: "Bradley", color: "#6BCB77", active: true, email: "brad@email.com", claimed: false },
  { id: "o4", name: "Kirk", color: "#FF6B6B", active: true, email: "kirk@email.com", claimed: false },
  { id: "o5", name: "Gabriel", color: "#C084FC", active: true, email: "gabe@email.com", claimed: false },
  { id: "o6", name: "Dallas", color: "#FF9F43", active: false, email: "", claimed: false },
  { id: "o7", name: "Anthony", color: "#54A0FF", active: false, email: "", claimed: false },
  { id: "o8", name: "Jakob", color: "#01CBC6", active: true, email: "jakob@email.com", claimed: false },
];

const STATS = {
  o1: { w: 126, l: 86, pf: 20590, titles: 1, seasons: 16, best: "South Beach Talent '23", winPcts: [.615,.692,.462,.538,.538,.615,.462,.538,.615,.692,.538,.462,.385,.462,.615,.615] },
  o2: { w: 122, l: 88, pf: 19693, titles: 3, seasons: 16, best: "Jakob '16", winPcts: [.538,.385,.692,.462,.538,.538,.538,.692,.769,.462,.538,.615,.615,.571,.538,.538] },
  o3: { w: 32, l: 20, pf: 5149, titles: 1, seasons: 4, best: "Bi-Winning '21", winPcts: [.462,.692,.615,.692] },
  o4: { w: 26, l: 11, pf: 4060, titles: 2, seasons: 3, best: "Ragen '19", winPcts: [.769,.538,.692] },
  o5: { w: 18, l: 8, pf: 2920, titles: 0, seasons: 2, best: "Bi-Winning '23", winPcts: [.692,.692] },
  o6: { w: 18, l: 21, pf: 3320, titles: 0, seasons: 3, best: "Anthony '17", winPcts: [.385,.462,.538] },
  o7: { w: 24, l: 15, pf: 3800, titles: 0, seasons: 3, best: "Lambeau Leapers '14", winPcts: [.615,.692,.538] },
  o8: { w: 37, l: 26, pf: 5786, titles: 0, seasons: 5, best: "Touchdown Machine '16", winPcts: [.308,.615,.692,.615,.615] },
};

function getWinPct(id) {
  const s = STATS[id];
  return s.w / (s.w + s.l);
}

function getRanked() {
  return [...OWNERS].map((o) => ({ ...o, stat: STATS[o.id] })).sort((a, b) => getWinPct(b.id) - getWinPct(a.id));
}

// Sparkline
function Spark({ data, color, w = 80, h = 20 }) {
  if (!data || data.length < 2) return <div style={{ width: w, height: h }} />;
  const mn = Math.min(...data) - 0.06, mx = Math.max(...data) + 0.06, rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / rng) * h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs><linearGradient id={`s${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#s${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Crown({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: "drop-shadow(0 0 4px #D4A85350)" }}><path d="M2 18h20v2H2zM3.5 16L2 8l5.5 4L12 4l4.5 8L22 8l-1.5 8z" fill="#D4A853"/></svg>;
}

// ============================================================
// VIEWS
// ============================================================

// --- 1. COMMISSIONER SHARE MODAL ---
function ShareModal({ onPreviewEmail }) {
  const [emails, setEmails] = useState(
    Object.fromEntries(OWNERS.filter((o) => o.active && o.id !== "o1").map((o) => [o.id, o.email]))
  );
  const [sent, setSent] = useState(new Set());
  const [linkCopied, setLinkCopied] = useState(false);
  const ranked = getRanked();

  const handleSend = (id) => {
    setSent((p) => new Set([...p, id]));
  };

  const handleSendAll = () => {
    const ids = OWNERS.filter((o) => o.active && o.id !== "o1" && emails[o.id]).map((o) => o.id);
    setSent(new Set(ids));
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Success header */}
      <div style={{
        textAlign: "center", marginBottom: 32, padding: "28px 20px",
        background: "linear-gradient(180deg, #D4A85308 0%, transparent 100%)",
        borderRadius: 16,
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#D4A853", fontFamily: "'Georgia', serif", marginBottom: 6 }}>
          League Vault Unlocked
        </h2>
        <p style={{ fontSize: 13, color: "#7A7062", lineHeight: 1.5 }}>
          {LEAGUE_NAME}'s history is ready. Now invite your league to see it.
        </p>
      </div>

      {/* Share link */}
      <div style={{
        background: "#111413", border: "1px solid #1C1F1D", borderRadius: 12,
        padding: 18, marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#B8AD98", marginBottom: 10 }}>Shareable Link</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{
            flex: 1, padding: "10px 14px", borderRadius: 8,
            background: "#0A0C0B", border: "1px solid #1C1F1D",
            fontSize: 12, color: "#5A5347", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            clutch.gg/vault/{LEAGUE_NAME.toLowerCase().replace(/\s/g, "-")}/invite
          </div>
          <button
            onClick={() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
            style={{
              padding: "10px 18px", borderRadius: 8, border: "none",
              background: linkCopied ? "#6BCB7720" : "#1A1D1B",
              color: linkCopied ? "#6BCB77" : "#D4A853",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.2s ease", whiteSpace: "nowrap",
            }}
          >
            {linkCopied ? "✓ Copied" : "Copy Link"}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#4A4540", marginTop: 8, lineHeight: 1.4 }}>
          Anyone with this link can view the league vault and claim their spot.
          Share in your group chat, text thread, or wherever your league lives.
        </div>
      </div>

      {/* Email invites */}
      <div style={{
        background: "#111413", border: "1px solid #1C1F1D", borderRadius: 12,
        padding: 18, marginBottom: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#B8AD98" }}>Email Invites</div>
          <button
            onClick={handleSendAll}
            style={{
              fontSize: 11, padding: "5px 12px", borderRadius: 6, border: "1px solid #D4A85330",
              background: "#D4A85310", color: "#D4A853", cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
            }}
          >
            Send All
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#4A4540", marginBottom: 14, lineHeight: 1.4 }}>
          Each person gets a personalized email showing the league rankings with their stats highlighted.
        </div>
        {OWNERS.filter((o) => o.active && o.id !== "o1").map((owner) => {
          const isSent = sent.has(owner.id);
          const rank = ranked.findIndex((r) => r.id === owner.id) + 1;
          const stat = STATS[owner.id];
          return (
            <div key={owner.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderBottom: "1px solid #1A1D1B08",
              marginBottom: 6, borderRadius: 8,
              background: isSent ? "#6BCB7706" : "transparent",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: `${owner.color}15`, border: `1.5px solid ${owner.color}50`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: owner.color, flexShrink: 0,
              }}>
                {owner.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#E8E0D0", display: "flex", alignItems: "center", gap: 6 }}>
                  {owner.name}
                  <span style={{ fontSize: 10, color: "#5A5347" }}>#{rank} · {stat.w}-{stat.l}</span>
                </div>
                <input
                  value={emails[owner.id] || ""}
                  onChange={(e) => setEmails((p) => ({ ...p, [owner.id]: e.target.value }))}
                  placeholder="email@example.com"
                  style={{
                    width: "100%", padding: "4px 0", border: "none", borderBottom: "1px solid #1C1F1D",
                    background: "transparent", color: "#8B7E6A", fontSize: 11, fontFamily: "inherit",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => onPreviewEmail(owner.id)}
                  style={{
                    fontSize: 10, padding: "5px 8px", borderRadius: 5,
                    border: "1px solid #1C1F1D", background: "transparent",
                    color: "#5A5347", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Preview
                </button>
                <button
                  onClick={() => handleSend(owner.id)}
                  disabled={isSent || !emails[owner.id]}
                  style={{
                    fontSize: 10, padding: "5px 12px", borderRadius: 5, border: "none",
                    background: isSent ? "#6BCB7720" : "#D4A853",
                    color: isSent ? "#6BCB77" : "#0A0C0B",
                    cursor: isSent ? "default" : "pointer", fontFamily: "inherit", fontWeight: 600,
                    opacity: !emails[owner.id] && !isSent ? 0.3 : 1,
                  }}
                >
                  {isSent ? "✓ Sent" : "Send"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", fontSize: 11, color: "#3A3530", lineHeight: 1.5 }}>
        League members who don't have accounts will be prompted to sign up.<br />
        They'll land directly in your League Vault with their stats highlighted.
      </div>
    </div>
  );
}

// --- 2. EMAIL PREVIEW ---
function EmailPreview({ recipientId }) {
  const recipient = OWNERS.find((o) => o.id === recipientId) || OWNERS[1];
  const ranked = getRanked();
  const recipientRank = ranked.findIndex((r) => r.id === recipient.id) + 1;
  const recipientStat = STATS[recipient.id];
  const recipientPct = getWinPct(recipient.id);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      {/* Email chrome */}
      <div style={{
        background: "#1A1D1B", borderRadius: "12px 12px 0 0", padding: "14px 18px",
        border: "1px solid #222520", borderBottom: "none",
      }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#5A5347", width: 45 }}>From:</div>
          <div style={{ fontSize: 11, color: "#B8AD98" }}>Clutch Fantasy &lt;noreply@clutch.gg&gt;</div>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#5A5347", width: 45 }}>To:</div>
          <div style={{ fontSize: 11, color: "#B8AD98" }}>{recipient.email}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ fontSize: 11, color: "#5A5347", width: 45 }}>Subject:</div>
          <div style={{ fontSize: 11, color: "#D4A853", fontWeight: 600 }}>
            {COMMISSIONER} unlocked the {LEAGUE_NAME} Vault — you're #{recipientRank} all-time
          </div>
        </div>
      </div>

      {/* Email body */}
      <div style={{
        background: "#0E100F", border: "1px solid #222520", borderTop: "1px solid #2A2E28",
        borderRadius: "0 0 12px 12px", padding: "0",
      }}>
        {/* Hero section */}
        <div style={{
          textAlign: "center", padding: "36px 24px 28px",
          background: "linear-gradient(180deg, #D4A85308 0%, transparent 100%)",
          borderBottom: "1px solid #1A1D1B",
        }}>
          <div style={{ fontSize: 10, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
            {COMMISSIONER} invited you to
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#D4A853", fontFamily: "'Georgia', serif", marginBottom: 6 }}>
            {LEAGUE_NAME}
          </div>
          <div style={{ fontSize: 12, color: "#6A6254" }}>
            16 seasons of history. Your legacy, unified.
          </div>
        </div>

        {/* Personalized stat callout */}
        <div style={{
          margin: "24px 24px 0", padding: "20px",
          background: `${recipient.color}08`, border: `1px solid ${recipient.color}20`,
          borderRadius: 12, textAlign: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: `${recipient.color}18`, border: `2px solid ${recipient.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 700, color: recipient.color,
            }}>
              {recipient.name[0]}
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: recipient.color, fontFamily: "'Georgia', serif", marginBottom: 4 }}>
            {recipient.name}, you're #{recipientRank} all-time
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 14 }}>
            {[
              { l: "Record", v: `${recipientStat.w}-${recipientStat.l}` },
              { l: "Win %", v: `${(recipientPct * 100).toFixed(1)}%` },
              { l: "Titles", v: recipientStat.titles > 0 ? `${recipientStat.titles}x 🏆` : "0" },
              { l: "Seasons", v: String(recipientStat.seasons) },
            ].map((s) => (
              <div key={s.l}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#E8E0D0" }}>{s.v}</div>
                <div style={{ fontSize: 9, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mini leaderboard */}
        <div style={{ margin: "24px", marginBottom: 0 }}>
          <div style={{ fontSize: 10, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            All-Time Standings
          </div>
          {ranked.slice(0, 6).map((o, i) => {
            const isRecipient = o.id === recipient.id;
            const s = STATS[o.id];
            const pct = getWinPct(o.id);
            return (
              <div key={o.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 10px", borderRadius: 7, marginBottom: 3,
                background: isRecipient ? `${recipient.color}10` : "transparent",
                border: isRecipient ? `1px solid ${recipient.color}20` : "1px solid transparent",
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "#D4A853" : "#4A4540", width: 18, textAlign: "center" }}>
                  {i === 0 ? "👑" : i + 1}
                </span>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: `${o.color}15`, border: `1.5px solid ${o.color}50`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: o.color,
                }}>
                  {o.name[0]}
                </div>
                <span style={{
                  flex: 1, fontSize: 12,
                  fontWeight: isRecipient ? 700 : 500,
                  color: isRecipient ? recipient.color : "#B8AD98",
                }}>
                  {o.name} {isRecipient && "← You"}
                </span>
                <span style={{ fontSize: 11, color: "#5A5347", fontWeight: 600 }}>{s.w}-{s.l}</span>
                <span style={{ fontSize: 11, color: pct >= 0.6 ? "#6BCB77" : "#8B7E6A", fontWeight: 600, width: 42, textAlign: "right" }}>
                  {(pct * 100).toFixed(1)}%
                </span>
                {s.titles > 0 && <span style={{ fontSize: 12 }}>{"🏆".repeat(Math.min(s.titles, 3))}</span>}
              </div>
            );
          })}
          {ranked.length > 6 && (
            <div style={{ textAlign: "center", fontSize: 11, color: "#4A4540", padding: "8px 0" }}>
              +{ranked.length - 6} more owners
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", padding: "28px 24px 32px" }}>
          <button style={{
            padding: "14px 40px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #D4A853 0%, #B8922E 100%)",
            color: "#0A0C0B", fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "'Georgia', serif",
            boxShadow: "0 4px 20px #D4A85330",
          }}>
            View Your Full History
          </button>
          <div style={{ fontSize: 10, color: "#3A3530", marginTop: 10, lineHeight: 1.5 }}>
            Claim your spot and see your complete season-by-season breakdown,<br />
            head-to-head records, and where you rank in every stat.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: "1px solid #1A1D1B", padding: "16px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: 10, color: "#3A3530" }}>
            Sent via <span style={{ color: "#D4A853" }}>Clutch Fantasy</span>
          </div>
          <div style={{ fontSize: 10, color: "#3A3530" }}>
            Invited by {COMMISSIONER}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 3. LANDING PAGE (what member sees when clicking link) ---
function LandingPage({ recipientId }) {
  const recipient = OWNERS.find((o) => o.id === recipientId) || OWNERS[1];
  const ranked = getRanked();
  const recipientRank = ranked.findIndex((r) => r.id === recipient.id) + 1;
  const recipientStat = STATS[recipient.id];
  const recipientPct = getWinPct(recipient.id);
  const [claimed, setClaimed] = useState(false);

  return (
    <div>
      {/* Top banner */}
      <div style={{
        background: "linear-gradient(135deg, #111413 0%, #0E100F 100%)",
        borderBottom: "1px solid #1A1D1B", padding: "10px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#D4A853", fontFamily: "'Georgia', serif" }}>⚡ CLUTCH</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{
            padding: "6px 14px", borderRadius: 6, border: "1px solid #2A2E28",
            background: "transparent", color: "#8B7E6A", fontSize: 11, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
          }}>Log In</button>
          <button style={{
            padding: "6px 14px", borderRadius: 6, border: "none",
            background: "#D4A853", color: "#0A0C0B", fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>Sign Up Free</button>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px 60px" }}>
        {/* Personalized hero */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 10, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
            {COMMISSIONER} invited you to
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: "#D4A853", fontFamily: "'Georgia', serif", marginBottom: 4 }}>
            {LEAGUE_NAME}
          </h1>
          <div style={{ fontSize: 13, color: "#6A6254" }}>16 seasons · 8 owners · Est. 2008</div>
        </div>

        {/* YOUR stats hero card */}
        <div style={{
          background: `${recipient.color}06`, border: `1px solid ${recipient.color}20`,
          borderRadius: 16, padding: "28px 24px", marginBottom: 32, textAlign: "center",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${recipient.color}, transparent)` }} />
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: `${recipient.color}18`, border: `2px solid ${recipient.color}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, fontWeight: 700, color: recipient.color,
            margin: "0 auto 14px",
          }}>
            {recipient.name[0]}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: recipient.color, fontFamily: "'Georgia', serif", marginBottom: 2 }}>
            {recipient.name}
          </div>
          <div style={{ fontSize: 13, color: "#7A7062", marginBottom: 18 }}>
            #{recipientRank} All-Time · {recipientStat.seasons} Seasons
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 20 }}>
            {[
              { l: "Record", v: `${recipientStat.w}-${recipientStat.l}` },
              { l: "Win %", v: `${(recipientPct * 100).toFixed(1)}%` },
              { l: "Titles", v: recipientStat.titles > 0 ? `${recipientStat.titles}x 🏆` : "0" },
              { l: "Points For", v: recipientStat.totalPF ? recipientStat.totalPF.toLocaleString() : recipientStat.pf.toLocaleString() },
            ].map((s) => (
              <div key={s.l}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#E8E0D0" }}>{s.v}</div>
                <div style={{ fontSize: 10, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div style={{ maxWidth: 300, margin: "0 auto" }}>
            <Spark data={recipientStat.winPcts} color={recipient.color} w={280} h={36} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 9, color: "#4A4540" }}>First Season</span>
              <span style={{ fontSize: 9, color: "#4A4540" }}>Latest</span>
            </div>
          </div>
        </div>

        {/* League standings */}
        <div style={{
          background: "#0E100F", border: "1px solid #1A1D1B", borderRadius: 14, padding: 20, marginBottom: 28,
        }}>
          <div style={{ fontSize: 11, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            All-Time Standings
          </div>
          {ranked.map((o, i) => {
            const isMe = o.id === recipient.id;
            const s = STATS[o.id];
            const pct = getWinPct(o.id);
            return (
              <div key={o.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, marginBottom: 4,
                background: isMe ? `${recipient.color}0A` : "transparent",
                border: isMe ? `1px solid ${recipient.color}18` : "1px solid transparent",
                transition: "background 0.15s ease",
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? "#D4A853" : "#4A4540", width: 20, textAlign: "center" }}>
                  {i === 0 ? "👑" : i + 1}
                </span>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: `${o.color}14`, border: `1.5px solid ${o.color}50`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: o.color,
                }}>
                  {o.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 13, fontWeight: isMe ? 700 : 500,
                    color: isMe ? recipient.color : "#B8AD98",
                  }}>
                    {o.name}
                    {isMe && <span style={{ fontSize: 10, marginLeft: 6, color: `${recipient.color}90` }}>← You</span>}
                  </span>
                </div>
                <Spark data={s.winPcts} color={o.color} w={60} h={16} />
                <span style={{ fontSize: 12, color: "#7A7062", fontWeight: 600, width: 55, textAlign: "right" }}>{s.w}-{s.l}</span>
                <span style={{
                  fontSize: 12, fontWeight: 600, width: 48, textAlign: "right",
                  color: pct >= 0.6 ? "#6BCB77" : pct >= 0.5 ? "#B8AD98" : "#FF6B6B",
                }}>{(pct * 100).toFixed(1)}%</span>
                <span style={{ width: 40, textAlign: "center", fontSize: 12 }}>
                  {s.titles > 0 ? "🏆".repeat(Math.min(s.titles, 3)) : <span style={{ color: "#2A2520" }}>—</span>}
                </span>
              </div>
            );
          })}
        </div>

        {/* Blurred teaser sections */}
        <div style={{ position: "relative", marginBottom: 28 }}>
          <div style={{
            background: "#0E100F", border: "1px solid #1A1D1B", borderRadius: 14,
            padding: 20, filter: "blur(3px)", opacity: 0.5, pointerEvents: "none",
          }}>
            <div style={{ fontSize: 11, color: "#5A5347", marginBottom: 12 }}>HEAD-TO-HEAD RECORDS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[1, 2, 3, 4].map((n) => (
                <div key={n} style={{ background: "#141716", borderRadius: 8, height: 60 }} />
              ))}
            </div>
          </div>
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", borderRadius: 14,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#D4A853", marginBottom: 4 }}>
              Head-to-Head Records
            </div>
            <div style={{ fontSize: 11, color: "#5A5347" }}>
              Claim your spot to unlock
            </div>
          </div>
        </div>

        <div style={{ position: "relative", marginBottom: 36 }}>
          <div style={{
            background: "#0E100F", border: "1px solid #1A1D1B", borderRadius: 14,
            padding: 20, filter: "blur(3px)", opacity: 0.5, pointerEvents: "none",
          }}>
            <div style={{ fontSize: 11, color: "#5A5347", marginBottom: 12 }}>DRAFT HISTORY</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} style={{ background: "#141716", borderRadius: 8, height: 40 }} />
              ))}
            </div>
          </div>
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", borderRadius: 14,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#D4A853", marginBottom: 4 }}>
              Draft History & Analysis
            </div>
            <div style={{ fontSize: 11, color: "#5A5347" }}>
              Claim your spot to unlock
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => setClaimed(true)}
            style={{
              padding: "16px 48px", borderRadius: 12, border: "none",
              background: claimed ? "#6BCB7720" : "linear-gradient(135deg, #D4A853 0%, #B8922E 100%)",
              color: claimed ? "#6BCB77" : "#0A0C0B",
              fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Georgia', serif",
              boxShadow: claimed ? "none" : "0 6px 28px #D4A85330",
              transition: "all 0.3s ease",
            }}
          >
            {claimed ? "✓ Welcome to the Vault" : "Claim Your Spot"}
          </button>
          <div style={{ fontSize: 11, color: "#3A3530", marginTop: 10 }}>
            {claimed ? "Redirecting to your League Vault..." : "Free account · Takes 30 seconds"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP — Tab navigation between views
// ============================================================
export default function ShareExperience() {
  const [view, setView] = useState("share"); // share | email | landing
  const [previewRecipient, setPreviewRecipient] = useState("o2");

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0C0B",
      fontFamily: "'JetBrains Mono', 'Menlo', monospace", color: "#E8E0D0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .vtab { transition: all 0.15s ease; }
        .vtab:hover { background: #1A1D1B !important; color: #D4A853 !important; }
      `}</style>

      {/* View tabs */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 0, padding: "16px 24px 0",
        borderBottom: "1px solid #1A1D1B", marginBottom: 28,
      }}>
        {[
          { key: "share", label: "Commissioner: Share Modal", icon: "📤" },
          { key: "email", label: "Member: Email Preview", icon: "📧" },
          { key: "landing", label: "Member: Landing Page", icon: "🌐" },
        ].map((tab) => (
          <button
            key={tab.key}
            className="vtab"
            onClick={() => setView(tab.key)}
            style={{
              padding: "10px 20px", border: "none", borderBottom: `2px solid ${view === tab.key ? "#D4A853" : "transparent"}`,
              background: "transparent", color: view === tab.key ? "#D4A853" : "#5A5347",
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Recipient selector for email/landing */}
      {(view === "email" || view === "landing") && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
          <span style={{ fontSize: 11, color: "#4A4540", marginRight: 4, alignSelf: "center" }}>Viewing as:</span>
          {OWNERS.filter((o) => o.active && o.id !== "o1").map((o) => (
            <button
              key={o.id}
              onClick={() => setPreviewRecipient(o.id)}
              style={{
                padding: "5px 12px", borderRadius: 6,
                border: `1.5px solid ${previewRecipient === o.id ? o.color : "#1C1F1D"}`,
                background: previewRecipient === o.id ? `${o.color}12` : "transparent",
                color: previewRecipient === o.id ? o.color : "#5A5347",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}

      {/* Views */}
      <div style={{ padding: "0 24px 60px" }}>
        {view === "share" && (
          <ShareModal onPreviewEmail={(id) => { setPreviewRecipient(id); setView("email"); }} />
        )}
        {view === "email" && <EmailPreview recipientId={previewRecipient} />}
        {view === "landing" && <LandingPage recipientId={previewRecipient} />}
      </div>
    </div>
  );
}
