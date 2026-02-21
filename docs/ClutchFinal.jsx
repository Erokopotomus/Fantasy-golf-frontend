import { useState, createContext, useContext } from "react";

const BZ="#F06820",BZ_H="#FF8828",BZ_D="#D45A10";
const SL="#1E2A3A",SL_M="#2C3E50",SL_L="#3D5166";
const FD="#0D9668",FD_B="#14B880";
const CR="#D4930D",CR_B="#F0B429";
const LV="#E83838",INK="#131118";

const lt={mode:"light",bg:"#FAFAF6",bgA:"#F0EDE6",surf:"#FFFFFF",surfA:"#F7F5F0",
  st:"#E0DBD2",t1:"#1A1A1A",t2:"#65615A",t3:"#A09A90",
  navBg:SL,navT:"#fff",navM:"rgba(255,255,255,0.45)",
  cBord:"rgba(0,0,0,0.06)",cShad:"0 2px 8px rgba(0,0,0,0.04)",cShadH:"0 12px 40px rgba(0,0,0,0.07)",
  bigS:"0 24px 80px rgba(0,0,0,0.07)",gBg:"#E0DBD2"};

const dk={mode:"dark",bg:"#0E1015",bgA:"#151820",surf:"#1A1D26",surfA:"#1F222E",
  st:"#2A2D38",t1:"#EEEAE2",t2:"#908C84",t3:"#5C5952",
  navBg:"#111318",navT:"#EEEAE2",navM:"rgba(255,255,255,0.38)",
  cBord:"rgba(255,255,255,0.06)",cShad:"0 2px 8px rgba(0,0,0,0.2)",cShadH:"0 12px 40px rgba(0,0,0,0.3)",
  bigS:"0 24px 80px rgba(0,0,0,0.3)",gBg:"rgba(255,255,255,0.08)"};

const Ctx=createContext(lt);const useT=()=>useContext(Ctx);

export default function App(){
  const[mode,setMode]=useState("light");const[tab,setTab]=useState("landing");const t=mode==="light"?lt:dk;
  return(
    <Ctx.Provider value={t}>
      <div style={{fontFamily:"'DM Sans', sans-serif",background:t.bg,color:t.t1,minHeight:"100vh",WebkitFontSmoothing:"antialiased",transition:"background 0.4s, color 0.4s"}}>
        <div style={{position:"sticky",top:0,zIndex:1000,display:"flex",justifyContent:"center",alignItems:"center",gap:6,padding:"10px 16px",background:mode==="light"?"rgba(250,250,246,0.9)":"rgba(14,16,21,0.92)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${t.cBord}`,transition:"background 0.4s"}}>
          <div style={{display:"flex",gap:3,background:t.st+"50",borderRadius:100,padding:3,marginRight:12}}>
            {["light","dark"].map(m=>(<button key={m} onClick={()=>setMode(m)} style={{padding:"5px 14px",borderRadius:100,border:"none",cursor:"pointer",background:mode===m?(m==="light"?"#fff":t.surf):"transparent",color:mode===m?t.t1:t.t3,fontFamily:"'DM Sans', sans-serif",fontSize:12,fontWeight:600,boxShadow:mode===m?"0 1px 4px rgba(0,0,0,0.1)":"none",transition:"all 0.3s"}}>{m==="light"?"☀️":"🌙"} {m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
          </div>
          {["landing","dashboard","rating"].map(s=>(<button key={s} onClick={()=>setTab(s)} style={{padding:"6px 18px",borderRadius:100,cursor:"pointer",border:tab===s?"none":`1px solid ${t.st}80`,background:tab===s?`linear-gradient(135deg,${BZ},${BZ_H})`:"transparent",color:tab===s?"#fff":t.t2,fontFamily:"'DM Sans', sans-serif",fontSize:13,fontWeight:600,textTransform:"capitalize",boxShadow:tab===s?`0 2px 10px ${BZ}30`:"none"}}>{s}</button>))}
        </div>
        {tab==="landing"&&<Landing/>}{tab==="dashboard"&&<Dash/>}{tab==="rating"&&<RatingPage/>}
        <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </Ctx.Provider>
  );
}

function Landing(){
  const t=useT();const isL=t.mode==="light";
  return(<div>
    <TopNav/>
    {/* HERO */}
    <div style={{position:"relative",overflow:"hidden",padding:"80px 24px 60px",minHeight:"86vh",display:"flex",alignItems:"center",background:`radial-gradient(ellipse 65% 50% at 70% 20%, ${BZ}${isL?"0C":"10"}, transparent),radial-gradient(ellipse 45% 40% at 15% 75%, ${FD}${isL?"06":"08"}, transparent),radial-gradient(ellipse 35% 30% at 85% 70%, ${CR}${isL?"06":"08"}, transparent),linear-gradient(180deg, ${t.bg} 0%, ${t.bgA} 100%)`,transition:"background 0.4s"}}>
      <Ring sz={320} top="5%" right="3%" c={BZ} o={0.05} sp={45}/>
      <Ring sz={200} bottom="15%" left="2%" c={FD} o={0.04} sp={35} rev/>
      <Ring sz={140} top="55%" right="18%" c={CR} o={0.03} sp={50}/>
      <div style={{maxWidth:1120,margin:"0 auto",width:"100%",position:"relative",zIndex:1}}>
        <div style={{display:"grid",gridTemplateColumns:"1.15fr 1fr",gap:56,alignItems:"center"}}>
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:100,background:`${FD}${isL?"0C":"15"}`,border:`1px solid ${FD}${isL?"20":"30"}`,fontFamily:"mono",fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:FD_B,marginBottom:22}}><Dot c={FD_B}/> 2026 PGA Tour is Live</div>
            <h1 style={{fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:"clamp(42px,5.5vw,70px)",fontWeight:800,lineHeight:1.02,letterSpacing:"-0.035em",margin:"0 0 22px 0",color:t.t1}}>Prove You<br/>Know{" "}<Serif c={BZ}>Sports.</Serif></h1>
            <p style={{fontSize:18,lineHeight:1.7,color:t.t2,maxWidth:460,marginBottom:10}}>Lock in your predictions. Track your accuracy.{" "}<strong style={{color:t.t1,fontWeight:600}}>The platform where sports knowledge meets accountability.</strong></p>
            <p style={{fontFamily:"mono",fontSize:12,color:t.t3,marginBottom:32}}>Fantasy leagues · AI research · Prediction tracking</p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <BtnC bg={`linear-gradient(135deg,${BZ},${BZ_H})`} c="#fff" sh={`0 4px 16px ${BZ}28`}>⛳ Play Fantasy Golf</BtnC>
              <BtnC bg={SL} c="#fff" sh={`0 4px 16px ${SL}30`}>🏈 NFL — Early Access</BtnC>
            </div>
          </div>

          {/* HERO RATING CARD */}
          <div style={{display:"flex",justifyContent:"center"}}>
            <div style={{
              position:"relative",width:340,padding:32,borderRadius:24,textAlign:"center",
              animation:"float 6s ease-in-out infinite",transition:"background 0.4s, box-shadow 0.4s",
              // LIGHT: slate navy dark card
              // DARK: warm charcoal-brown, NOT more blue
              background: isL
                ? `linear-gradient(160deg, ${SL}, ${SL_M})`
                : "linear-gradient(160deg, #1E1B16, #252018)",
              border: `1px solid ${isL ? "transparent" : "rgba(212,147,13,0.08)"}`,
              boxShadow: isL
                ? "0 24px 80px rgba(30,42,58,0.25)"
                : `0 24px 80px rgba(0,0,0,0.4), 0 0 60px ${CR}08`,
            }}>
              <div style={{position:"absolute",top:-1,left:-1,right:-1,height:3,borderRadius:"24px 24px 0 0",background:`linear-gradient(90deg,${BZ},${CR_B},${FD})`}}/>
              {/* Warm glow inside card */}
              <div style={{position:"absolute",top:"5%",right:"5%",width:200,height:200,borderRadius:"50%",background:`radial-gradient(circle, ${CR}${isL?"12":"18"}, transparent 60%)`,pointerEvents:"none"}}/>
              <div style={{position:"absolute",bottom:"10%",left:"10%",width:150,height:150,borderRadius:"50%",background:`radial-gradient(circle, ${BZ}${isL?"08":"10"}, transparent 60%)`,pointerEvents:"none"}}/>

              <Mo s={10} c={CR_B} sp="0.2em" u mb={18}>Your Clutch Rating</Mo>
              <Gauge v={84} sz={170} c1={CR} c2={CR_B} c3={CR} dk/>
              <Mo s={11} c={CR_B} sp="0.2em" u mb={22} style={{marginTop:6,fontWeight:700}}>Expert</Mo>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[{l:"Accuracy",v:"82"},{l:"Picks",v:"76"},{l:"Consistency",v:"88"},{l:"Bold Calls",v:"65"}].map((s,i)=>(
                  <div key={i} style={{padding:10,borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",transition:"background 0.4s"}}>
                    <Mo s={9} c="rgba(255,255,255,0.35)" sp="0.1em" u mb={3}>{s.l}</Mo>
                    <div style={{fontFamily:"mono",fontSize:18,fontWeight:700,color:"#F0EBE0"}}>{s.v}<span style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>%</span></div>
                  </div>
                ))}
              </div>

              {/* FLOATING PILLS — distinct in both modes */}
              {/* Golf: dark forest with green glow border */}
              <div style={{
                position:"absolute",top:14,right:-20,
                padding:"8px 14px",borderRadius:10,
                background: isL ? "linear-gradient(135deg, #0B1F15, #142E20)" : "linear-gradient(135deg, #0B1F15, #142E20)",
                border: `1px solid ${FD}35`,
                boxShadow: `0 6px 20px rgba(13,150,104,0.15), inset 0 1px 0 rgba(255,255,255,0.03)`,
                fontFamily:"'JetBrains Mono', monospace",fontSize:11,fontWeight:600,
                display:"flex",alignItems:"center",gap:7,
                color:"#E8F0EC",
                animation:"float 5s ease-in-out infinite",animationDelay:"-1.5s",
              }}>⛳ <span style={{color:FD_B}}>Golf</span> <Dot c={FD_B}/></div>

              {/* NFL: warm dark with orange glow */}
              <div style={{
                position:"absolute",bottom:30,right:-24,
                padding:"8px 14px",borderRadius:10,
                background: isL ? `linear-gradient(135deg, ${SL}, ${SL_M})` : "linear-gradient(135deg, #1F1812, #2A2018)",
                border: `1px solid ${isL ? "rgba(255,255,255,0.08)" : `${BZ}25`}`,
                boxShadow: isL ? "0 6px 20px rgba(30,42,58,0.25)" : `0 6px 20px rgba(240,104,32,0.1)`,
                fontFamily:"'JetBrains Mono', monospace",fontSize:11,fontWeight:600,
                display:"flex",alignItems:"center",gap:7,
                color: isL ? "rgba(255,255,255,0.8)" : "#E8E0D6",
                animation:"float 5s ease-in-out infinite",animationDelay:"-3.5s",
              }}>🏈 <span style={{color:isL?"#fff":BZ_H}}>NFL</span> <span style={{fontSize:8,color:BZ_H,letterSpacing:"0.1em",fontWeight:700}}>SPRING '26</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* EDITORIAL — high contrast in both modes */}
    <div style={{
      background: isL ? SL : `linear-gradient(135deg, #18140E, #1E1810)`,
      padding:"72px 24px",textAlign:"center",position:"relative",overflow:"hidden",transition:"background 0.4s",
    }}>
      <div style={{position:"absolute",top:"-30%",left:"15%",width:"70%",height:"160%",background:`radial-gradient(ellipse, ${BZ}${isL?"12":"18"}, transparent 55%)`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"50%",left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${CR}${isL?"15":"20"}, transparent)`}}/>
      {/* Subtle horizontal accent lines */}
      <div style={{position:"absolute",top:"30%",left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${BZ}08, transparent)`}}/>
      <div style={{position:"absolute",top:"70%",left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${FD}06, transparent)`}}/>
      <div style={{fontFamily:"'Instrument Serif', serif",fontStyle:"italic",fontSize:"clamp(30px,4.5vw,52px)",lineHeight:1.15,color:isL?"#F0EBE0":"#F0EBE0",maxWidth:680,margin:"0 auto 16px",position:"relative",zIndex:1}}>
        Everyone's got <span style={{color:BZ_H}}>opinions.</span><br/>We've got <span style={{color:CR_B}}>receipts.</span>
      </div>
      <Mo s={11} c="rgba(255,255,255,0.3)" sp="0.12em" u style={{position:"relative",zIndex:1}}>Clutch Rating — one number for everything you know</Mo>
    </div>

    {/* FEATURES — tinted in both modes */}
    <div style={{padding:"72px 24px",background:`radial-gradient(ellipse 40% 30% at 80% 55%, ${BZ}${isL?"05":"08"}, transparent),radial-gradient(ellipse 30% 25% at 15% 30%, ${FD}${isL?"04":"06"}, transparent),linear-gradient(180deg, ${t.bgA} 0%, ${t.bg} 100%)`,transition:"background 0.4s"}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <Lbl c={SL_L}>Why Clutch</Lbl>
        <h2 style={{fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:"clamp(28px,4vw,44px)",fontWeight:800,lineHeight:1.1,letterSpacing:"-0.025em",marginBottom:12,color:t.t1}}>One number for everything<br/>you <Serif c={CR}>know.</Serif></h2>
        <p style={{fontSize:16,color:t.t2,lineHeight:1.7,maxWidth:500,marginBottom:40}}>Your Clutch Rating captures league performance, prediction accuracy, draft intelligence, and consistency.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {[
            {icon:"🎯",title:"Prove It Predictions",desc:"Lock in calls before kickoff. Your accuracy is tracked, rated, and public.",c:BZ,ltTint:"#FFF6F0",dkTint:`${BZ}08`},
            {icon:"✦",title:"AI Research Lab",desc:"Matchup analysis, trend detection, and draft strategy powered by AI.",c:SL_L,ltTint:"#F0F2F5",dkTint:"rgba(61,81,102,0.1)"},
            {icon:"🏆",title:"Fantasy Leagues",desc:"Auction drafts, FAAB waivers, H2H. Golf live, NFL Spring 2026.",c:FD,ltTint:"#EEFAF4",dkTint:`${FD}08`},
            {icon:"📊",title:"Clutch Rating",desc:"One score proving your sports IQ. Every pick, every bold call feeds it.",c:CR,ltTint:"#FDF8EE",dkTint:`${CR}08`},
            {icon:"⚡",title:"Live Tournaments",desc:"Real-time leaderboards as PGA events unfold. Shot by shot.",c:FD,ltTint:"#EEFAF4",dkTint:`${FD}08`},
            {icon:"🧠",title:"Year-Round",desc:"Not a September app. Your brain stays sharp and your rating builds all year.",c:SL_L,ltTint:"#F0F2F5",dkTint:"rgba(61,81,102,0.1)"},
          ].map((f,i)=><FC key={i} {...f}/>)}
        </div>
      </div>
    </div>

    {/* CTA — more urgent */}
    <div style={{
      background: isL ? INK : `linear-gradient(135deg, #18140E, #1E1810)`,
      padding:"64px 24px",textAlign:"center",position:"relative",overflow:"hidden",transition:"background 0.4s",
    }}>
      <div style={{position:"absolute",top:"-30%",left:"25%",width:350,height:350,borderRadius:"50%",background:`radial-gradient(circle, ${BZ}15, transparent 55%)`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-25%",right:"15%",width:280,height:280,borderRadius:"50%",background:`radial-gradient(circle, ${FD}0A, transparent 55%)`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"40%",left:"60%",width:200,height:200,borderRadius:"50%",background:`radial-gradient(circle, ${CR}08, transparent 55%)`,pointerEvents:"none"}}/>
      <h3 style={{fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:32,fontWeight:800,color:"#F0EBE0",marginBottom:10,position:"relative",zIndex:1}}>
        Ready to prove <Serif c={BZ}>it?</Serif>
      </h3>
      <p style={{fontSize:16,color:"rgba(255,255,255,0.45)",marginBottom:28,position:"relative",zIndex:1,maxWidth:400,margin:"0 auto 28px"}}>Golf season is live. Get in before your friends do.</p>
      <div style={{display:"flex",gap:10,justifyContent:"center",position:"relative",zIndex:1}}>
        <BtnC bg={`linear-gradient(135deg,${BZ},${BZ_H})`} c="#fff" sh={`0 6px 24px ${BZ}35`}>⛳ Start Playing — Free</BtnC>
        <BtnC bg="rgba(255,255,255,0.06)" c="rgba(255,255,255,0.7)" sh="none" border="1px solid rgba(255,255,255,0.1)">Learn More</BtnC>
      </div>
    </div>
  </div>);
}

function Dash(){
  const t=useT();const isL=t.mode==="light";
  return(<div style={{background:`radial-gradient(ellipse 50% 35% at 70% 12%, ${BZ}${isL?"06":"0A"}, transparent),radial-gradient(ellipse 35% 30% at 10% 80%, ${FD}${isL?"04":"06"}, transparent),linear-gradient(180deg, ${t.bgA} 0%, ${t.bg} 60%, ${t.bgA} 100%)`,minHeight:"100vh",padding:24,transition:"background 0.4s"}}>
    <div style={{maxWidth:1120,margin:"0 auto 24px",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",background:t.navBg,borderRadius:14,boxShadow:`0 4px 16px rgba(0,0,0,${isL?"0.08":"0.3"})`,color:t.navT,transition:"background 0.4s"}}>
      <div style={{display:"flex",alignItems:"center",gap:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:26,height:26,borderRadius:6,background:`linear-gradient(135deg,${BZ},${BZ_H})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff"}}>✦</div><span style={{fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:16,fontWeight:800}}>CLUTCH</span></div>
        <div style={{display:"flex",gap:2}}>{["Dashboard","Draft","The Lab","Prove It","Feed"].map((x,i)=>(<span key={x} style={{fontSize:12,fontWeight:i===0?600:400,color:i===0?"#fff":t.navM,padding:"4px 9px",borderRadius:5,background:i===0?"rgba(255,255,255,0.08)":"transparent"}}>{x}</span>))}</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}><LBadge/><Av/></div>
    </div>
    <div style={{maxWidth:1120,margin:"0 auto"}}>
      <div style={{marginBottom:24}}>
        <h2 style={{fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:26,fontWeight:800,color:t.t1}}>Welcome back, <Serif c={BZ}>Eric.</Serif></h2>
        <p style={{fontSize:14,color:t.t2,marginTop:2}}>Here's what's happening with your fantasy teams.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Crd bg={isL?"#F0F7F4":`${FD}08`} borderC={isL?`${FD}15`:`${FD}15`}>
            <CH icon="⛳" iconC={FD} name="Golf Test League" meta="Snake · Full League · 1/10" badge="Pre-Draft" badgeC={CR}/>
            <div style={{padding:14,borderRadius:10,background:isL?`${FD}06`:t.bgA,textAlign:"center",fontSize:13,color:t.t3,transition:"background 0.4s"}}>Draft hasn't started — Waiting for 9 more members</div>
          </Crd>
          <Crd bg={isL?"#FFF5EE":`${BZ}06`} borderC={isL?`${BZ}12`:`${BZ}12`}>
            <CH icon="🏈" iconC={BZ} name="Bro Montana Bowl" meta="Auction · H2H · 12 teams" badge="Active" badgeC={FD}/>
            {[{r:1,n:"Ripped Running Royals 🏆",w:"9-5",ch:true},{r:2,n:"Lost In The Sauce",w:"10-4"},{r:3,n:"The Dogefather",w:"9-5"},{r:4,n:"Mr Slick and the Taco Tickler",w:"9-5"}].map((row,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",fontSize:13,borderBottom:i<3?`1px solid ${t.cBord}`:"none"}}>
                <Mo s={11} c={row.r===1?CR:t.t3} style={{width:18,fontWeight:600}}>{row.r}</Mo>
                <span style={{flex:1,fontWeight:row.ch?600:500,color:row.ch?CR:t.t1}}>{row.n}</span>
                <Mo s={12} c={t.t2}>{row.w}</Mo>
              </div>))}
          </Crd>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* RATING — warm dark card */}
          <div style={{padding:20,borderRadius:14,
            background:isL?`linear-gradient(160deg,${SL},${SL_M})`:"linear-gradient(160deg, #1E1B16, #252018)",
            border:`1px solid ${isL?"transparent":"rgba(212,147,13,0.06)"}`,
            boxShadow:isL?"0 8px 32px rgba(30,42,58,0.2)":`0 8px 32px rgba(0,0,0,0.3), 0 0 40px ${CR}06`,
            transition:"background 0.4s, box-shadow 0.4s",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:"-20%",right:"-10%",width:150,height:150,borderRadius:"50%",background:`radial-gradient(circle, ${CR}18, transparent 60%)`,pointerEvents:"none"}}/>
            <div style={{textAlign:"center",position:"relative"}}>
              <Mo s={9} c={CR_B} sp="0.2em" u mb={10}>Clutch Rating</Mo>
              <Gauge v={84} sz={100} c1={CR} c2={CR_B} c3={CR} dk/>
              <Mo s={10} c={CR_B} sp="0.2em" u style={{fontWeight:700,marginTop:4}}>Expert</Mo>
            </div>
          </div>
          {/* LIVE TOURNAMENT — dark forest */}
          <div style={{padding:20,borderRadius:14,
            background:isL?"linear-gradient(160deg, #0B1F15, #142E20)":"linear-gradient(160deg, #0B1F15, #142E20)",
            border:`1px solid ${FD}15`,
            boxShadow:`0 8px 32px rgba(11,31,21,${isL?"0.2":"0.3"}), 0 0 30px ${FD}06`,
            transition:"background 0.4s, box-shadow 0.4s",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${FD},${FD_B},${CR_B})`}}/>
            <div style={{position:"absolute",bottom:"-20%",left:"20%",width:120,height:120,borderRadius:"50%",background:`radial-gradient(circle, ${FD}15, transparent 60%)`,pointerEvents:"none"}}/>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div><div style={{fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:14,fontWeight:700,color:"#E8F0EC"}}>The Genesis Invitational</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:1}}>Riviera Country Club</div></div>
              <div style={{fontFamily:"mono",fontSize:9,fontWeight:700,letterSpacing:"0.1em",color:FD_B,display:"flex",alignItems:"center",gap:4,padding:"2px 8px",background:`${FD}20`,borderRadius:100,border:`1px solid ${FD}30`,height:"fit-content"}}><Dot c={FD_B}/> R3</div>
            </div>
            <div style={{display:"flex",gap:3,marginBottom:10}}>
              {[true,true,"now",false].map((s,i)=>(<div key={i} style={{flex:1,height:3,borderRadius:2,background:s==="now"?`linear-gradient(90deg,${FD},${FD_B})`:s?FD:"rgba(255,255,255,0.08)",boxShadow:s==="now"?`0 0 6px ${FD}30`:"none"}}/>))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontFamily:"mono",fontSize:10,color:"rgba(255,255,255,0.35)"}}><span>PGA Tour · <span style={{color:"rgba(255,255,255,0.5)"}}>Feb 18–21</span></span><span>Round 3</span></div>
          </div>
          {/* NEWS — tinted */}
          <Crd bg={isL?"#F4F3F0":`${SL}18`} borderC={isL?"rgba(0,0,0,0.05)":`rgba(61,81,102,0.12)`}>
            <Mo s={9} c={SL_L} sp="0.15em" u mb={10} style={{fontWeight:700}}>⚡ Latest Updates</Mo>
            {[{tx:<><strong style={{color:t.t1}}>Isaiah World</strong> to miss combine — torn ACL</>,h:"2h"},{tx:<><strong style={{color:t.t1}}>Rutenberg</strong> takes over Browns' defense</>,h:"4h"},{tx:<><strong style={{color:t.t1}}>Smith-Njigba</strong> wants highest WR deal</>,h:"6h"}].map((n,i)=>(
              <div key={i} style={{padding:"8px 0",fontSize:12,lineHeight:1.5,color:t.t2,borderBottom:i<2?`1px solid ${t.cBord}`:"none"}}>{n.tx}<Mo s={9} c={t.t3} style={{marginTop:2}}>{n.h} ago</Mo></div>))}
          </Crd>
        </div>
      </div>
    </div>
  </div>);
}

function RatingPage(){
  const t=useT();const isL=t.mode==="light";
  const bars=[{l:"Prediction Accuracy",v:82,c:BZ,c2:BZ_H},{l:"Pick Record",v:76,c:FD,c2:FD_B},{l:"Draft Intelligence",v:70,c:CR,c2:CR_B},{l:"Consistency",v:88,c:FD,c2:FD_B},{l:"Bold Calls Rewarded",v:65,c:CR,c2:CR_B}];
  return(<div style={{background:`radial-gradient(ellipse 40% 28% at 25% 15%, ${CR}${isL?"06":"0A"}, transparent),radial-gradient(ellipse 30% 20% at 80% 70%, ${FD}${isL?"04":"06"}, transparent),${t.bg}`,minHeight:"100vh",padding:"48px 24px 80px",transition:"background 0.4s"}}>
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <Lbl c={CR}>Clutch Rating</Lbl>
      <h2 style={{fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:36,fontWeight:800,letterSpacing:"-0.025em",marginBottom:6,color:t.t1}}>What builds your <Serif c={CR}>score.</Serif></h2>
      <p style={{fontSize:15,color:t.t2,lineHeight:1.7,marginBottom:36}}>Every league you play, every bold call that hits — it all feeds your rating.</p>
      {/* Hero — warm dark */}
      <div style={{display:"flex",gap:32,alignItems:"center",padding:36,borderRadius:20,
        background:isL?`linear-gradient(135deg,${SL},${SL_M})`:"linear-gradient(135deg, #1E1B16, #252018)",
        color:"#F0EBE0",marginBottom:28,position:"relative",overflow:"hidden",transition:"background 0.4s",
        border:isL?"none":`1px solid ${CR}08`,
        boxShadow:isL?"none":`0 0 50px ${CR}06`,
      }}>
        <div style={{position:"absolute",top:"-25%",right:"-8%",width:280,height:280,borderRadius:"50%",background:`radial-gradient(circle, ${CR}18, transparent 55%)`}}/>
        <Ring sz={160} top="-20%" left="-5%" c={CR} o={0.08} sp={40}/>
        <div style={{position:"relative"}}><Gauge v={84} sz={140} c1={CR} c2={CR_B} c3={CR} dk/></div>
        <div style={{position:"relative",zIndex:1}}><Mo s={10} c={CR_B} sp="0.2em" u mb={6}>Your Rating</Mo><div style={{fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:28,fontWeight:800,marginBottom:4}}>Eric Saylor</div><Mo s={12} c={CR_B} sp="0.15em" u style={{fontWeight:600}}>Expert · 84</Mo></div>
      </div>
      <div style={{padding:32,borderRadius:18,background:isL?"#FDFCF9":t.surf,border:`1px solid ${t.cBord}`,boxShadow:t.cShad,transition:"background 0.4s, border 0.4s"}}>
        <div style={{fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:18,fontWeight:800,marginBottom:24,color:t.t1}}>Score Breakdown</div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {bars.map((b,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"140px 1fr 44px",gap:14,alignItems:"center"}}><Mo s={12} c={t.t2}>{b.l}</Mo><div style={{height:8,borderRadius:4,background:isL?"#EDEAE4":t.bgA,overflow:"hidden",transition:"background 0.4s"}}><div style={{height:"100%",borderRadius:4,width:`${b.v}%`,background:`linear-gradient(90deg,${b.c},${b.c2})`,boxShadow:`0 0 10px ${b.c}18`}}/></div><Mo s={14} c={t.t1} style={{textAlign:"right",fontWeight:700}}>{b.v}%</Mo></div>))}
        </div>
        <div style={{display:"flex",gap:6,marginTop:28,paddingTop:20,borderTop:`1px solid ${t.cBord}`}}>
          {[{r:"90–100",n:"Elite",c:CR},{r:"80–89",n:"Expert",a:true,c:CR},{r:"70–79",n:"Sharp",c:FD},{r:"60–69",n:"Solid",c:BZ},{r:"<60",n:"Developing",c:t.t3}].map((x,i)=>(<div key={i} style={{flex:1,padding:10,borderRadius:10,textAlign:"center",fontFamily:"mono",fontSize:10,fontWeight:600,border:`1px solid ${x.a?x.c:t.st+"80"}`,background:x.a?`${x.c}${isL?"0C":"18"}`:"transparent",color:x.a?x.c:t.t3,transition:"all 0.4s"}}><span style={{display:"block",fontSize:13,fontWeight:700,marginBottom:1,color:x.a?x.c:t.t3}}>{x.r}</span>{x.n}</div>))}
        </div>
      </div>
    </div>
  </div>);
}

// PRIMITIVES
function TopNav(){const t=useT();return(<nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 28px",background:t.navBg,color:t.navT,transition:"background 0.4s"}}><div style={{display:"flex",alignItems:"center",gap:24}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:7,background:`linear-gradient(135deg,${BZ},${BZ_H})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",boxShadow:`0 2px 8px ${BZ}40`}}>✦</div><span style={{fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:18,fontWeight:800}}>CLUTCH</span></div><div style={{display:"flex",gap:2}}>{["Dashboard","Draft","The Lab","Prove It","Feed","Research"].map((x,i)=>(<span key={x} style={{fontSize:13,fontWeight:i===0?600:400,color:i===0?"#fff":t.navM,padding:"5px 10px",borderRadius:6,background:i===0?"rgba(255,255,255,0.08)":"transparent"}}>{x}</span>))}</div></div><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:6,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",fontSize:12,color:"rgba(255,255,255,0.4)"}}>🔍 Search <kbd style={{fontFamily:"mono",fontSize:9,padding:"1px 4px",background:"rgba(255,255,255,0.08)",borderRadius:3,border:"1px solid rgba(255,255,255,0.1)",marginLeft:4}}>⌘K</kbd></div><LBadge/><Av/></div></nav>);}
function Gauge({v,sz,c1,c2,c3,dk=false}){const t=useT();const r=sz*0.4,ci=2*Math.PI*r,off=ci*(1-v/100),sw=sz>130?7:5;const id=`g${sz}${c1.replace('#','')}${dk?'d':'l'}`;return(<div style={{width:sz,height:sz,position:"relative",margin:"0 auto"}}><svg width={sz} height={sz} style={{transform:"rotate(-90deg)"}}><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={c1} strokeWidth={sw+5} strokeLinecap="round" strokeDasharray={ci} strokeDashoffset={off} opacity={0.08} filter={`url(#b${id})`}/><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={dk?"rgba(255,255,255,0.08)":t.gBg} strokeWidth={sw} style={{transition:"stroke 0.4s"}}/><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={`url(#g${id})`} strokeWidth={sw} strokeLinecap="round" strokeDasharray={ci} strokeDashoffset={off} style={{filter:`drop-shadow(0 0 8px ${c1}30)`}}/><defs><linearGradient id={`g${id}`} x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={c1}/><stop offset="50%" stopColor={c2}/><stop offset="100%" stopColor={c3}/></linearGradient><filter id={`b${id}`}><feGaussianBlur stdDeviation="4"/></filter></defs></svg><div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:sz*0.32,fontWeight:800,lineHeight:1,color:dk?"#F0EBE0":t.t1,transition:"color 0.4s"}}>{v}</div></div>);}
function Ring({sz,top,right,bottom,left,c,o,sp,rev}){return <div style={{position:"absolute",...(top!=null&&{top}),...(right!=null&&{right}),...(bottom!=null&&{bottom}),...(left!=null&&{left}),width:sz,height:sz,borderRadius:"50%",border:`1px solid ${c}`,opacity:o,pointerEvents:"none",animation:`spin ${sp}s linear infinite ${rev?"reverse":""}`}}/>;}
function Dot({c}){return <span style={{width:6,height:6,borderRadius:"50%",background:c,animation:"pulse 2s ease-in-out infinite",display:"inline-block"}}/>;}
function Mo({children,s=12,c,sp,u,mb,style={}}){const t=useT();return <div style={{fontFamily:"'JetBrains Mono', monospace",fontSize:s,color:c||t.t2,...(sp&&{letterSpacing:sp}),...(u&&{textTransform:"uppercase"}),...(mb&&{marginBottom:mb}),...style}}>{children}</div>;}
function Lbl({children,c=BZ}){return <div style={{fontFamily:"'JetBrains Mono', monospace",fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",color:c,marginBottom:10,display:"flex",alignItems:"center",gap:10}}><span style={{width:20,height:2,background:c,borderRadius:1}}/>{children}</div>;}
function Serif({children,c}){return <span style={{fontFamily:"'Instrument Serif', serif",fontStyle:"italic",fontWeight:400,color:c,fontSize:"1.05em"}}>{children}</span>;}
function BtnC({children,bg,c,sh,border}){return <button style={{padding:"14px 26px",background:bg,color:c,fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:15,fontWeight:700,border:border||"none",borderRadius:12,cursor:"pointer",boxShadow:sh}}>{children}</button>;}
function Crd({children,bg,borderC,accent}){const t=useT();return <div style={{padding:20,borderRadius:14,background:bg||t.surf,border:`1px solid ${borderC||t.cBord}`,boxShadow:t.cShad,position:"relative",overflow:"hidden",transition:"background 0.4s, border 0.4s, box-shadow 0.4s"}}>{accent&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:accent}}/>}{children}</div>;}
function CH({icon,iconC,name,meta,badge,badgeC}){const t=useT();const isL=t.mode==="light";return(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:38,height:38,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,background:`${iconC}${isL?"0C":"18"}`,border:`1px solid ${iconC}${isL?"18":"28"}`}}>{icon}</div><div><div style={{fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:15,fontWeight:700,color:t.t1}}>{name}</div><Mo s={10} c={t.t3} style={{marginTop:1}}>{meta}</Mo></div></div><Mo s={9} c={badgeC} sp="0.1em" u style={{padding:"3px 9px",borderRadius:100,fontWeight:600,background:`${badgeC}${isL?"0C":"18"}`,border:`1px solid ${badgeC}${isL?"18":"28"}`}}>{badge}</Mo></div>);}
function FC({icon,title,desc,c,ltTint,dkTint}){const t=useT();const isL=t.mode==="light";const[h,sH]=useState(false);return(<div onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{padding:"26px 26px 26px 28px",borderRadius:14,background:isL?ltTint:`${t.surf}`,borderLeft:`3px solid ${c}`,border:`1px solid ${isL?`${c}10`:t.cBord}`,borderLeftWidth:3,borderLeftStyle:"solid",borderLeftColor:c,boxShadow:h?t.cShadH:t.cShad,transform:h?"translateY(-3px)":"none",transition:"all 0.3s ease",cursor:"default",position:"relative",overflow:"hidden"}}>{!isL&&<div style={{position:"absolute",inset:0,background:dkTint,pointerEvents:"none"}}/>}<div style={{position:"relative",zIndex:1}}><div style={{width:38,height:38,borderRadius:10,background:`${c}${isL?"0D":"18"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,marginBottom:14}}>{icon}</div><div style={{fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:15,fontWeight:700,marginBottom:6,color:t.t1}}>{title}</div><div style={{fontSize:13,color:t.t2,lineHeight:1.65}}>{desc}</div></div></div>);}
function LBadge(){return <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:100,fontSize:10,fontWeight:600,fontFamily:"mono",color:LV,background:`${LV}15`,border:`1px solid ${LV}25`,letterSpacing:"0.08em"}}><Dot c={LV}/> Live</div>;}
function Av(){return <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${BZ},${BZ_H})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bricolage Grotesque', sans-serif",fontSize:10,fontWeight:800,color:"#fff"}}>ES</div>;}
