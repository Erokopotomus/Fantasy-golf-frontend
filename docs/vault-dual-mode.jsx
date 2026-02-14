import { useState, useEffect, useMemo, useCallback } from "react";

// ============================================================
// DATA
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

const SEASON_DATA = {
  o1: [
    { season: 2024, team: "Fear the Beard", w: 5, l: 3, pf: 892, pa: 834, champ: false, inProgress: true },
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
    { season: 2024, team: "Loud Noises", w: 6, l: 2, pf: 945, pa: 788, champ: false, inProgress: true },
    { season: 2023, team: "Loud Noises", w: 11, l: 2, pf: 1394, pa: 1082, champ: false },
    { season: 2022, team: "SWAMP DONKEYS", w: 8, l: 5, pf: 1204, pa: 1108, champ: false },
    { season: 2021, team: "Run DMC", w: 8, l: 5, pf: 1318, pa: 1186, champ: false },
    { season: 2020, team: "Whale", w: 8, l: 5, pf: 1160, pa: 1098, champ: false },
    { season: 2019, team: "Awesometown", w: 7, l: 6, pf: 1207, pa: 1189, champ: false },
    { season: 2018, team: "Caleb", w: 7, l: 6, pf: 1176, pa: 1145, champ: false },
    { season: 2017, team: "Nick's Team", w: 9, l: 4, pf: 1356, pa: 1098, champ: false },
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
    { season: 2024, team: "Balls of Steel", w: 4, l: 4, pf: 812, pa: 823, champ: false, inProgress: true },
    { season: 2023, team: "Balls of Steel", w: 9, l: 4, pf: 1313, pa: 1123, champ: false },
    { season: 2022, team: "Chubby Chasers", w: 8, l: 5, pf: 1213, pa: 1156, champ: false },
    { season: 2021, team: "Bi-Winning", w: 9, l: 4, pf: 1478, pa: 1227, champ: true },
    { season: 2020, team: "The Wanna Be's", w: 6, l: 7, pf: 1145, pa: 1234, champ: false },
  ],
  o4: [
    { season: 2024, team: "The Fear Boners", w: 7, l: 1, pf: 1034, pa: 712, champ: false, inProgress: true },
    { season: 2023, team: "The Fear Boners", w: 9, l: 4, pf: 1442, pa: 1209, champ: true },
    { season: 2022, team: "black mamba", w: 7, l: 6, pf: 1173, pa: 1215, champ: false },
    { season: 2019, team: "Ragen", w: 10, l: 3, pf: 1445, pa: 989, champ: true },
  ],
  o5: [
    { season: 2024, team: "Purple Reign", w: 3, l: 5, pf: 756, pa: 891, champ: false, inProgress: true },
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
    { season: 2024, team: "Viking Funeral", w: 6, l: 2, pf: 923, pa: 801, champ: false, inProgress: true },
    { season: 2022, team: "Just Win Baby", w: 8, l: 5, pf: 1244, pa: 1098, champ: false },
    { season: 2018, team: "Raging Bull", w: 8, l: 5, pf: 1298, pa: 1089, champ: false },
    { season: 2016, team: "Touchdown Machine", w: 9, l: 4, pf: 1367, pa: 1098, champ: false },
    { season: 2015, team: "Victorious Secret", w: 8, l: 5, pf: 1234, pa: 1098, champ: false },
    { season: 2012, team: "The Muscle Hamsters", w: 4, l: 9, pf: 943, pa: 1215, champ: false },
  ],
};

// ============================================================
// HELPERS
// ============================================================
function computeStats(ownerId) {
  const seasons = SEASON_DATA[ownerId] || [];
  const completed = seasons.filter((s) => !s.inProgress);
  const current = seasons.find((s) => s.inProgress);
  const totalW = completed.reduce((s, x) => s + x.w, 0);
  const totalL = completed.reduce((s, x) => s + x.l, 0);
  const totalPF = completed.reduce((s, x) => s + x.pf, 0);
  const titles = completed.filter((x) => x.champ).length;
  const winPct = totalW + totalL > 0 ? totalW / (totalW + totalL) : 0;
  const best = completed.length > 0 ? completed.reduce((b, s) => {
    const p = s.w / (s.w + s.l);
    return p > (b?.pct || 0) ? { ...s, pct: p } : b;
  }, null) : null;
  const winPcts = [...completed].reverse().map((s) => s.w / (s.w + s.l));
  return { totalW, totalL, totalPF, titles, winPct, best, winPcts, completed, current, seasonCount: completed.length };
}

function Sparkline({ data, color, width = 120, height = 32 }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data) - 0.05;
  const mx = Math.max(...data) + 0.05;
  const rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - mn) / rng) * height}`).join(" ");
  const area = `0,${height} ${pts} ${width},${height}`;
  const lastY = height - ((data[data.length - 1] - mn) / rng) * height;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sp-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sp-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

function AnimatedNum({ target, dur = 1200, delay = 0, suffix = "" }) {
  const [val, setVal] = useState(0);
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), delay); return () => clearTimeout(t); }, [delay]);
  useEffect(() => {
    if (!go) return;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      setVal(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [go, target, dur]);
  return <span>{Math.round(val).toLocaleString()}{suffix}</span>;
}

function Crown({ size = 18, color = "#D4A853" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: `drop-shadow(0 0 5px ${color}50)` }}>
      <path d="M2 18h20v2H2zM3.5 16L2 8l5.5 4L12 4l4.5 8L22 8l-1.5 8z" fill={color} />
    </svg>
  );
}

// ============================================================
// OWNER DETAIL MODAL
// ============================================================
function OwnerModal({ owner, stats, rank, onClose }) {
  if (!owner) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(5,7,6,0.88)", backdropFilter: "blur(8px)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.2s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#0E100F", border: `1px solid ${owner.color}30`, borderRadius: 16,
        padding: 28, maxWidth: 540, width: "92%", maxHeight: "85vh", overflowY: "auto",
        animation: "slideUp 0.3s ease", position: "relative",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "16px 16px 0 0", background: `linear-gradient(90deg, transparent, ${owner.color}, transparent)` }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, background: `${owner.color}18`,
            border: `2px solid ${owner.color}`, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 24, fontWeight: 700, color: owner.color, position: "relative",
          }}>
            {owner.name[0]}
            {rank === 1 && <div style={{ position: "absolute", top: -10, right: -6 }}><Crown size={16} /></div>}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: owner.color, fontFamily: "'Georgia', serif" }}>{owner.name}</div>
            <div style={{ fontSize: 12, color: "#5A5347" }}>#{rank} All-Time · {stats.seasonCount} seasons{stats.current ? " + current" : ""}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#5A5347", fontSize: 18, cursor: "pointer", padding: 4 }}>✕</button>
        </div>

        {/* Current season callout */}
        {stats.current && (
          <div style={{
            background: `${owner.color}08`, border: `1px solid ${owner.color}20`,
            borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex",
            alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 11, color: owner.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                2024 — In Progress
              </div>
              <div style={{ fontSize: 13, color: "#B8AD98" }}>{stats.current.team}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: stats.current.w > stats.current.l ? "#6BCB77" : "#E8E0D0" }}>
                {stats.current.w}-{stats.current.l}
              </div>
              <div style={{ fontSize: 10, color: "#5A5347" }}>Week {stats.current.w + stats.current.l}</div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { l: "Record", v: `${stats.totalW}-${stats.totalL}` },
            { l: "Win %", v: `${(stats.winPct * 100).toFixed(1)}%` },
            { l: "Titles", v: String(stats.titles), h: stats.titles > 0 },
            { l: "Total PF", v: stats.totalPF.toLocaleString() },
          ].map((s) => (
            <div key={s.l} style={{ background: "#141716", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{s.l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.h ? "#D4A853" : "#E8E0D0" }}>{s.v}</div>
            </div>
          ))}
        </div>

        {stats.winPcts.length >= 2 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Win % Trend</div>
            <div style={{ background: "#141716", borderRadius: 8, padding: "12px 16px" }}>
              <Sparkline data={stats.winPcts} color={owner.color} width={460} height={50} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 10, color: "#4A4540" }}>{stats.completed[stats.completed.length - 1]?.season}</span>
                <span style={{ fontSize: 10, color: "#4A4540" }}>{stats.completed[0]?.season}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ fontSize: 10, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Season History</div>
        {stats.completed.map((s) => (
          <div key={s.season} style={{
            display: "grid", gridTemplateColumns: "48px 1fr 55px 65px 22px",
            alignItems: "center", gap: 8, padding: "7px 8px", borderBottom: "1px solid #1A1D1B", fontSize: 12,
          }}>
            <span style={{ color: "#D4A853", fontWeight: 600 }}>{s.season}</span>
            <span style={{ color: "#B8AD98" }}>{s.team}</span>
            <span style={{ color: s.w > s.l ? "#6BCB77" : s.w < s.l ? "#FF6B6B" : "#7A7062", fontWeight: 600, textAlign: "right" }}>{s.w}-{s.l}</span>
            <span style={{ color: "#5A5347", textAlign: "right" }}>{s.pf.toLocaleString()}</span>
            <span style={{ textAlign: "center" }}>{s.champ ? "🏆" : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// OWNER ROW COMPONENT (shared between modes)
// ============================================================
function OwnerRow({ owner, stats, rank, isLeader, animate, delay, onClick, isHovered, onHover, onLeave }) {
  const currentSeason = stats.current;
  return (
    <div
      className="owner-row"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        display: "grid",
        gridTemplateColumns: "40px 42px 1fr 120px 80px 65px 55px 55px",
        alignItems: "center",
        gap: 12,
        padding: "12px 18px",
        background: isLeader ? "#0E100F" : "#0C0E0D",
        border: `1px solid ${isLeader ? "#D4A85320" : "#151817"}`,
        borderRadius: 11,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.2s ease",
        "--rc": owner.color + "35",
        animation: animate ? `fadeUp 0.45s ease ${delay}s both` : "none",
        opacity: animate ? undefined : 1,
      }}
    >
      <div className="row-glow" style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at left, ${owner.color}06 0%, transparent 50%)`,
        opacity: 0, transition: "opacity 0.25s ease", pointerEvents: "none",
      }} />
      {isLeader && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent 10%, ${owner.color}70 50%, transparent 90%)` }} />}

      {/* Rank */}
      <div style={{ textAlign: "center", position: "relative" }}>
        {isLeader ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Crown size={15} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#D4A853", marginTop: -1 }}>1</span>
          </div>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 700, color: "#4A4540" }}>{rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: 9,
        background: `${owner.color}14`, border: `2px solid ${owner.color}${isHovered ? "" : "50"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 700, color: owner.color, transition: "border-color 0.2s ease",
        position: "relative",
      }}>
        {owner.name[0]}
        {currentSeason && (
          <div style={{
            position: "absolute", bottom: -3, right: -3, width: 10, height: 10,
            borderRadius: "50%", background: "#6BCB77", border: "2px solid #0C0E0D",
          }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#6BCB77", animation: "livePulse 2s ease infinite" }} />
          </div>
        )}
      </div>

      {/* Name + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: isLeader ? "#D4A853" : "#E8E0D0", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          {owner.name}
          {!owner.active && <span style={{ fontSize: 9, color: "#5A5347", background: "#1A1D1B", padding: "1px 5px", borderRadius: 3 }}>FORMER</span>}
          {currentSeason && (
            <span style={{ fontSize: 10, color: "#6BCB77", fontWeight: 500 }}>
              {currentSeason.w}-{currentSeason.l}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#4A4540", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {stats.seasonCount} season{stats.seasonCount !== 1 ? "s" : ""}
          {stats.best && <span> · Best: {stats.best.team} '{String(stats.best.season).slice(2)}</span>}
        </div>
      </div>

      {/* Sparkline */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Sparkline data={stats.winPcts} color={owner.color} width={100} height={26} />
      </div>

      {/* Record */}
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E8E0D0" }}>{stats.totalW}-{stats.totalL}</div>
        <div style={{ fontSize: 9, color: "#4A4540" }}>Record</div>
      </div>

      {/* Win % */}
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: stats.winPct >= 0.6 ? "#6BCB77" : stats.winPct >= 0.5 ? "#E8E0D0" : "#FF6B6B" }}>
          {(stats.winPct * 100).toFixed(1)}%
        </div>
        <div style={{ fontSize: 9, color: "#4A4540" }}>Win %</div>
      </div>

      {/* PF */}
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#A89D8B" }}>{(stats.totalPF / 1000).toFixed(1)}k</div>
        <div style={{ fontSize: 9, color: "#4A4540" }}>PF</div>
      </div>

      {/* Titles */}
      <div style={{ textAlign: "center" }}>
        {stats.titles > 0 ? <span style={{ fontSize: 13 }}>{"🏆".repeat(Math.min(stats.titles, 4))}</span> : <span style={{ fontSize: 11, color: "#2A2520" }}>—</span>}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function LeagueVault() {
  const [mode, setMode] = useState("first"); // "first" = reveal, "returning" = instant
  const [phase, setPhase] = useState("loading");
  const [showCards, setShowCards] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [hoveredOwner, setHoveredOwner] = useState(null);
  const [activeOnly, setActiveOnly] = useState(false);

  const ownerStats = useMemo(() =>
    OWNERS_DATA.map((o) => ({ ...o, stats: computeStats(o.id) })).sort((a, b) => b.stats.winPct - a.stats.winPct),
  []);

  const filtered = activeOnly ? ownerStats.filter((o) => o.active) : ownerStats;

  const league = useMemo(() => {
    const allSeasons = new Set(ownerStats.flatMap((o) => o.stats.completed.map((s) => s.season)));
    const totalGames = ownerStats.reduce((s, o) => s + o.stats.totalW + o.stats.totalL, 0) / 2;
    const totalPts = ownerStats.reduce((s, o) => s + o.stats.totalPF, 0);
    const totalTitles = ownerStats.reduce((s, o) => s + o.stats.titles, 0);
    const hasLiveSeason = ownerStats.some((o) => o.stats.current);
    return { seasons: allSeasons.size, games: Math.round(totalGames), points: totalPts, titles: totalTitles, owners: ownerStats.length, live: hasLiveSeason };
  }, [ownerStats]);

  // First-visit animation timeline
  useEffect(() => {
    if (mode === "first") {
      setPhase("loading");
      setShowCards(false);
      const t1 = setTimeout(() => setPhase("reveal"), 2200);
      const t2 = setTimeout(() => setShowCards(true), 3400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setPhase("reveal");
      setShowCards(true);
    }
  }, [mode]);

  const isFirstVisit = mode === "first";
  const isAnimating = isFirstVisit && phase === "reveal";
  const selectedData = selectedOwner ? ownerStats.find((o) => o.id === selectedOwner) : null;
  const selectedRank = selectedOwner ? ownerStats.findIndex((o) => o.id === selectedOwner) + 1 : 0;

  // ---- LOADING ----
  if (phase === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0C0B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes dotP { 0%,80%,100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
          @keyframes barG { 0% { width: 0%; } 60% { width: 80%; } 100% { width: 100%; } }
          @keyframes bPulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        `}</style>
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4A853", animation: `dotP 1.4s ease ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#D4A853", marginBottom: 8, animation: "bPulse 2s ease infinite" }}>Building your league history...</div>
        <div style={{ fontSize: 12, color: "#5A5347", marginBottom: 24 }}>Merging {league.seasons} seasons of data</div>
        <div style={{ width: 200, height: 3, background: "#1A1D1B", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg, #D4A853, #B8922E)", borderRadius: 2, animation: "barG 2s ease-out forwards" }} />
        </div>
      </div>
    );
  }

  // ---- VAULT VIEW (both modes) ----
  return (
    <div style={{ minHeight: "100vh", background: "#0A0C0B", fontFamily: "'JetBrains Mono', monospace", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes livePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .owner-row:hover { transform: translateY(-2px); border-color: var(--rc) !important; }
        .owner-row:hover .row-glow { opacity: 1 !important; }
        .mode-btn { transition: all 0.15s ease; }
        .mode-btn:hover { background: #1E2420 !important; color: #D4A853 !important; }
        .filter-btn { transition: all 0.15s ease; }
        .filter-btn:hover { border-color: #D4A85340 !important; color: #D4A853 !important; }
      `}</style>

      {selectedData && (
        <OwnerModal
          owner={selectedData}
          stats={selectedData.stats}
          rank={selectedRank}
          onClose={() => setSelectedOwner(null)}
        />
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px", position: "relative" }}>

        {/* Demo mode toggle */}
        <div style={{
          display: "flex", justifyContent: "center", marginBottom: 24,
          background: "#0E100F", border: "1px solid #1A1D1B", borderRadius: 8, padding: 3,
          width: "fit-content", margin: "0 auto 28px",
        }}>
          {[
            { key: "first", label: "First Visit (Reveal)" },
            { key: "returning", label: "Returning Visit (Instant)" },
          ].map((m) => (
            <button
              key={m.key}
              className="mode-btn"
              onClick={() => setMode(m.key)}
              style={{
                padding: "7px 16px", borderRadius: 6, border: "none",
                background: mode === m.key ? "#1A1D1B" : "transparent",
                color: mode === m.key ? "#D4A853" : "#5A5347",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Header area */}
        <div style={{
          textAlign: "center", marginBottom: 40,
          animation: isAnimating ? "fadeUp 0.7s ease 0.2s both" : "none",
        }}>
          {isFirstVisit && (
            <div style={{ fontSize: 11, color: "#5A5347", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10 }}>
              Your League History is Ready
            </div>
          )}
          <h1 style={{
            fontSize: isFirstVisit ? 34 : 28, fontWeight: 700, color: "#D4A853",
            fontFamily: "'Georgia', serif", letterSpacing: "-0.02em", marginBottom: 6,
            ...(isFirstVisit ? {
              background: "linear-gradient(90deg, #D4A853, #FFF3C4, #D4A853)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              animation: "shimmer 3s ease-in-out infinite",
            } : {}),
          }}>
            League Vault
          </h1>
          {isFirstVisit ? (
            <div style={{ fontSize: 13, color: "#6A6254" }}>{league.seasons} years of history, unified for the first time</div>
          ) : (
            <div style={{ fontSize: 12, color: "#5A5347" }}>
              {league.seasons} seasons · {league.owners} owners
              {league.live && <span style={{ color: "#6BCB77", marginLeft: 8 }}>● 2024 Season Live</span>}
            </div>
          )}
        </div>

        {/* League headline stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 36,
          animation: isAnimating ? "fadeUp 0.7s ease 0.5s both" : "none",
        }}>
          {[
            { l: "Seasons", v: league.seasons },
            { l: "Owners", v: league.owners },
            { l: "Games Played", v: league.games },
            { l: "Total Points", v: league.points },
            { l: "Championships", v: league.titles },
          ].map((s, i) => (
            <div key={s.l} style={{
              textAlign: "center", padding: "16px 10px",
              background: "#0E100F", borderRadius: 10, border: "1px solid #161918",
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#E8E0D0", fontFamily: "'Georgia', serif", marginBottom: 3 }}>
                {isAnimating ? <AnimatedNum target={s.v} delay={700 + i * 120} dur={1200} /> : s.v.toLocaleString()}
              </div>
              <div style={{ fontSize: 9, color: "#4A4540", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Section divider + filter */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 18,
          animation: isAnimating ? "fadeUp 0.7s ease 0.9s both" : "none",
        }}>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg, transparent, #222520)" }} />
          <span style={{ fontSize: 10, color: "#4A4540", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 }}>
            All-Time Rankings
          </span>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg, #222520, transparent)" }} />
          <button
            className="filter-btn"
            onClick={() => setActiveOnly(!activeOnly)}
            style={{
              fontSize: 10, padding: "4px 10px", borderRadius: 5,
              border: `1px solid ${activeOnly ? "#D4A85340" : "#1C1F1D"}`,
              background: activeOnly ? "#D4A85310" : "transparent",
              color: activeOnly ? "#D4A853" : "#4A4540",
              cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Active Only
          </button>
        </div>

        {/* Owner rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((owner, i) => {
            const globalRank = ownerStats.findIndex((o) => o.id === owner.id) + 1;
            return (
              <OwnerRow
                key={owner.id}
                owner={owner}
                stats={owner.stats}
                rank={globalRank}
                isLeader={globalRank === 1}
                animate={isAnimating}
                delay={1.1 + i * 0.08}
                onClick={() => setSelectedOwner(owner.id)}
                isHovered={hoveredOwner === owner.id}
                onHover={() => setHoveredOwner(owner.id)}
                onLeave={() => setHoveredOwner(null)}
              />
            );
          })}
        </div>

        {/* Bottom CTA — only on first visit */}
        {isFirstVisit && (
          <div style={{
            textAlign: "center", marginTop: 44, paddingTop: 28, borderTop: "1px solid #1A1D1B",
            animation: showCards ? `fadeUp 0.7s ease ${1.1 + filtered.length * 0.08 + 0.3}s both` : "none",
            opacity: showCards ? undefined : 0,
          }}>
            <div style={{ fontSize: 12, color: "#5A5347", marginBottom: 14, lineHeight: 1.6 }}>
              Everything look right? Save to unlock your full League Vault with<br />
              head-to-head records, draft history, and unified all-time stats.
            </div>
            <button
              style={{
                padding: "14px 44px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #D4A853 0%, #B8922E 100%)",
                color: "#0A0C0B", fontSize: 15, fontWeight: 700,
                cursor: "pointer", fontFamily: "'Georgia', serif",
                boxShadow: "0 6px 28px #D4A85335",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 36px #D4A85350"; }}
              onMouseLeave={(e) => { e.target.style.transform = ""; e.target.style.boxShadow = "0 6px 28px #D4A85335"; }}
            >
              Save & Unlock Your League Vault
            </button>
            <div style={{ fontSize: 11, color: "#3A3530", marginTop: 10 }}>You can edit assignments anytime in League Settings</div>
          </div>
        )}
      </div>
    </div>
  );
}
