import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// DATA — simulating what the Yahoo import actually gives us
// ============================================================
const IMPORTED_TEAMS = [
  { id: "t1", name: "South Beach Talent", season: 2023, record: "11-2", pf: 1463 },
  { id: "t2", name: "Loud Noises", season: 2023, record: "11-2", pf: 1394 },
  { id: "t3", name: "Balls of Steel", season: 2023, record: "9-4", pf: 1313 },
  { id: "t4", name: "Bi-Winning", season: 2023, record: "9-4", pf: 1478 },
  { id: "t5", name: "The Fear Boners", season: 2023, record: "9-4", pf: 1442 },
  { id: "t6", name: "SWAMP DONKEYS", season: 2022, record: "8-5", pf: 1204 },
  { id: "t7", name: "Chubby Chasers", season: 2022, record: "8-5", pf: 1213 },
  { id: "t8", name: "CeeDee's Nuts", season: 2022, record: "6-7", pf: 1098 },
  { id: "t9", name: "Run DMC", season: 2021, record: "8-5", pf: 1318 },
  { id: "t10", name: "Whale", season: 2021, record: "8-5", pf: 1160 },
  { id: "t11", name: "Lamar the Merrier", season: 2021, record: "7-6", pf: 1245 },
  { id: "t12", name: "A-Team", season: 2020, record: "7-6", pf: 1141 },
  { id: "t13", name: "Anthony", season: 2020, record: "7-6", pf: 1188 },
  { id: "t14", name: "Awesometown", season: 2019, record: "7-6", pf: 1207 },
  { id: "t15", name: "Beast Mode Engaged", season: 2019, record: "8-5", pf: 1289 },
  { id: "t16", name: "BoomGoesTheDynamite", season: 2018, record: "6-7", pf: 1054 },
  { id: "t17", name: "Caleb", season: 2018, record: "7-6", pf: 1176 },
  { id: "t18", name: "Dallas", season: 2017, record: "9-4", pf: 1356 },
  { id: "t19", name: "Free Win Team", season: 2017, record: "7-6", pf: 1141 },
  { id: "t20", name: "Jakob", season: 2016, record: "10-3", pf: 1402 },
  { id: "t21", name: "Just Win Baby", season: 2016, record: "8-5", pf: 1244 },
  { id: "t22", name: "K&A all the way", season: 2015, record: "6-7", pf: 1089 },
  { id: "t23", name: "Lambeau Leapers", season: 2015, record: "9-4", pf: 1334 },
  { id: "t24", name: "MIND MELTZ", season: 2014, record: "7-6", pf: 1233 },
  { id: "t25", name: "Mase R", season: 2014, record: "5-8", pf: 1022 },
  { id: "t26", name: "Mob Slobbin", season: 2013, record: "6-7", pf: 1098 },
  { id: "t27", name: "Oh Like Ndamukong", season: 2013, record: "7-6", pf: 1222 },
  { id: "t28", name: "Paul", season: 2012, record: "8-6", pf: 1350 },
  { id: "t29", name: "The Wanna Be's", season: 2012, record: "6-7", pf: 1145 },
  { id: "t30", name: "ShowMeYourTDs", season: 2012, record: "5-8", pf: 1034 },
  { id: "t31", name: "The Janitors", season: 2011, record: "7-6", pf: 1207 },
  { id: "t32", name: "black mamba", season: 2011, record: "7-6", pf: 1173 },
  { id: "t33", name: "Porkchop Express", season: 2011, record: "6-7", pf: 1088 },
  { id: "t34", name: "Ragen", season: 2010, record: "10-3", pf: 1445 },
  { id: "t35", name: "Raging Bull", season: 2010, record: "8-5", pf: 1298 },
  { id: "t36", name: "The Muscle Hamsters", season: 2010, record: "4-9", pf: 943 },
  { id: "t37", name: "Scott's Tots", season: 2009, record: "7-6", pf: 1156 },
  { id: "t38", name: "The Replacements", season: 2009, record: "5-8", pf: 987 },
  { id: "t39", name: "Touchdown Machine", season: 2009, record: "9-4", pf: 1367 },
  { id: "t40", name: "Victorious Secret", season: 2008, record: "8-5", pf: 1234 },
];

// Auto-detect: names that look like real people (single word, capitalized, common name patterns)
const COMMON_NAMES = new Set([
  "anthony", "caleb", "dallas", "jakob", "paul", "eric", "nick", "kirk",
  "bradley", "gabriel", "scott", "marcus", "jake", "ryan", "tyler",
  "brandon", "derek", "matt", "mike", "chris", "adam", "josh", "ben",
  "aaron", "travis", "kevin", "brian", "david", "jason", "andrew",
  "daniel", "james", "john", "robert", "william", "thomas", "charles",
]);

function detectPossibleOwners(teams) {
  const detected = [];
  teams.forEach((t) => {
    const lower = t.name.toLowerCase().trim();
    if (COMMON_NAMES.has(lower)) {
      detected.push({ name: t.name, fromTeamId: t.id, season: t.season });
    }
  });
  // Deduplicate by name
  const unique = {};
  detected.forEach((d) => {
    const key = d.name.toLowerCase();
    if (!unique[key]) unique[key] = d;
  });
  return Object.values(unique);
}

const OWNER_COLORS = [
  "#D4A853", "#6BCB77", "#4D96FF", "#FF6B6B", "#C084FC",
  "#FF9F43", "#54A0FF", "#EE5A6F", "#01CBC6", "#F368E0",
  "#FF6348", "#7BED9F", "#70A1FF", "#FFA502", "#A29BFE",
  "#FD79A8", "#FDCB6E", "#6C5CE7", "#00CEC9", "#E17055",
];

// ============================================================
// COMPONENTS
// ============================================================

const TorchFlame = ({ color, size = 12 }) => (
  <svg width={size} height={size * 1.4} viewBox="0 0 16 22" style={{ filter: `drop-shadow(0 0 3px ${color}55)` }}>
    <defs>
      <linearGradient id={`fl-${color.replace("#", "")}`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor={color} />
        <stop offset="100%" stopColor="#FFF3C4" />
      </linearGradient>
    </defs>
    <ellipse cx="8" cy="14" rx="3.5" ry="7" fill={`url(#fl-${color.replace("#", "")})`} opacity="0.85">
      <animate attributeName="ry" values="7;6.2;7.3;6.5;7" dur="0.8s" repeatCount="indefinite" />
      <animate attributeName="rx" values="3.5;3;3.8;3.2;3.5" dur="0.6s" repeatCount="indefinite" />
    </ellipse>
    <ellipse cx="8" cy="12" rx="2" ry="4" fill="#FFF3C4" opacity="0.5">
      <animate attributeName="ry" values="4;3.5;4.3;3.8;4" dur="0.7s" repeatCount="indefinite" />
    </ellipse>
  </svg>
);

// ============================================================
// MAIN APP
// ============================================================
export default function ClaimModeV2() {
  // Step: "owners" or "claim" or "confirm"
  const [step, setStep] = useState("owners");

  // Owner identification state
  const [owners, setOwners] = useState([]);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [detectedNames, setDetectedNames] = useState([]);
  const [dismissedDetections, setDismissedDetections] = useState(new Set());
  const inputRef = useRef(null);

  // Claim state
  const [activeOwnerId, setActiveOwnerId] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [undoStack, setUndoStack] = useState([]);
  const [showBanner, setShowBanner] = useState(true);
  const [sortBy, setSortBy] = useState("season");
  const [filterSeason, setFilterSeason] = useState(null);
  const [animatingTeam, setAnimatingTeam] = useState(null);
  const [justAssigned, setJustAssigned] = useState(null);

  // Initialize auto-detected names
  useEffect(() => {
    setDetectedNames(detectPossibleOwners(IMPORTED_TEAMS));
  }, []);

  // ---- Owner management ----
  const addOwner = (name, isActive = true) => {
    if (!name.trim()) return;
    const exists = owners.some((o) => o.name.toLowerCase() === name.trim().toLowerCase());
    if (exists) return;
    const id = `owner-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const colorIdx = owners.length % OWNER_COLORS.length;
    setOwners((prev) => [
      ...prev,
      { id, name: name.trim(), color: OWNER_COLORS[colorIdx], active: isActive },
    ]);
    setNewOwnerName("");
  };

  const removeOwner = (id) => {
    setOwners((prev) => prev.filter((o) => o.id !== id));
    // Clean up any assignments for this owner
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k] === id) delete next[k];
      });
      return next;
    });
    if (activeOwnerId === id) setActiveOwnerId(null);
  };

  const toggleOwnerActive = (id) => {
    setOwners((prev) =>
      prev.map((o) => (o.id === id ? { ...o, active: !o.active } : o))
    );
  };

  const confirmDetection = (detection) => {
    addOwner(detection.name);
    setDismissedDetections((prev) => new Set([...prev, detection.name.toLowerCase()]));
  };

  const dismissDetection = (detection) => {
    setDismissedDetections((prev) => new Set([...prev, detection.name.toLowerCase()]));
  };

  const pendingDetections = detectedNames.filter(
    (d) =>
      !dismissedDetections.has(d.name.toLowerCase()) &&
      !owners.some((o) => o.name.toLowerCase() === d.name.toLowerCase())
  );

  // ---- Claim logic ----
  const getOwnerById = (id) => owners.find((o) => o.id === id);
  const getTeamsForOwner = (ownerId) =>
    IMPORTED_TEAMS.filter((t) => assignments[t.id] === ownerId).sort(
      (a, b) => b.season - a.season
    );

  const totalTeams = IMPORTED_TEAMS.length;
  const assignedCount = Object.keys(assignments).length;
  const unassignedCount = totalTeams - assignedCount;
  const unassignedTeams = IMPORTED_TEAMS.filter((t) => !assignments[t.id]);

  const sortedUnassigned = [...unassignedTeams].sort((a, b) =>
    sortBy === "season" ? b.season - a.season : a.name.localeCompare(b.name)
  );
  const filteredUnassigned = filterSeason
    ? sortedUnassigned.filter((t) => t.season === filterSeason)
    : sortedUnassigned;

  const seasons = [...new Set(IMPORTED_TEAMS.map((t) => t.season))].sort((a, b) => b - a);

  const assignTeam = useCallback(
    (teamId) => {
      if (!activeOwnerId) return;
      setUndoStack((prev) => [...prev, { teamId, prevOwner: assignments[teamId] || null }]);
      setAssignments((prev) => ({ ...prev, [teamId]: activeOwnerId }));
      setAnimatingTeam(teamId);
      setJustAssigned(teamId);
      setTimeout(() => setAnimatingTeam(null), 350);
      setTimeout(() => setJustAssigned(null), 1000);
    },
    [activeOwnerId, assignments]
  );

  const unassignTeam = useCallback(
    (teamId) => {
      setUndoStack((prev) => [...prev, { teamId, prevOwner: assignments[teamId] }]);
      setAssignments((prev) => {
        const next = { ...prev };
        delete next[teamId];
        return next;
      });
    },
    [assignments]
  );

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    if (last.prevOwner) {
      setAssignments((prev) => ({ ...prev, [last.teamId]: last.prevOwner }));
    } else {
      setAssignments((prev) => {
        const next = { ...prev };
        delete next[last.teamId];
        return next;
      });
    }
  }, [undoStack]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && step === "claim") {
        e.preventDefault();
        undo();
      }
      if (step === "claim") {
        const num = parseInt(e.key);
        if (num >= 1 && num <= owners.length && num <= 9) {
          setActiveOwnerId(owners[num - 1].id);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, owners, step]);

  const activeOwner = getOwnerById(activeOwnerId);

  // ============================================================
  // STYLES
  // ============================================================
  const S = {
    app: {
      minHeight: "100vh",
      background: "#0B0D0C",
      color: "#E8E0D0",
      fontFamily: "'JetBrains Mono', 'Menlo', 'SF Mono', monospace",
    },
    container: { maxWidth: 1200, margin: "0 auto", padding: "28px 24px", position: "relative" },
    breadcrumb: { fontSize: 11, color: "#5A5347", marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" },
    title: { fontSize: 26, fontWeight: 700, color: "#D4A853", marginBottom: 4, fontFamily: "'Georgia', serif", letterSpacing: "-0.01em" },
    subtitle: { fontSize: 13, color: "#7A7062", lineHeight: 1.5, marginBottom: 0 },
    // Step indicator
    steps: { display: "flex", gap: 0, marginBottom: 28, marginTop: 20, background: "#111413", borderRadius: 10, overflow: "hidden", border: "1px solid #1C1F1D" },
    stepTab: (active, completed) => ({
      flex: 1,
      padding: "12px 16px",
      fontSize: 12,
      fontWeight: 600,
      color: active ? "#D4A853" : completed ? "#6BCB77" : "#4A4540",
      background: active ? "#1A1D1B" : "transparent",
      border: "none",
      borderBottom: active ? "2px solid #D4A853" : "2px solid transparent",
      cursor: completed || active ? "pointer" : "default",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: 8,
      justifyContent: "center",
      transition: "all 0.2s ease",
    }),
    stepNumber: (active, completed) => ({
      width: 22,
      height: 22,
      borderRadius: "50%",
      border: `1.5px solid ${active ? "#D4A853" : completed ? "#6BCB77" : "#3A3530"}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 700,
      color: active ? "#D4A853" : completed ? "#6BCB77" : "#3A3530",
      background: completed ? "#6BCB7715" : "transparent",
    }),
  };

  // ============================================================
  // STEP 1: IDENTIFY OWNERS
  // ============================================================
  if (step === "owners") {
    return (
      <div style={S.app}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes fadeSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 #D4A85300; } 50% { box-shadow: 0 0 12px 2px #D4A85330; } }
          .detected-card:hover { border-color: #D4A85360 !important; background: #D4A85308 !important; }
          .owner-tag:hover .remove-owner { opacity: 1 !important; }
          .add-input:focus { border-color: #D4A853 !important; outline: none; box-shadow: 0 0 0 3px #D4A85315; }
          .team-ref:hover { background: #1E242060 !important; }
          .active-toggle:hover { background: #1E242080 !important; }
          .proceed-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px #D4A85350 !important; }
          .proceed-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        `}</style>
        <div style={S.container}>
          <div style={S.breadcrumb}>League Vault → Import → Step 1 of 2</div>
          <h1 style={S.title}>Who's in this league?</h1>
          <p style={S.subtitle}>
            Before assigning teams, let's identify every person who has ever been in this league — past and present.
            We found <strong style={{ color: "#D4A853" }}>{IMPORTED_TEAMS.length} team names</strong> across{" "}
            <strong style={{ color: "#D4A853" }}>{seasons.length} seasons</strong>.
          </p>

          {/* Step tabs */}
          <div style={S.steps}>
            <button style={S.stepTab(true, false)}>
              <span style={S.stepNumber(true, false)}>1</span>
              Identify Owners
            </button>
            <button style={S.stepTab(false, false)} disabled>
              <span style={S.stepNumber(false, false)}>2</span>
              Assign Teams
            </button>
            <button style={S.stepTab(false, false)} disabled>
              <span style={S.stepNumber(false, false)}>3</span>
              Confirm & Save
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>
            {/* LEFT: Owner building */}
            <div>
              {/* Auto-detected names */}
              {pendingDetections.length > 0 && (
                <div style={{
                  background: "#111413",
                  border: "1px solid #D4A85325",
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>✨</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#D4A853" }}>
                      We found some names
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#7A7062", marginBottom: 16, lineHeight: 1.5 }}>
                    These team names look like they might be real people. Confirm to add them as owners, or dismiss if they're just team names.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {pendingDetections.map((d, i) => (
                      <div
                        key={d.name}
                        className="detected-card"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: "1px solid #1C1F1D",
                          background: "#0E100F",
                          animation: `fadeSlide 0.3s ease ${i * 0.05}s both`,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: "#D4A85315", border: "1px solid #D4A85330",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14, fontWeight: 700, color: "#D4A853",
                          }}>
                            {d.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#E8E0D0" }}>
                              {d.name}
                            </div>
                            <div style={{ fontSize: 11, color: "#5A5347" }}>
                              Found as team name in {d.season}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => confirmDetection(d)}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6,
                              border: "1px solid #6BCB7740", background: "#6BCB7715",
                              color: "#6BCB77", cursor: "pointer", fontFamily: "inherit",
                            }}
                          >
                            ✓ Add
                          </button>
                          <button
                            onClick={() => dismissDetection(d)}
                            style={{
                              fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 6,
                              border: "1px solid #2A2E28", background: "transparent",
                              color: "#5A5347", cursor: "pointer", fontFamily: "inherit",
                            }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual add */}
              <div style={{
                background: "#111413",
                border: "1px solid #1C1F1D",
                borderRadius: 12,
                padding: 20,
                marginBottom: 20,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#B8AD98", marginBottom: 12 }}>
                  Add Owners
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <input
                    ref={inputRef}
                    className="add-input"
                    type="text"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addOwner(newOwnerName);
                        inputRef.current?.focus();
                      }
                    }}
                    placeholder="Type a name and press Enter..."
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 8,
                      border: "1px solid #2A2E28", background: "#0B0D0C",
                      color: "#E8E0D0", fontSize: 13, fontFamily: "inherit",
                      transition: "all 0.2s ease",
                    }}
                  />
                  <button
                    onClick={() => { addOwner(newOwnerName); inputRef.current?.focus(); }}
                    disabled={!newOwnerName.trim()}
                    style={{
                      padding: "10px 18px", borderRadius: 8,
                      border: "none",
                      background: newOwnerName.trim() ? "#D4A853" : "#2A2E28",
                      color: newOwnerName.trim() ? "#0B0D0C" : "#5A5347",
                      fontSize: 13, fontWeight: 700, cursor: newOwnerName.trim() ? "pointer" : "default",
                      fontFamily: "inherit", transition: "all 0.2s ease",
                    }}
                  >
                    Add
                  </button>
                </div>

                {/* Current owners */}
                {owners.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 16px", color: "#4A4540", fontSize: 12, lineHeight: 1.6 }}>
                    No owners added yet. Confirm detected names above or type names manually.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {owners.map((owner, i) => (
                      <div
                        key={owner.id}
                        className="owner-tag"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 12px", borderRadius: 8,
                          border: `1px solid ${owner.color}25`,
                          background: `${owner.color}08`,
                          animation: `fadeSlide 0.2s ease both`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <TorchFlame color={owner.color} size={10} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: owner.color }}>
                            {owner.name}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            className="active-toggle"
                            onClick={() => toggleOwnerActive(owner.id)}
                            style={{
                              fontSize: 10, padding: "3px 8px", borderRadius: 4,
                              border: `1px solid ${owner.active ? "#6BCB7730" : "#5A534730"}`,
                              background: owner.active ? "#6BCB7710" : "transparent",
                              color: owner.active ? "#6BCB77" : "#5A5347",
                              cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                              transition: "all 0.15s ease",
                            }}
                          >
                            {owner.active ? "ACTIVE" : "FORMER"}
                          </button>
                          <button
                            className="remove-owner"
                            onClick={() => removeOwner(owner.id)}
                            style={{
                              background: "none", border: "none", color: "#5A534760",
                              cursor: "pointer", fontSize: 14, padding: "2px 4px",
                              opacity: 0, transition: "opacity 0.15s ease",
                              fontFamily: "inherit",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 14, fontSize: 11, color: "#4A4540", display: "flex", justifyContent: "space-between" }}>
                  <span>{owners.length} owner{owners.length !== 1 ? "s" : ""} identified</span>
                  <span>{owners.filter((o) => o.active).length} active · {owners.filter((o) => !o.active).length} former</span>
                </div>
              </div>

              {/* Proceed button */}
              <button
                className="proceed-btn"
                disabled={owners.length === 0}
                onClick={() => {
                  setStep("claim");
                  if (owners.length > 0) setActiveOwnerId(owners[0].id);
                }}
                style={{
                  width: "100%", padding: "14px 24px", borderRadius: 10,
                  border: "none",
                  background: owners.length > 0 ? "linear-gradient(135deg, #D4A853 0%, #B8922E 100%)" : "#2A2E28",
                  color: owners.length > 0 ? "#0B0D0C" : "#5A5347",
                  fontSize: 14, fontWeight: 700, cursor: owners.length > 0 ? "pointer" : "default",
                  fontFamily: "inherit", letterSpacing: "0.02em",
                  boxShadow: owners.length > 0 ? "0 4px 20px #D4A85330" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                Continue to Team Assignment →
              </button>
            </div>

            {/* RIGHT: Reference — all team names */}
            <div style={{
              background: "#111413",
              border: "1px solid #1C1F1D",
              borderRadius: 12,
              padding: 16,
              position: "sticky",
              top: 20,
              maxHeight: "calc(100vh - 60px)",
              overflowY: "auto",
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#5A5347", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Reference: All Team Names
              </div>
              <div style={{ fontSize: 11, color: "#4A4540", marginBottom: 14, lineHeight: 1.5 }}>
                Use this to jog your memory. Who was "BoomGoesTheDynamite"?
              </div>
              {seasons.map((year) => {
                const teamsInYear = IMPORTED_TEAMS.filter((t) => t.season === year);
                return (
                  <div key={year} style={{ marginBottom: 12 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: "#D4A853", marginBottom: 4,
                      padding: "4px 0", borderBottom: "1px solid #1C1F1D",
                    }}>
                      {year}
                    </div>
                    {teamsInYear.map((t) => (
                      <div
                        key={t.id}
                        className="team-ref"
                        style={{
                          display: "flex", justifyContent: "space-between",
                          padding: "4px 6px", borderRadius: 4,
                          fontSize: 12, color: "#8B7E6A",
                          transition: "background 0.1s ease",
                        }}
                      >
                        <span>{t.name}</span>
                        <span style={{ color: "#4A4540", fontSize: 11 }}>{t.record}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP 3: CONFIRM
  // ============================================================
  if (step === "confirm") {
    return (
      <div style={S.app}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          .back-btn:hover { border-color: #D4A85360 !important; color: #D4A853 !important; }
          .merge-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 28px #D4A85360 !important; }
        `}</style>
        <div style={S.container}>
          <div style={S.breadcrumb}>League Vault → Import → Step 3 of 3</div>
          <h1 style={S.title}>Confirm & Merge</h1>
          <p style={S.subtitle}>
            Review the assignments below. Once saved, all team data will be merged under each owner for unified all-time stats.
          </p>

          <div style={S.steps}>
            <button onClick={() => setStep("owners")} style={S.stepTab(false, true)}>
              <span style={S.stepNumber(false, true)}>✓</span>
              Identify Owners
            </button>
            <button onClick={() => setStep("claim")} style={S.stepTab(false, true)}>
              <span style={S.stepNumber(false, true)}>✓</span>
              Assign Teams
            </button>
            <button style={S.stepTab(true, false)}>
              <span style={S.stepNumber(true, false)}>3</span>
              Confirm & Save
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
            {owners.map((owner) => {
              const teams = getTeamsForOwner(owner.id);
              const totalW = teams.reduce((s, t) => s + parseInt(t.record.split("-")[0]), 0);
              const totalL = teams.reduce((s, t) => s + parseInt(t.record.split("-")[1]), 0);
              const totalPF = teams.reduce((s, t) => s + t.pf, 0);
              return (
                <div key={owner.id} style={{
                  background: "#111413", border: `1px solid ${owner.color}25`,
                  borderRadius: 12, padding: 16, position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${owner.color}, transparent)` }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: `${owner.color}18`, border: `2px solid ${owner.color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 700, color: owner.color,
                    }}>
                      {owner.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: owner.color }}>
                        {owner.name}
                        {!owner.active && <span style={{ fontSize: 10, color: "#5A5347", marginLeft: 6 }}>FORMER</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#5A5347" }}>
                        {teams.length} season{teams.length !== 1 ? "s" : ""}{teams.length > 0 ? ` · ${totalW}-${totalL} · ${totalPF.toLocaleString()} PF` : ""}
                      </div>
                    </div>
                  </div>
                  {teams.length === 0 ? (
                    <div style={{ fontSize: 11, color: "#4A4540", fontStyle: "italic" }}>No teams assigned</div>
                  ) : (
                    teams.map((t) => (
                      <div key={t.id} style={{
                        display: "flex", justifyContent: "space-between", padding: "4px 0",
                        fontSize: 12, color: "#8B7E6A", borderBottom: "1px solid #1C1F1D15",
                      }}>
                        <span>{t.name}</span>
                        <span style={{ color: "#4A4540" }}>{t.season} · {t.record}</span>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
            {unassignedCount > 0 && (
              <div style={{
                background: "#111413", border: "1px dashed #2A2E28",
                borderRadius: 12, padding: 16,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#5A5347", marginBottom: 12 }}>
                  Unassigned ({unassignedCount})
                </div>
                <div style={{ fontSize: 11, color: "#4A4540", marginBottom: 10, lineHeight: 1.5 }}>
                  These teams won't be merged into any owner's stats. You can go back to assign them.
                </div>
                {unassignedTeams.slice(0, 8).map((t) => (
                  <div key={t.id} style={{
                    display: "flex", justifyContent: "space-between", padding: "4px 0",
                    fontSize: 12, color: "#4A454080",
                  }}>
                    <span>{t.name}</span>
                    <span>{t.season}</span>
                  </div>
                ))}
                {unassignedTeams.length > 8 && (
                  <div style={{ fontSize: 11, color: "#4A4540", marginTop: 6 }}>
                    +{unassignedTeams.length - 8} more
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid #1C1F1D" }}>
            <button
              className="back-btn"
              onClick={() => setStep("claim")}
              style={{
                padding: "10px 20px", borderRadius: 8, border: "1px solid #2A2E28",
                background: "#111413", color: "#7A7062", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease",
              }}
            >
              ← Back to Editing
            </button>
            <button
              className="merge-btn"
              style={{
                padding: "12px 32px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg, #D4A853 0%, #B8922E 100%)",
                color: "#0B0D0C", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em",
                boxShadow: "0 4px 20px #D4A85340", transition: "all 0.2s ease",
              }}
            >
              Save & Merge All Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP 2: CLAIM TEAMS
  // ============================================================
  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes flashGold { 0% { background: #D4A85318; } 100% { background: transparent; } }
        .team-card { transition: all 0.15s ease; }
        .team-card:hover { border-color: ${activeOwner ? activeOwner.color + "50" : "#3A3530"} !important; background: ${activeOwner ? activeOwner.color + "0A" : "#161918"} !important; transform: translateY(-1px); }
        .sidebar-team:hover { background: #1A1D1B !important; }
        .sidebar-team:hover .rx { color: #FF6B6B !important; }
        .undo-btn:hover { border-color: #D4A85360 !important; color: #D4A853 !important; }
        .owner-chip { transition: all 0.15s ease; }
        .owner-chip:hover { border-color: var(--oc) !important; }
        .season-pill:hover { color: #D4A853 !important; background: #D4A85312 !important; }
        .just-flash { animation: flashGold 0.8s ease-out forwards; }
        .save-bottom:hover { transform: translateY(-1px); box-shadow: 0 6px 24px #D4A85350 !important; }
      `}</style>
      <div style={S.container}>
        <div style={S.breadcrumb}>League Vault → Import → Step 2 of 3</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <h1 style={S.title}>Assign Teams to Owners</h1>
            <p style={S.subtitle}>Select an owner, then tap teams to claim them.</p>
          </div>
          <button className="undo-btn" onClick={undo} disabled={undoStack.length === 0} style={{
            fontSize: 12, padding: "8px 14px", borderRadius: 8, border: "1px solid #2A2E28",
            background: "#111413", color: "#7A7062", cursor: undoStack.length === 0 ? "default" : "pointer",
            fontFamily: "inherit", fontWeight: 500, opacity: undoStack.length === 0 ? 0.35 : 1,
            display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s ease",
          }}>
            ↩ Undo
          </button>
        </div>

        {/* Step tabs */}
        <div style={S.steps}>
          <button onClick={() => setStep("owners")} style={S.stepTab(false, true)}>
            <span style={S.stepNumber(false, true)}>✓</span>
            Owners ({owners.length})
          </button>
          <button style={S.stepTab(true, false)}>
            <span style={S.stepNumber(true, false)}>2</span>
            Assign Teams
          </button>
          <button style={S.stepTab(false, false)} disabled>
            <span style={S.stepNumber(false, false)}>3</span>
            Confirm & Save
          </button>
        </div>

        {/* Banner */}
        {showBanner && (
          <div style={{
            background: "#111413", border: "1px solid #1C1F1D", borderRadius: 10,
            padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 12, position: "relative",
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>💡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#D4A853", marginBottom: 3 }}>Can't remember who had which team?</div>
              <div style={{ fontSize: 12, color: "#7A7062", lineHeight: 1.5 }}>
                Tell your league members to check their old Yahoo/ESPN accounts for past team names, then have them come here to claim their own teams.{" "}
                <span style={{ color: "#D4A853", textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer" }}>Copy invite link</span>
              </div>
            </div>
            <button onClick={() => setShowBanner(false)} style={{ background: "none", border: "none", color: "#4A4540", cursor: "pointer", fontSize: 14, padding: 4 }}>✕</button>
          </div>
        )}

        {/* Progress */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "#5A5347" }}>
          <span><strong style={{ color: "#D4A853" }}>{assignedCount}</strong> of <strong>{totalTeams}</strong> assigned</span>
          <span>{unassignedCount} remaining</span>
        </div>
        <div style={{ background: "#111413", borderRadius: 6, height: 5, marginBottom: 18, overflow: "hidden", display: "flex" }}>
          {owners.map((o) => {
            const ct = getTeamsForOwner(o.id).length;
            return <div key={o.id} style={{ width: `${(ct / totalTeams) * 100}%`, background: o.color, transition: "width 0.3s ease", borderRight: ct > 0 ? "1px solid #0B0D0C" : "none" }} />;
          })}
        </div>

        {/* Owner chips */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#4A4540", marginRight: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigning to:</span>
          {owners.map((owner, i) => {
            const isActive = activeOwnerId === owner.id;
            const ct = getTeamsForOwner(owner.id).length;
            return (
              <div
                key={owner.id}
                className="owner-chip"
                onClick={() => setActiveOwnerId(isActive ? null : owner.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "7px 12px", borderRadius: 7,
                  border: `1.5px solid ${isActive ? owner.color : "#2A2E28"}`,
                  background: isActive ? `${owner.color}12` : "#111413",
                  cursor: "pointer",
                  boxShadow: isActive ? `0 0 16px ${owner.color}18` : "none",
                  "--oc": owner.color + "50",
                }}
              >
                <TorchFlame color={isActive ? owner.color : "#4A4540"} size={9} />
                <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? owner.color : "#7A7062" }}>
                  {owner.name}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: isActive ? owner.color : "#4A4540",
                  background: isActive ? `${owner.color}18` : "#0B0D0C",
                  padding: "1px 5px", borderRadius: 3, minWidth: 18, textAlign: "center",
                }}>
                  {ct}
                </span>
                {i < 9 && <span style={{ fontSize: 9, color: "#3A3530", background: "#0B0D0C", padding: "1px 4px", borderRadius: 3, border: "1px solid #1C1F1D" }}>{i + 1}</span>}
              </div>
            );
          })}
        </div>

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
          {/* Left: unclaimed */}
          <div style={{ background: "#111413", border: "1px solid #1C1F1D", borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#8B7E6A" }}>
                Unclaimed Teams <span style={{ color: "#4A4540", fontWeight: 400 }}>{filteredUnassigned.length}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setSortBy("season")} style={{
                  fontSize: 11, padding: "3px 9px", borderRadius: 5,
                  border: `1px solid ${sortBy === "season" ? "#D4A85340" : "#1C1F1D"}`,
                  background: sortBy === "season" ? "#D4A85312" : "transparent",
                  color: sortBy === "season" ? "#D4A853" : "#4A4540",
                  cursor: "pointer", fontFamily: "inherit",
                }}>By Season</button>
                <button onClick={() => setSortBy("name")} style={{
                  fontSize: 11, padding: "3px 9px", borderRadius: 5,
                  border: `1px solid ${sortBy === "name" ? "#D4A85340" : "#1C1F1D"}`,
                  background: sortBy === "name" ? "#D4A85312" : "transparent",
                  color: sortBy === "name" ? "#D4A853" : "#4A4540",
                  cursor: "pointer", fontFamily: "inherit",
                }}>A-Z</button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 14 }}>
              <button className="season-pill" onClick={() => setFilterSeason(null)} style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "none",
                background: !filterSeason ? "#D4A85320" : "#0E100F",
                color: !filterSeason ? "#D4A853" : "#4A4540",
                cursor: "pointer", fontFamily: "inherit",
              }}>All</button>
              {seasons.map((s) => (
                <button key={s} className="season-pill" onClick={() => setFilterSeason(filterSeason === s ? null : s)} style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "none",
                  background: filterSeason === s ? "#D4A85320" : "#0E100F",
                  color: filterSeason === s ? "#D4A853" : "#4A4540",
                  cursor: "pointer", fontFamily: "inherit",
                }}>{s}</button>
              ))}
            </div>

            {!activeOwnerId && (
              <div style={{ textAlign: "center", padding: "36px 16px", color: "#4A4540", fontSize: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4A853", margin: "0 auto 10px", animation: "pulse 2s ease-in-out infinite" }} />
                Select an owner above to start assigning teams
              </div>
            )}

            {activeOwnerId && filteredUnassigned.length === 0 && (
              <div style={{ textAlign: "center", padding: "36px 16px", color: "#6BCB77", fontSize: 12 }}>
                ✓ All teams{filterSeason ? ` from ${filterSeason}` : ""} have been assigned
              </div>
            )}

            {activeOwnerId && filteredUnassigned.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 6 }}>
                {filteredUnassigned.map((team) => (
                  <div
                    key={team.id}
                    className="team-card"
                    onClick={() => assignTeam(team.id)}
                    style={{
                      padding: "9px 12px", borderRadius: 7,
                      border: "1px solid #1C1F1D", background: "#0E100F",
                      cursor: "pointer", opacity: animatingTeam === team.id ? 0 : 1,
                      transform: animatingTeam === team.id ? "scale(0.85)" : "scale(1)",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#E8E0D0", marginBottom: 2 }}>{team.name}</div>
                    <div style={{ fontSize: 10, color: "#4A4540", display: "flex", gap: 6 }}>
                      <span>{team.season}</span>
                      <span>·</span>
                      <span>{team.record}</span>
                      <span>·</span>
                      <span>{team.pf.toLocaleString()} PF</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <div style={{ position: "sticky", top: 20 }}>
            {activeOwner ? (
              <div style={{
                background: "#111413", border: `1px solid ${activeOwner.color}30`,
                borderRadius: 12, padding: 14, marginBottom: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${activeOwner.color}15` }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: `${activeOwner.color}18`, border: `2px solid ${activeOwner.color}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 700, color: activeOwner.color,
                  }}>
                    {activeOwner.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: activeOwner.color }}>{activeOwner.name}'s Teams</div>
                    <div style={{ fontSize: 11, color: "#4A4540" }}>
                      {getTeamsForOwner(activeOwner.id).length} claimed
                    </div>
                  </div>
                </div>
                {getTeamsForOwner(activeOwner.id).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px 10px", color: "#4A4540", fontSize: 11, lineHeight: 1.5 }}>
                    Tap teams on the left to assign to {activeOwner.name}
                  </div>
                ) : (
                  getTeamsForOwner(activeOwner.id).map((t) => (
                    <div
                      key={t.id}
                      className={`sidebar-team ${justAssigned === t.id ? "just-flash" : ""}`}
                      onClick={() => unassignTeam(t.id)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "5px 7px", borderRadius: 5, fontSize: 12, color: "#8B7E6A",
                        cursor: "pointer", marginBottom: 1, transition: "background 0.1s ease",
                      }}
                    >
                      <span>{t.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, color: "#4A4540" }}>{t.season}</span>
                        <span className="rx" style={{ color: "#4A454050", fontSize: 11, transition: "color 0.15s ease" }}>✕</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div style={{
                background: "#111413", border: "1px dashed #1C1F1D",
                borderRadius: 12, padding: 14, marginBottom: 12,
                textAlign: "center", color: "#4A4540", fontSize: 12, lineHeight: 1.6,
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>👆</div>
                Select an owner to see claimed teams
              </div>
            )}

            {/* All owners summary */}
            <div style={{ background: "#111413", border: "1px solid #1C1F1D", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#4A4540", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                All Owners
              </div>
              {owners.map((o) => {
                const ct = getTeamsForOwner(o.id).length;
                return (
                  <div key={o.id} onClick={() => setActiveOwnerId(o.id)} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "5px 0", cursor: "pointer",
                    borderBottom: "1px solid #1C1F1D15",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: o.color }} />
                      <span style={{ fontSize: 12, color: activeOwnerId === o.id ? o.color : "#8B7E6A", fontWeight: activeOwnerId === o.id ? 600 : 400 }}>{o.name}</span>
                      {!o.active && <span style={{ fontSize: 9, color: "#4A4540" }}>former</span>}
                    </div>
                    <span style={{ fontSize: 12, color: "#4A4540", fontWeight: 600 }}>{ct}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ height: 70 }} />
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, #0B0D0C 70%, transparent)",
          padding: "18px 0 14px", zIndex: 10,
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#5A5347" }}>
              <strong style={{ color: "#D4A853" }}>{assignedCount}</strong> assigned · <strong style={{ color: "#4A4540" }}>{unassignedCount}</strong> remaining
            </div>
            {assignedCount > 0 && (
              <button className="save-bottom" onClick={() => setStep("confirm")} style={{
                padding: "10px 26px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg, #D4A853 0%, #B8922E 100%)",
                color: "#0B0D0C", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 4px 20px #D4A85330", transition: "all 0.2s ease",
              }}>
                Review & Save →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
