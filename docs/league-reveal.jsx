import { useState, useEffect, useRef, useMemo } from "react";

// ============================================================
// SIMULATED DATA — what the commissioner just finished mapping
// ============================================================
const OWNERS_DATA = [
  { id: "o1", name: "Eric", color: "#D4A853", active: true },
  { id: "o2", name: "Nick", color: "#4D96FF", active: true },
  { id: "o3", name: "Bradley", color: "#6BCB77", active: true },
  { id: "o4", name: "Kirk", color: "#FF6B6B", active: true },
  { id: "o5", name: "Gabriel", color: "#C084FC", active: true },
  { id: "o6", name: "Dallas", color: "#FF9F43", active: false },
  { id: "o7", name: "Anthony", color: "#54A0FF", active: false },
  { id: "o8", name: "Jakob", color: "#01CBC6", active: true },
];

// Seasons data per owner — simulated from the import
const SEASON_DATA = {
  o1: [
    { season: 2023, team: "South Beach Talent", w: 11, l: 2, pf: 1463, pa: 1009, champ: false },
    { season: 2022, team: "CeeDee's Nuts", w: 6, l: 7, pf: 1098, pa: 1156, champ: false },
    { season: 2021, team: "Lamar the Merrier", w: 7, l: 6, pf: 1245, pa: 1198, champ: false },
    { season: 2020, team: "A-Team", w: 7, l: 6, pf: 1141, pa: 1105, champ: false },
    { season: 2019, team: "Beast Mode Engaged", w: 8, l: 5, pf: 1289, pa: 1156, champ: false },
    { season: 2018, team: "BoomGoesTheDynamite", w: 6, l: 7, pf: 1054, pa: 1122, champ: false },
    { season: 2017, team: "Free Win Team", w: 7, l: 6, pf: 1141, pa: 1098, champ: false },
    { season: 2016, team: "Just Win Baby", w: 8, l: 5, pf: 1244, pa: 1098, champ: false },
    { season: 2015, team: "Lambeau Leapers", w: 9, l: 4, pf: 1334, pa: 1089, champ: false },
    { season: 2014, team: "MIND MELTZ", w: 7, l: 6, pf: 1233, pa: 1198, champ: false },
    { season: 2013, team: "Mob Slobbin", w: 6, l: 7, pf: 1098, pa: 1145, champ: false },
    { season: 2012, team: "ShowMeYourTDs", w: 5, l: 8, pf: 1034, pa: 1201, champ: false },
    { season: 2011, team: "Porkchop Express", w: 6, l: 7, pf: 1088, pa: 1134, champ: false },
    { season: 2010, team: "Raging Bull", w: 8, l: 5, pf: 1298, pa: 1089, champ: false },
    { season: 2009, team: "Touchdown Machine", w: 9, l: 4, pf: 1367, pa: 1098, champ: true },
    { season: 2008, team: "Victorious Secret", w: 8, l: 5, pf: 1234, pa: 1098, champ: false },
  ],
  o2: [
    { season: 2023, team: "Loud Noises", w: 11, l: 2, pf: 1394, pa: 1082, champ: false },
    { season: 2022, team: "SWAMP DONKEYS", w: 8, l: 5, pf: 1204, pa: 1108, champ: false },
    { season: 2021, team: "Run DMC", w: 8, l: 5, pf: 1318, pa: 1186, champ: false },
    { season: 2020, team: "Whale", w: 8, l: 5, pf: 1160, pa: 1098, champ: false },
    { season: 2019, team: "Awesometown", w: 7, l: 6, pf: 1207, pa: 1189, champ: false },
    { season: 2018, team: "Caleb", w: 7, l: 6, pf: 1176, pa: 1145, champ: false },
    { season: 2017, team: "Dallas", w: 9, l: 4, pf: 1356, pa: 1098, champ: false },
    { season: 2016, team: "Jakob", w: 10, l: 3, pf: 1402, pa: 1023, champ: true },
    { season: 2015, team: "K&A all the way", w: 6, l: 7, pf: 1089, pa: 1178, champ: false },
    { season: 2014, team: "Mase R", w: 5, l: 8, pf: 1022, pa: 1234, champ: false },
    { season: 2013, team: "Oh Like Ndamukong", w: 7, l: 6, pf: 1222, pa: 1145, champ: false },
    { season: 2012, team: "Paul", w: 8, l: 6, pf: 1350, pa: 1298, champ: true },
    { season: 2011, team: "The Janitors", w: 7, l: 6, pf: 1207, pa: 1182, champ: true },
    { season: 2010, team: "The Muscle Hamsters", w: 4, l: 9, pf: 943, pa: 1215, champ: false },
    { season: 2009, team: "The Replacements", w: 5, l: 8, pf: 987, pa: 1156, champ: false },
    { season: 2008, team: "Scott's Tots", w: 7, l: 6, pf: 1156, pa: 1098, champ: false },
  ],
  o3: [
    { season: 2023, team: "Balls of Steel", w: 9, l: 4, pf: 1313, pa: 1123, champ: false },
    { season: 2022, team: "Chubby Chasers", w: 8, l: 5, pf: 1213, pa: 1156, champ: false },
    { season: 2021, team: "Bi-Winning", w: 9, l: 4, pf: 1478, pa: 1227, champ: true },
    { season: 2020, team: "The Wanna Be's", w: 6, l: 7, pf: 1145, pa: 1234, champ: false },
  ],
  o4: [
    { season: 2023, team: "The Fear Boners", w: 9, l: 4, pf: 1442, pa: 1209, champ: true },
    { season: 2022, team: "black mamba", w: 7, l: 6, pf: 1173, pa: 1215, champ: false },
    { season: 2019, team: "Ragen", w: 10, l: 3, pf: 1445, pa: 989, champ: true },
  ],
  o5: [
    { season: 2023, team: "Bi-Winning", w: 9, l: 4, pf: 1478, pa: 1227, champ: false },
    { season: 2021, team: "The Fear Boners", w: 9, l: 4, pf: 1442, pa: 1209, champ: false },
  ],
  o6: [
    { season: 2017, team: "Anthony", w: 7, l: 6, pf: 1188, pa: 1145, champ: false },
    { season: 2016, team: "The Wanna Be's", w: 6, l: 7, pf: 1145, pa: 1234, champ: false },
    { season: 2015, team: "The Replacements", w: 5, l: 8, pf: 987, pa: 1156, champ: false },
  ],
  o7: [
    { season: 2020, team: "Anthony", w: 7, l: 6, pf: 1188, pa: 1145, champ: false },
    { season: 2014, team: "Lambeau Leapers", w: 9, l: 4, pf: 1334, pa: 1089, champ: false },
    { season: 2013, team: "beast mode", w: 8, l: 5, pf: 1278, pa: 1098, champ: false },
  ],
  o8: [
    { season: 2022, team: "Just Win Baby", w: 8, l: 5, pf: 1244, pa: 1098, champ: false },
    { season: 2018, team: "Raging Bull", w: 8, l: 5, pf: 1298, pa: 1089, champ: false },
    { season: 2016, team: "Touchdown Machine", w: 9, l: 4, pf: 1367, pa: 1098, champ: false },
    { season: 2015, team: "Victorious Secret", w: 8, l: 5, pf: 1234, pa: 1098, champ: false },
    { season: 2012, team: "The Muscle Hamsters", w: 4, l: 9, pf: 943, pa: 1215, champ: false },
  ],
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function computeOwnerStats(ownerId) {
  const seasons = SEASON_DATA[ownerId] || [];
  const totalW = seasons.reduce((s, x) => s + x.w, 0);
  const totalL = seasons.reduce((s, x) => s + x.l, 0);
  const totalPF = seasons.reduce((s, x) => s + x.pf, 0);
  const totalPA = seasons.reduce((s, x) => s + x.pa, 0);
  const titles = seasons.filter((x) => x.champ).length;
  const winPct = totalW + totalL > 0 ? totalW / (totalW + totalL) : 0;
  const bestSeason = seasons.length > 0 ? seasons.reduce((best, s) => {
    const pct = s.w / (s.w + s.l);
    return pct > best.pct ? { ...s, pct } : best;
  }, { pct: 0 }) : null;
  const winPcts = seasons.map((s) => s.w / (s.w + s.l)).reverse(); // chronological
  return { totalW, totalL, totalPF, totalPA, titles, winPct, bestSeason, seasons, winPcts, seasonCount: seasons.length };
}

// Mini sparkline component
function Sparkline({ data, color, width = 120, height = 32 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data) - 0.05;
  const max = Math.max(...data) + 0.05;
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  // Area fill
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      {data.length > 0 && (() => {
        const lastX = width;
        const lastY = height - ((data[data.length - 1] - min) / range) * height;
        return <circle cx={lastX} cy={lastY} r="2.5" fill={color} />;
      })()}
    </svg>
  );
}

// Animated counter
function AnimatedNumber({ target, duration = 1200, delay = 0, prefix = "", suffix = "", decimals = 0 }) {
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCurrent(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);

  const display = decimals > 0 ? current.toFixed(decimals) : Math.round(current);
  return <span>{prefix}{typeof display === 'number' ? display.toLocaleString() : Number(display).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

// Crown SVG
function Crown({ size = 20, color = "#D4A853" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}>
      <path d="M2 18h20v2H2zM3.5 16L2 8l5.5 4L12 4l4.5 8L22 8l-1.5 8z" fill={color} />
    </svg>
  );
}

// Torch flame
function TorchFlame({ color, size = 14 }) {
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 16 24" style={{ filter: `drop-shadow(0 0 4px ${color}50)` }}>
      <defs>
        <linearGradient id={`tf-${color.replace("#","")}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#FFF8E1" />
        </linearGradient>
      </defs>
      <ellipse cx="8" cy="15" rx="4" ry="8" fill={`url(#tf-${color.replace("#","")})`} opacity="0.85">
        <animate attributeName="ry" values="8;7;8.5;7.5;8" dur="0.9s" repeatCount="indefinite" />
        <animate attributeName="rx" values="4;3.4;4.2;3.6;4" dur="0.65s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="8" cy="13" rx="2.2" ry="4.5" fill="#FFF8E1" opacity="0.5">
        <animate attributeName="ry" values="4.5;4;4.8;4.2;4.5" dur="0.75s" repeatCount="indefinite" />
      </ellipse>
    </svg>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function LeagueReveal() {
  const [phase, setPhase] = useState("loading"); // loading -> reveal -> details
  const [showCards, setShowCards] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [hoveredOwner, setHoveredOwner] = useState(null);

  // Compute all stats
  const ownerStats = useMemo(() => {
    return OWNERS_DATA.map((o) => ({
      ...o,
      stats: computeOwnerStats(o.id),
    })).sort((a, b) => b.stats.winPct - a.stats.winPct);
  }, []);

  const leagueStats = useMemo(() => {
    const totalSeasons = new Set(ownerStats.flatMap((o) => o.stats.seasons.map((s) => s.season))).size;
    const totalGames = ownerStats.reduce((s, o) => s + o.stats.totalW + o.stats.totalL, 0) / 2;
    const totalPoints = ownerStats.reduce((s, o) => s + o.stats.totalPF, 0);
    const totalTitles = ownerStats.reduce((s, o) => s + o.stats.titles, 0);
    return { totalSeasons, totalGames: Math.round(totalGames), totalPoints, totalTitles, totalOwners: ownerStats.length };
  }, [ownerStats]);

  // Phase transitions
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 2400);
    const t2 = setTimeout(() => setShowCards(true), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const leader = ownerStats[0];

  // ---- LOADING PHASE ----
  if (phase === "loading") {
    return (
      <div style={{
        minHeight: "100vh", background: "#0A0C0B", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', 'Menlo', monospace",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
          @keyframes buildPulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          @keyframes barGrow {
            0% { width: 0%; }
            60% { width: 85%; }
            100% { width: 100%; }
          }
          @keyframes dotPulse {
            0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
        `}</style>
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%", background: "#D4A853",
              animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#D4A853", marginBottom: 8, animation: "buildPulse 2s ease-in-out infinite" }}>
          Building your league history...
        </div>
        <div style={{ fontSize: 12, color: "#5A5347", marginBottom: 24 }}>
          Merging 16 seasons of data
        </div>
        <div style={{ width: 200, height: 3, background: "#1A1D1B", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg, #D4A853, #B8922E)", borderRadius: 2, animation: "barGrow 2.2s ease-out forwards" }} />
        </div>
      </div>
    );
  }

  // ---- OWNER DETAIL MODAL ----
  const renderOwnerDetail = () => {
    if (!selectedOwner) return null;
    const owner = ownerStats.find((o) => o.id === selectedOwner);
    if (!owner) return null;
    const { stats } = owner;
    const rank = ownerStats.findIndex((o) => o.id === selectedOwner) + 1;

    return (
      <div
        onClick={() => setSelectedOwner(null)}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(5,7,6,0.85)", backdropFilter: "blur(8px)",
          zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.25s ease",
        }}
      >
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#0E100F", border: `1px solid ${owner.color}30`,
            borderRadius: 16, padding: 28, maxWidth: 520, width: "90%",
            maxHeight: "85vh", overflowY: "auto",
            animation: "slideUp 0.3s ease",
            position: "relative",
          }}
        >
          {/* Glow bar */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "16px 16px 0 0", background: `linear-gradient(90deg, transparent, ${owner.color}, transparent)` }} />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: `${owner.color}18`, border: `2px solid ${owner.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: 700, color: owner.color, position: "relative",
            }}>
              {owner.name[0]}
              {rank === 1 && <div style={{ position: "absolute", top: -10, right: -6 }}><Crown size={18} /></div>}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: owner.color, fontFamily: "'Georgia', serif" }}>
                {owner.name}
              </div>
              <div style={{ fontSize: 12, color: "#5A5347" }}>
                #{rank} All-Time · {stats.seasonCount} seasons · {owner.active ? "Active" : "Former"}
              </div>
            </div>
            <button onClick={() => setSelectedOwner(null)} style={{
              marginLeft: "auto", background: "none", border: "none", color: "#5A5347",
              fontSize: 18, cursor: "pointer", padding: 4,
            }}>✕</button>
          </div>

          {/* Big stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Record", value: `${stats.totalW}-${stats.totalL}` },
              { label: "Win %", value: `${(stats.winPct * 100).toFixed(1)}%` },
              { label: "Titles", value: stats.titles.toString(), highlight: stats.titles > 0 },
              { label: "Total PF", value: stats.totalPF.toLocaleString() },
            ].map((s) => (
              <div key={s.label} style={{
                background: "#141716", borderRadius: 8, padding: "10px 12px", textAlign: "center",
              }}>
                <div style={{ fontSize: 10, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.highlight ? "#D4A853" : "#E8E0D0" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Sparkline */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: "#5A5347", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Win % by Season
            </div>
            <div style={{ background: "#141716", borderRadius: 8, padding: "12px 16px" }}>
              <Sparkline data={stats.winPcts} color={owner.color} width={440} height={48} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 10, color: "#4A4540" }}>
                  {stats.seasons[stats.seasons.length - 1]?.season}
                </span>
                <span style={{ fontSize: 10, color: "#4A4540" }}>
                  {stats.seasons[0]?.season}
                </span>
              </div>
            </div>
          </div>

          {/* Season-by-season */}
          <div>
            <div style={{ fontSize: 11, color: "#5A5347", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Season History
            </div>
            {stats.seasons.map((s) => (
              <div key={s.season} style={{
                display: "grid", gridTemplateColumns: "50px 1fr 60px 70px 24px",
                alignItems: "center", gap: 8,
                padding: "8px 10px", borderBottom: "1px solid #1A1D1B",
                fontSize: 12,
              }}>
                <span style={{ color: "#D4A853", fontWeight: 600 }}>{s.season}</span>
                <span style={{ color: "#B8AD98" }}>{s.team}</span>
                <span style={{ color: s.w > s.l ? "#6BCB77" : s.w < s.l ? "#FF6B6B" : "#7A7062", fontWeight: 600, textAlign: "right" }}>
                  {s.w}-{s.l}
                </span>
                <span style={{ color: "#5A5347", textAlign: "right" }}>{s.pf.toLocaleString()}</span>
                <span style={{ textAlign: "center" }}>{s.champ ? "🏆" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ---- REVEAL PHASE ----
  return (
    <div style={{
      minHeight: "100vh", background: "#0A0C0B",
      fontFamily: "'JetBrains Mono', 'Menlo', monospace", position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes glowPulse { 0%,100% { box-shadow: 0 0 20px var(--glow-color); } 50% { box-shadow: 0 0 40px var(--glow-color); } }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes crownBob {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-3px) rotate(3deg); }
        }
        .owner-card { transition: all 0.25s ease; cursor: pointer; }
        .owner-card:hover { transform: translateY(-4px); border-color: var(--card-color) !important; }
        .owner-card:hover .card-glow { opacity: 1 !important; }
        .unlock-btn { transition: all 0.2s ease; }
        .unlock-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px #D4A85350 !important; }
        .back-link:hover { color: #D4A853 !important; }
      `}</style>

      {/* Subtle ambient glow */}
      <div style={{
        position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, #D4A85308 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {selectedOwner && renderOwnerDetail()}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 100px", position: "relative" }}>
        {/* Back link */}
        <button
          className="back-link"
          onClick={() => {}}
          style={{
            background: "none", border: "none", color: "#5A5347", fontSize: 12,
            cursor: "pointer", fontFamily: "inherit", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 6,
            transition: "color 0.15s ease",
          }}
        >
          ← Back to Team Assignment
        </button>

        {/* League headline */}
        <div style={{
          textAlign: "center", marginBottom: 48,
          animation: "fadeUp 0.8s ease 0.2s both",
        }}>
          <div style={{ fontSize: 11, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>
            Your League History is Ready
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 700, color: "#D4A853",
            fontFamily: "'Georgia', serif", letterSpacing: "-0.02em", marginBottom: 8,
            background: "linear-gradient(90deg, #D4A853, #FFF3C4, #D4A853)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer 3s ease-in-out infinite",
          }}>
            League Vault
          </h1>
          <div style={{ fontSize: 13, color: "#7A7062", maxWidth: 500, margin: "0 auto" }}>
            16 years of history, unified for the first time
          </div>
        </div>

        {/* Big league stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16,
          marginBottom: 48,
          animation: "fadeUp 0.8s ease 0.6s both",
        }}>
          {[
            { label: "Seasons", value: leagueStats.totalSeasons, suffix: "" },
            { label: "Owners", value: leagueStats.totalOwners, suffix: "" },
            { label: "Games Played", value: leagueStats.totalGames, suffix: "" },
            { label: "Total Points", value: leagueStats.totalPoints, suffix: "" },
            { label: "Championships", value: leagueStats.totalTitles, suffix: "" },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              textAlign: "center", padding: "20px 12px",
              background: "#0E100F", borderRadius: 12, border: "1px solid #1A1D1B",
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#E8E0D0", fontFamily: "'Georgia', serif", marginBottom: 4 }}>
                <AnimatedNumber target={stat.value} delay={800 + i * 150} duration={1400} suffix={stat.suffix} />
              </div>
              <div style={{ fontSize: 10, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Section title */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 24,
          animation: "fadeUp 0.8s ease 1s both",
        }}>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg, transparent, #2A2E28)" }} />
          <span style={{ fontSize: 11, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.12em", flexShrink: 0 }}>
            All-Time Owner Rankings
          </span>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg, #2A2E28, transparent)" }} />
        </div>

        {/* Owner cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ownerStats.map((owner, i) => {
            const { stats } = owner;
            const isLeader = i === 0;
            const isHovered = hoveredOwner === owner.id;

            return (
              <div
                key={owner.id}
                className="owner-card"
                onClick={() => setSelectedOwner(owner.id)}
                onMouseEnter={() => setHoveredOwner(owner.id)}
                onMouseLeave={() => setHoveredOwner(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 44px 1fr 130px 90px 70px 60px 60px",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 20px",
                  background: isLeader ? "#0E100F" : "#0C0E0D",
                  border: `1px solid ${isLeader ? "#D4A85325" : "#161918"}`,
                  borderRadius: 12,
                  position: "relative",
                  overflow: "hidden",
                  "--card-color": owner.color + "40",
                  animation: showCards ? `fadeUp 0.5s ease ${1.2 + i * 0.1}s both` : "none",
                  opacity: showCards ? undefined : 0,
                }}
              >
                {/* Glow overlay */}
                <div className="card-glow" style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: `radial-gradient(ellipse at left, ${owner.color}06 0%, transparent 60%)`,
                  opacity: 0, transition: "opacity 0.3s ease", pointerEvents: "none",
                }} />

                {/* Leader glow bar */}
                {isLeader && (
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent 10%, ${owner.color}80 50%, transparent 90%)`,
                  }} />
                )}

                {/* Rank */}
                <div style={{
                  fontSize: isLeader ? 18 : 15, fontWeight: 700,
                  color: isLeader ? "#D4A853" : "#5A5347",
                  textAlign: "center", position: "relative",
                }}>
                  {isLeader ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ animation: "crownBob 3s ease-in-out infinite", marginBottom: -2 }}>
                        <Crown size={18} />
                      </div>
                      <span>1</span>
                    </div>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${owner.color}15`, border: `2px solid ${owner.color}${isHovered ? "" : "60"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, fontWeight: 700, color: owner.color,
                  transition: "border-color 0.2s ease",
                  position: "relative",
                }}>
                  {owner.name[0]}
                </div>

                {/* Name + meta */}
                <div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: isLeader ? "#D4A853" : "#E8E0D0",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    {owner.name}
                    {!owner.active && (
                      <span style={{ fontSize: 9, color: "#5A5347", background: "#1A1D1B", padding: "2px 6px", borderRadius: 3 }}>
                        FORMER
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#5A5347", marginTop: 2 }}>
                    {stats.seasonCount} season{stats.seasonCount !== 1 ? "s" : ""}
                    {stats.bestSeason && <span> · Best: {stats.bestSeason.team} ({stats.bestSeason.season})</span>}
                  </div>
                </div>

                {/* Sparkline */}
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Sparkline data={stats.winPcts} color={owner.color} width={110} height={28} />
                </div>

                {/* Record */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E0D0" }}>
                    {stats.totalW}-{stats.totalL}
                  </div>
                  <div style={{ fontSize: 10, color: "#5A5347" }}>Record</div>
                </div>

                {/* Win % */}
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700,
                    color: stats.winPct >= 0.6 ? "#6BCB77" : stats.winPct >= 0.5 ? "#E8E0D0" : "#FF6B6B",
                  }}>
                    {(stats.winPct * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 10, color: "#5A5347" }}>Win %</div>
                </div>

                {/* PF */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#B8AD98" }}>
                    {(stats.totalPF / 1000).toFixed(1)}k
                  </div>
                  <div style={{ fontSize: 10, color: "#5A5347" }}>PF</div>
                </div>

                {/* Titles */}
                <div style={{ textAlign: "center" }}>
                  {stats.titles > 0 ? (
                    <div style={{ fontSize: 14 }}>
                      {"🏆".repeat(stats.titles)}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#3A3530" }}>—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save CTA */}
        <div style={{
          textAlign: "center", marginTop: 48, paddingTop: 32,
          borderTop: "1px solid #1A1D1B",
          animation: showCards ? `fadeUp 0.8s ease ${1.2 + ownerStats.length * 0.1 + 0.3}s both` : "none",
          opacity: showCards ? undefined : 0,
        }}>
          <div style={{ fontSize: 12, color: "#5A5347", marginBottom: 16, lineHeight: 1.6 }}>
            Everything look right? Once saved, your League Vault will be permanently unlocked<br />
            with unified all-time stats, head-to-head records, and more.
          </div>
          <button
            className="unlock-btn"
            style={{
              padding: "16px 48px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #D4A853 0%, #B8922E 100%)",
              color: "#0A0C0B", fontSize: 16, fontWeight: 700,
              cursor: "pointer", fontFamily: "'Georgia', serif",
              letterSpacing: "0.02em",
              boxShadow: "0 6px 30px #D4A85340",
            }}
          >
            Save & Unlock Your League Vault
          </button>
          <div style={{ fontSize: 11, color: "#4A4540", marginTop: 10 }}>
            You can always edit assignments later from League Settings
          </div>
        </div>
      </div>
    </div>
  );
}
