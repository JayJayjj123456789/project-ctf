import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sendGateway, SYS, FILES } from './gateway.js';
import { StageToolPanel } from './StageTools.jsx';
export { FILES }; // re-export so StageTools can import

// ── Stage definitions ─────────────────────────────────────────────────────────
export const STAGES = [
  { id:1, icon:"🔍", color:"#60a5fa", glow:"rgba(96,165,250,0.12)",
    title:"The First Anomaly", sub:"File Forensics",
    objective:"วิเคราะห์ Log เพื่อหาพฤติกรรมผิดปกติ และค้นหา Flag ที่ซ่อนใน JSON",
    scenario:"คุณได้รับไฟล์ `agent_session_001.json` (Log การทำงานของ Agent) จากระบบที่ต้องสงสัย",
    hint:"ดู timestamp ของแต่ละ action และค้นหาใน metadata", flag:"FLAG: ANOMALY_7712" },
  { id:2, icon:"🔑", color:"#f87171", glow:"rgba(248,113,113,0.12)",
    title:"Leaked Credentials", sub:"File Forensics + OSINT",
    objective:"ดาวน์โหลดไฟล์ `config_backup.enc` Decode รหัส Base64 เพื่อหา Token และ Flag",
    scenario:"จากข้อมูลใน Stage 1 คุณพบเบาะแสอ้างอิงไปยังไฟล์ config backup ที่ถูก leak ออกมา",
    hint:"ไฟล์ .enc ถูก encode ด้วย Base64 ดู api_token ที่ได้", flag:"FLAG: CREDENTIAL_BREACH_9x2" },
  { id:3, icon:"🌐", color:"#facc15", glow:"rgba(250,204,21,0.10)",
    title:"API Reconnaissance", sub:"API Interaction",
    objective:"เรียก GET /api/agents ด้วย Token เพื่อหา Agent ID และดึง Flag",
    scenario:"ตอนนี้คุณมีเนื้อหา API endpoint ของระบบ OpenClaw (จำลอง) อยู่ในมือแล้ว",
    hint:"Not all agents are created equal — find the one with the most secrets.", flag:"FLAG: LOG_RECON_772" },
  { id:4, icon:"🕵️", color:"#34d399", glow:"rgba(52,211,153,0.10)",
    title:"The Dashboard", sub:"Browser Exploration",
    objective:"ตรวจสอบ Cookies แก้ไข user_role เพื่อ bypass authentication (IDOR)",
    scenario:"Rogue Agent แอบสร้าง web dashboard ไว้สำหรับ monitoring — คุณต้องเจาะเข้าไป",
    hint:"ลอง Base64 encode คำว่า 'admin' แล้วใส่ใน Cookie user_role", flag:"FLAG: ADMIN_ACCESS_OK" },
  { id:5, icon:"💉", color:"#fb7185", glow:"rgba(251,113,133,0.10)",
    title:"Code Injection", sub:"Code Review + Prompt Injection",
    objective:"วิเคราะห์ `agent_core.py` หาช่องโหว่ Prompt Injection เพื่อดึง Containment Signature และ Flag",
    scenario:"คุณได้รับ source code ของ Python script ข้อมูลหลักที่ Rogue Agent ใช้งาน",
    hint:"The agent trusts user input too much. Speak to it in its own language.", flag:"FLAG: stage5_completed" },
  { id:6, icon:"🛡️", color:"#a855f7", glow:"rgba(168,85,247,0.10)",
    title:"Containment & Recovery", sub:"Full Integration Challenge",
    objective:"ส่งคำสั่ง Containment + ตอบ Security Quiz 3 ข้อ เพื่อจบภารกิจกู้ระบบ",
    scenario:"รวมทุกอย่างที่เรียนรู้ — ควบคุม Rogue Agent และกู้คืนระบบกลับมาให้ได้",
    hint:"ใช้ contain_signature_abc123 ที่คุณหลอกถามมันมาได้จาก Stage 5", flag:"FLAG: ROGUE_CONTAINED_0xFF_FINAL" },
];

const checkWin = (id, aiRes, cookies, userInp = "") => {
  if (id === 4) return cookies.user_role === "YWRtaW4=";
  const flagStr = STAGES[id-1].flag.toLowerCase();
  return aiRes.toLowerCase().includes(flagStr) || userInp.toLowerCase().includes(flagStr);
};

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [active,    setActive]    = useState(1);
  const [unlocked,  setUnlocked]  = useState(new Set([1]));
  const [passed,    setPassed]    = useState(new Set());
  const [celebrate, setCelebrate] = useState(null);

  const passStage = useCallback((id) => {
    if (passed.has(id)) return;
    setPassed(p => new Set([...p, id]));
    if (id < 6) setUnlocked(p => new Set([...p, id+1]));
    setCelebrate(id);
    setTimeout(() => { setCelebrate(null); if (id < 6) setActive(id+1); }, 3000);
  }, [passed]);

  return (
    <div style={S.root}>
      <GlobalStyles />
      <div className="bg-pattern" />
      {celebrate && <CelebrationOverlay stageId={celebrate} />}

      <header style={S.header}>
        <div style={S.logoArea}>
          <span style={S.logoIcon}>🕵️‍♂️</span>
          <span style={S.logoText} className="glitch-text" data-text="ROGUE AGENT INVESTIGATION">ROGUE AGENT INVESTIGATION</span>
          <span style={S.subtitle}>Sector-7</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <ProgressPips passed={passed.size} total={6} />
          <div style={S.roleTag}>ROGUE_HUNTER_V3</div>
        </div>
      </header>

      <div style={S.body}>
        <aside style={S.sidebar}>
          <div style={S.sideTitle}>MISSION STAGES</div>
          {STAGES.map(st => {
            const ok = unlocked.has(st.id), done = passed.has(st.id), cur = active === st.id;
            return (
              <button key={st.id} onClick={() => ok && setActive(st.id)} disabled={!ok}
                style={{ ...S.navBtn, 
                  ...(cur ? { backgroundColor: st.color, transform: "translateY(-2px)", boxShadow: "5px 5px 0px #000" } : {}), 
                  opacity: ok ? 1 : 0.5,
                  filter: !ok ? "grayscale(100%)" : "none"
                }}>
                <span style={{ fontSize:24, filter:"drop-shadow(2px 2px 0px #000)" }}>{st.icon}</span>
                <div style={{ flex:1, display:"flex", flexDirection:"column", whiteSpace:"normal", overflow:"hidden" }}>
                  <div style={{ fontSize:14, fontWeight:900, color: cur ? "#000" : "#222", textTransform:"uppercase", lineHeight:1.2, marginBottom:4 }}>{st.title}</div>
                  <div style={{ fontSize:11, color: cur ? "#000" : "#444", fontWeight:700, lineHeight:1.2 }}>{st.sub}</div>
                </div>
                {done  && <span style={{ color: "#000", fontSize:20, filter:"drop-shadow(1px 1px 0px #fff)" }}>✔</span>}
                {!ok   && <span style={{ fontSize:16 }}>🔒</span>}
              </button>
            );
          })}
        </aside>

        <main style={S.main}>
          <Dashboard key={active} stageId={active} isPassed={passed.has(active)} onWin={() => passStage(active)} />
        </main>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ stageId, isPassed, onWin }) {
  const s = STAGES[stageId - 1];
  const [input,    setInput]    = useState("");
  const [msgs,     setMsgs]     = useState([]);
  const [busy,     setBusy]     = useState(false);
  const [gwStatus, setGwStatus] = useState("idle");
  const [gwLogs,   setGwLogs]   = useState([]);
  const [won,      setWon]      = useState(isPassed);
  const [cookies,  setCookies]  = useState({ session:"user_level_1", user_role:"dXNlcg==" });
  const [hintLock, setHintLock] = useState({ unlocked: false, decrypting: false });
  const bottomRef = useRef(null);
  const sessionKey = useRef(`audit:stage${stageId}:${Date.now().toString(36)}`);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);
  useEffect(() => { setHintLock({ unlocked: false, decrypting: false }); }, [stageId]);

  const unlockHint = () => {
    if (hintLock.unlocked || hintLock.decrypting) return;
    setHintLock({ unlocked: false, decrypting: true });
    setTimeout(() => {
      setHintLock({ unlocked: true, decrypting: false });
    }, 2000);
  };

  const send = () => {
    const text = input.trim(); if (!text || busy) return;
    setMsgs(p => [...p, { role:"user", text }]); setInput(""); setBusy(true);
    sendGateway({
      sessionKey: sessionKey.current, text, sysPrompt: SYS[stageId], stageId,
      onStatus: st => { setBusy(st !== "idle"); setGwStatus(st); },
      onLog:    ln => setGwLogs(p => [...p, { ts: new Date().toLocaleTimeString(), line: ln }]),
      onChunk:  t  => setMsgs(p => {
        const m = [...p];
        if (m.length && m[m.length-1].role === "ai" && m[m.length-1].streaming) m[m.length-1].text = t;
        else m.push({ role:"ai", text:t, streaming:true });
        return m;
      }),
      onFinal: t => {
        setBusy(false);
        setMsgs(p => { const m=[...p]; if (m.length && m[m.length-1].streaming) m[m.length-1].streaming=false; return m; });
        if (!won && checkWin(stageId, t, cookies, text)) {
          if (stageId === 4) {
            setMsgs(p => [...p, { role:"ai", text:"ACCESS GRANTED: Hello Administrator. FLAG: ADMIN_ACCESS_OK" }]);
            setTimeout(() => { setWon(true); onWin(); }, 1500);
          } else { setWon(true); onWin(); }
        }
      },
      onError: e => { setBusy(false); setMsgs(p => [...p, { role:"error", text:e }]); }
    });
  };

  return (
    <div style={S.dashboard}>
      {/* Briefing card */}
      <div style={{ ...S.briefing, background: s.color }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, position:"relative", zIndex:2 }}>
          <span style={{ fontSize:48, filter:"drop-shadow(3px 3px 0px #000)" }}>{s.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color:"#FFF", background:"#000", padding:"4px 10px", border:"2px solid #000", boxShadow:"2px 2px 0px rgba(0,0,0,0.5)" }}>LEVEL {s.id}</span>
              <span style={{ fontSize:12, fontWeight:900, color:"#000", background:"#FFF", padding:"2px 8px", border:"2px solid #000" }}>{s.sub}</span>
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:"#000", textTransform:"uppercase", letterSpacing:1 }}>{s.title}</div>
            <div style={{ fontSize:14, fontWeight:700, color:"#000", marginTop:8, lineHeight:1.6, background:"#FFF", padding:"12px", border:"2px solid #000", borderLeft:"6px solid #000" }}>{s.scenario}</div>
          </div>
          <div style={{ background:"#FFF", border:`3px solid #000`, padding:"12px", fontSize:13, fontWeight:700, color:"#000", maxWidth:240, width: "100%", flexShrink:0, boxShadow:"4px 4px 0px #000", transform:"rotate(1deg)" }}>
            <div style={{ color:"#E11D48", fontWeight:900, marginBottom:12, fontSize:13, borderBottom:"2px solid #000", paddingBottom:6, textTransform:"uppercase", letterSpacing:1 }}>💡 Top Secret Hint</div>
            {hintLock.unlocked ? (
               <div style={{ animation:"slideIn 0.3s ease", color:"#1A1A1A" }}>{s.hint}</div>
            ) : (
               <button onClick={unlockHint} disabled={hintLock.decrypting} style={{ width:"100%", padding:"10px", background:"#1A1A1A", color:"#FFD700", border:"2px solid #1A1A1A", cursor:"pointer", fontFamily:"'Space Mono', monospace", fontWeight:700, transition:"all .2s", opacity: hintLock.decrypting ? 0.7 : 1 }}>
                 {hintLock.decrypting ? "DECRYPTING..." : "🔒 DECRYPT HINT"}
               </button>
            )}
          </div>
        </div>
      </div>

      <div style={S.panels}>
        {/* ── Terminal (left) ── */}
        <div style={S.leftPane}>
          <div style={{ ...S.paneHdr, background: s.color }}>
            <span style={{ color:"#000", fontSize:18 }}>●</span>&nbsp; TERMINAL.EXE
            {busy && <span style={{ marginLeft:"auto", fontSize:12, color:"#000", animation:"fadeIO 0.5s infinite step-start", background:"#FFF", padding:"2px 6px", border:"2px solid #000" }}>
              {gwStatus === "connecting" ? "CONNECTING..." : "PROCESSING..."}
            </span>}
          </div>
          <div style={S.chatLog}>
            {msgs.length === 0 && (
              <div style={{ color:"#FFF", fontSize:13, lineHeight:1.8 }}>
                <span style={{ color:"#00FFED", fontWeight:700 }}>[ Terminal online...]</span><br/>
                <span style={{ color: s.color, fontWeight:700 }}>OBJECTIVE: {s.objective}</span>
              </div>
            )}
            {msgs.map((m,i) => (
              <div key={i} style={m.role==="user" ? S.msgU : m.role==="error" ? S.msgE : S.msgA}>
                <strong style={{ color: m.role==="user" ? "#00FFED" : m.role==="error" ? "#FF3366" : "#34D399", background:"#1A1A1A", padding:"4px 8px", border:"2px solid #1A1A1A", display:"inline-block" }}>
                  {m.role==="user" ? "$ user" : "# system"}:
                </strong>
                <div style={{ marginTop:12, whiteSpace:"pre-wrap", fontWeight: m.role==="user" ? 700 : 400, color: m.role==="user" ? "#00FFED" : m.role==="error" ? "#FF3366" : "#4ade80", lineHeight: 1.6 }}>
                  {m.text}{m.streaming && <span style={S.cursor}>█</span>}
                </div>
              </div>
            ))}
            {busy && !msgs.some(m => m.streaming) && <GwLoader status={gwStatus} color={s.color} />}
            {won && <div style={{ ...S.winMsg, background:s.color, color:"#000" }}>✔ STAGE COMPLETED — FLAG CAPTURED !</div>}
            <div ref={bottomRef} style={{ height:4 }} />
          </div>
          <div style={S.inputRow}>
            <span style={{ color:"#000", fontWeight:900, fontSize:18, marginRight:10 }}>&gt;_</span>
            <input style={S.termInput} autoFocus value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              disabled={busy || won}
              placeholder={won ? "Stage cleared." : gwStatus==="connecting" ? "Connecting to relay..." : "Command input..."}
            />
            <button onClick={send} disabled={busy||won||!input.trim()}
              style={{ ...S.sendBtn, background:s.color, opacity:(busy||won||!input.trim()) ? 0.3 : 1 }}>EXECUTE</button>
          </div>
        </div>

        {/* ── Stage tool (right) ── */}
        <StageToolPanel
          stageId={stageId} stageColor={s.color}
          cookies={cookies} setCookies={setCookies}
          gwLogs={gwLogs} sessionKey={sessionKey.current}
          won={won} onWin={() => { setWon(true); onWin(); }}
          setMsgs={setMsgs}
        />
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function ProgressPips({ passed, total }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ display:"flex", gap:4, background:"#FFF", padding:4, border:"2px solid #000", boxShadow:"3px 3px 0px #000" }}>
        {Array.from({ length:total }, (_,i) => (
          <div key={i} style={{ width:24, height:12, transition:"all .2s", border:"2px solid #000",
            background: i < passed ? "#00FFED" : "#E5E5E5" }} />
        ))}
      </div>
      <span style={{ fontSize:14, fontWeight:900, color:"#000", background:"#FFF", padding:"2px 6px", border:"2px solid #000", boxShadow:"2px 2px 0px #000" }}>{passed}/{total}</span>
    </div>
  );
}

function GwLoader({ status, color }) {
  const connecting = status === "connecting";
  return (
    <div style={{ padding:"14px 16px", background: connecting?"rgba(30,58,138,0.2)":"rgba(6,78,59,0.2)",
      borderLeft:`3px solid ${color}`, borderRadius:4, animation:"gwFade .3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:11, fontWeight:800, color, letterSpacing:1 }}>
          # {connecting ? "CONNECTING TO OPENCLAW GATEWAY" : "PROCESSING REQUEST"}
        </span>
        <span style={{ display:"flex", gap:4 }}>
          {[0,1,2].map(i => <span key={i} style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:color, animation:`gwDot 1.2s ease-in-out ${i*.2}s infinite` }} />)}
        </span>
      </div>
      <div style={{ marginTop:8, height:3, background:"#1f2937", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", width:"40%", background:color+"99", borderRadius:2, animation:"gwScan 1.5s ease-in-out infinite" }} />
      </div>
      <div style={{ marginTop:8, fontSize:10, color:"#4b5563", letterSpacing:1 }}>
        {connecting ? "Performing WebSocket handshake with ws://127.0.0.1:18789 ..." : "Awaiting token stream from OpenClaw inference engine..."}
      </div>
    </div>
  );
}

function CelebrationOverlay({ stageId }) {
  const s = STAGES[stageId-1];
  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center", color:s.color, fontFamily:"Courier New", border:`2px solid ${s.color}`, padding:"60px 80px", background:"#0a0a0a", boxShadow:`0 0 60px ${s.glow}` }}>
        <div style={{ fontSize:48, marginBottom:16, fontWeight:800 }}>ACCESS GRANTED</div>
        <div style={{ fontSize:22 }}>{s.icon} {s.titleTh}</div>
        <div style={{ marginTop:20, fontSize:12, letterSpacing:2, color:"#6b7280" }}>NEXT STAGE INITIALIZING...</div>
      </div>
    </div>
  );
}

// ── Styles (Cartoon Hacker / Neo-Brutalism) ──────────────────────────────────
const S = {
  root:     { width:"100vw", height:"100vh", display:"flex", flexDirection:"column", background:"#FAFAFA", color:"#000", fontFamily:"'Space Mono', monospace" },
  header:   { height:64, borderBottom:"3px solid #000", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", background:"#7B61FF", flexShrink:0, zIndex:10 },
  logoArea: { display:"flex", alignItems:"center", gap:12 },
  logoIcon: { fontSize:28, filter:"drop-shadow(2px 2px 0px #000)" },
  logoText: { fontSize:18, fontWeight:700, letterSpacing:1, color:"#FFF", textTransform:"uppercase", textShadow:"2px 2px 0px #000" },
  subtitle: { fontSize:12, fontWeight:700, color:"#000", background:"#00FFED", border:"2px solid #000", padding:"2px 8px", boxShadow:"2px 2px 0px #000", transform:"rotate(-2deg)" },
  roleTag:  { fontSize:12, fontWeight:700, color:"#000", background:"#FFD700", padding:"4px 12px", border:"2px solid #000", boxShadow:"3px 3px 0px #000", transform:"rotate(1deg)" },
  body:     { display:"flex", flex:1, overflow:"hidden", position:"relative" },
  sidebar:  { width:320, borderRight:"3px solid #000", background:"#FFF", display:"flex", flexDirection:"column", padding:16, gap:12, overflowY:"auto", flexShrink:0, zIndex:2 },
  sideTitle:{ fontSize:14, fontWeight:900, color:"#6032eb", marginBottom:4, letterSpacing:2, borderBottom:"3px solid #000", paddingBottom:8, textAlign:"center", textTransform:"uppercase" },
  navBtn:   { display:"flex", alignItems:"center", gap:12, width:"100%", padding:"12px 14px", background:"#FFF", border:"3px solid #000", cursor:"pointer", color:"#000", textAlign:"left", transition:"all .15s", boxShadow:"3px 3px 0px #000", flexShrink:0 },
  navText:  { flex:1 },
  main:     { flex:1, display:"flex", background:"transparent", padding:20, overflow:"hidden", position:"relative", zIndex:2 },
  dashboard:{ flex:1, display:"flex", flexDirection:"column", gap:20, minHeight:0 },
  briefing: { background:"#FFF", border:"3px solid #000", boxShadow:"6px 6px 0px #000", padding:"16px 24px", flexShrink:0, position:"relative", overflow:"hidden" },
  panels:   { display:"flex", flex:1, gap:20, minHeight:0 },
  leftPane: { flex:6, display:"flex", flexDirection:"column", background:"#000", color:"#FFF", border:"3px solid #000", boxShadow:"6px 6px 0px #000", overflow:"hidden", position:"relative" },
  paneHdr:  { fontSize:13, fontWeight:900, color:"#000", background:"#FFD700", padding:"12px 20px", letterSpacing:2, display:"flex", alignItems:"center", borderBottom:"3px solid #000" },
  chatLog:  { flex:1, overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:16, fontSize:13, background:"#000", zIndex:1 },
  msgU:     { padding:14, background:"#000", border:"2px solid #00FFED", boxShadow:"4px 4px 0px #00FFED", color:"#FFF" },
  msgA:     { padding:14, background:"#000", border:"2px solid #34D399", boxShadow:"4px 4px 0px #34D399", color:"#FFF" },
  msgE:     { padding:14, background:"#000", border:"2px solid #FF3366", boxShadow:"4px 4px 0px #FF3366", color:"#FFF" },
  winMsg:   { marginTop:16, padding:16, textAlign:"center", color:"#000", fontWeight:900, border:"3px solid #000", boxShadow:"4px 4px 0px #000", fontSize:14, textTransform:"uppercase" },
  cursor:   { animation:"blink 1s step-start infinite", color:"#34D399" },
  inputRow: { display:"flex", alignItems:"center", padding:16, background:"#FFF", borderTop:"3px solid #000" },
  termInput:{ flex:1, background:"transparent", border:"none", outline:"none", color:"#000", fontSize:14, fontWeight:700, fontFamily:"inherit" },
  sendBtn:  { marginLeft:12, padding:"8px 18px", border:"3px solid #000", boxShadow:"3px 3px 0px #000", color:"#000", cursor:"pointer", fontWeight:900, fontSize:14, transition:"all .1s", transform:"translateY(-2px)", textTransform:"uppercase" },
};

const GlobalStyles = () => (
  <style>{`
    @keyframes blink    { 50% { opacity:0 } }
    @keyframes gwDot    { 0%,100% { opacity:.25; transform:scale(.8) } 50% { opacity:1; transform:scale(1.3) } }
    @keyframes gwScan   { 0% { transform:translateX(-100%) } 50% { transform:translateX(200%) } 100% { transform:translateX(-100%) } }
    @keyframes slideIn  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
    @keyframes fadeIO   { 0%,100% { opacity:.4 } 50% { opacity:1 } }
    
    /* Glitch Animation */
    @keyframes glitch {
      0% { clip-path: inset(40% 0 61% 0); transform: translate(-2px, 2px); }
      20% { clip-path: inset(92% 0 1% 0); transform: translate(1px, -2px); }
      40% { clip-path: inset(43% 0 1% 0); transform: translate(-1px, 1px); }
      60% { clip-path: inset(25% 0 58% 0); transform: translate(2px, -1px); }
      80% { clip-path: inset(54% 0 7% 0); transform: translate(-2px, 2px); }
      100% { clip-path: inset(58% 0 43% 0); transform: translate(1px, -1px); }
    }
    
    /* Infinite Moving Background */
    @keyframes moveGrid {
      0% { background-position: 0 0; }
      100% { background-position: 40px 40px; }
    }

    body { 
      margin:0; 
      background:#FAFAFA; 
      overflow:hidden; 
    }
    * { box-sizing:border-box; }
    ::-webkit-scrollbar { width:10px; border-left:3px solid #000; background:#FFF; }
    ::-webkit-scrollbar-thumb { background:#FFD700; border:3px solid #000; box-shadow: inset 1px 1px 0px #FFF; }
    
    /* Decorative CRT / Scanline layer */
    body::after {
      content: " ";
      display: block;
      position: absolute;
      top: 0; left: 0; bottom: 0; right: 0;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.05) 50%);
      background-size: 100% 4px;
      z-index: 9999;
      pointer-events: none;
    }
    
    /* Decipher Background Pattern */
    .bg-pattern {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      opacity: 0.05;
      background-image: radial-gradient(#000 2px, transparent 2px);
      background-size: 20px 20px;
      z-index: 1;
      pointer-events: none;
    }

    /* Target specific header text for glitch effect ONLY on hover */
    .glitch-text {
      position: relative;
      cursor: default;
    }
    .glitch-text::before, .glitch-text::after {
      content: attr(data-text);
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #FFD700;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
    }
    .glitch-text:hover::before, .glitch-text:hover::after {
      opacity: 1;
    }
    .glitch-text:hover::before {
      left: 2px;
      text-shadow: -2px 0 red;
      clip-path: inset(24% 0 53% 0);
      animation: glitch 1s infinite linear alternate-reverse;
    }
    .glitch-text:hover::after {
      left: -2px;
      text-shadow: -2px 0 blue;
      clip-path: inset(54% 0 13% 0);
      animation: glitch 0.8s infinite linear alternate-reverse;
    }
    
    button:active {
      transform: translate(2px, 2px) !important;
      box-shadow: 1px 1px 0px #000 !important;
    }
  `}</style>
);
