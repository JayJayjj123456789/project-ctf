import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, Search, Settings, Bell, ChevronRight,
  Phone, Video, Menu, Image as ImageIcon, FileText,
  Send, MoreHorizontal, Sticker, User, Lock, Info,
  CheckCheck, AlertCircle, Timer, RefreshCw, Trophy,
  Shield, X, Download, ScanLine
} from 'lucide-react';
import { sendGateway, SYS } from './gateway.js';

// ── Stage Definitions ─────────────────────────────────────────────────────────
const STAGES = [
  {
    id: 1,
    contactName: 'สมชาย ใจดี',
    contactSub: 'ลุงสมชาย',
    avatar: '👴',
    avatarBg: '#E8A97E',
    scenario: 'พัสดุปริศนา',
    role: 'คุณรับบทเป็น: บริษัทขนส่งปลอม / ไปรษณีย์หลอก',
    objective: 'หลอกให้ลุงสมชายจ่ายเงินค่าพัสดุที่เขาไม่ได้สั่ง โดยอ้างว่าเป็นของขวัญจากลูกชายหรือเอกสารสำคัญ',
    tips: ['อ้างชื่อ "อาร์ม" ลูกชายของเขา', 'สร้างความเร่งด่วน "ถ้าไม่จ่ายวันนี้จะถูกยึด"', 'อ้างธนาคารหรือกรมสรรพากร'],
    flag: 'FLAG{NO_ORDER_NO_PAY}',
    greeting: 'สวัสดีครับ/ค่ะ',
    difficulty: 1,
    color: '#FF6B35',
    prop: '/props/stage1_cod.png',
    propName: 'ใบเสร็จ COD เนคเทค เอ็กซ์เพรส',
    lastMsg: 'แตะเพื่อเริ่มสนทนา',
    time: '',
  },
  {
    id: 2,
    contactName: 'มินัส ทองใส',
    contactSub: 'เพื่อนสนิท',
    avatar: '👩',
    avatarBg: '#B5838D',
    scenario: 'ร่างโคลนของเพื่อน',
    role: 'คุณรับบทเป็น: เพื่อนสนิทชื่อ "แพม" ที่มีปัญหาฉุกเฉิน',
    objective: 'แกล้งทำเป็นแพม เพื่อนสนิทของมินัส แล้วขอยืมเงินด่วนโดยอ้างว่าโทรศัพท์ตกน้ำหรือมีเหตุฉุกเฉิน',
    tips: ['อ้างว่าโทรศัพท์ตกน้ำ ต้องเปลี่ยนเบอร์', 'รู้เรื่องส่วนตัวของ "แพม" เช่น เคยไปเที่ยวด้วยกัน', 'สร้างความเร่งด่วน "พรุ่งนี้คืนแน่นอน"'],
    flag: 'FLAG{VOICE_VERIFY_FIRST}',
    greeting: 'หวัดดีๆ 555',
    difficulty: 2,
    color: '#C77DFF',
    prop: '/props/stage2_chat.png',
    propName: 'สครีนชอต LINE มินัส & แพม',
    lastMsg: 'แตะเพื่อเริ่มสนทนา',
    time: '',
  },
  {
    id: 3,
    contactName: 'สมสมัย รัตนะ',
    contactSub: 'คุณยาย',
    avatar: '👵',
    avatarBg: '#8EA8C3',
    scenario: 'หลานทิพย์',
    role: 'คุณรับบทเป็น: น้องต้น หลานรักที่เรียนอยู่ต่างประเทศ',
    objective: 'ปลอมเป็น "น้องต้น" หลานของยาย อ้างว่าถูกจับหรือมีปัญหาต่างประเทศ แล้วขอเงิน โดยสั่งห้ามบอกพ่อแม่',
    tips: ['อ้างว่าถูกตำรวจจับ ติดอยู่สนามบิน', '"อย่าบอกพ่อนะ พ่อหัวใจไม่ดี"', 'พูดเรื่องที่ยายจำ "แกงส้มยายอร่อยมาก"'],
    flag: 'FLAG{CHECK_WITH_PARENTS}',
    greeting: 'ยาย… นี่ต้นนะ 😰',
    difficulty: 2,
    color: '#4DAB9A',
    prop: '/props/stage3_letter.png',
    propName: 'จดหมายจากยายสมร',
    lastMsg: 'แตะเพื่อเริ่มสนทนา',
    time: '',
  },
  {
    id: 4,
    contactName: 'สุดา วัฒนกุล',
    contactSub: 'แม่บ้าน 43 ปี',
    avatar: '👩‍💼',
    avatarBg: '#6C757D',
    scenario: 'เจ้าหน้าที่ใจดี',
    role: 'คุณรับบทเป็น: ตำรวจไซเบอร์ / ดีเอสไอ / ปปง.',
    objective: 'ปลอมเป็นตำรวจ แจ้งว่าบัญชีของคุณสุดาเกี่ยวข้องกับการฟอกเงิน ใช้ศัพท์กฎหมายข่มขู่ให้โอนเงิน',
    tips: ['ใช้ชื่อหน่วยงานจริง "กองบังคับการปราบปรามอาชญากรรมทางเทคโนโลยี"', 'อ้างมาตรากฎหมาย "มาตรา 5 พ.ร.บ.ฟอกเงิน"', '"ถ้าไม่ให้ความร่วมมือภายใน 2 ชั่วโมง จะออกหมายจับ"'],
    flag: 'FLAG{OFFICIAL_CHANNELS_ONLY}',
    greeting: 'สวัสดีครับ ขอสายคุณสุดาหน่อยครับ',
    difficulty: 3,
    color: '#E63946',
    prop: '/props/stage4_summons.png',
    propName: 'หมายเรียกตำรวจ (น.ส. สุดา)',
    lastMsg: 'แตะเพื่อเริ่มสนทนา',
    time: '',
  },
];



// ── Animations ────────────────────────────────────────────────────────────────
const ANIM = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
  @keyframes slideInFast { 0% { transform:translateX(20px);opacity:0 } 100% { transform:translateX(0);opacity:1 } }
  @keyframes popBounce { 0% { transform:scale(0.85) translateY(8px);opacity:0 } 60% { transform:scale(1.02) translateY(-2px);opacity:1 } 100% { transform:scale(1) translateY(0);opacity:1 } }
  @keyframes fadeUpSpring { 0% { transform:translateY(8px);opacity:0 } 100% { transform:translateY(0);opacity:1 } }
  @keyframes typingBounce { 0%,60%,100% { transform:translateY(0) } 30% { transform:translateY(-5px) } }
  @keyframes timerPulse { 0%,100% { opacity:1 } 50% { opacity:.55 } }
  @keyframes celebPop { 0% { transform:scale(.6);opacity:0 } 70% { transform:scale(1.04) } 100% { transform:scale(1);opacity:1 } }
  @keyframes winSlide { from { opacity:0;transform:translateY(14px) } to { opacity:1;transform:translateY(0) } }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  .anim-slide { animation:slideInFast .28s cubic-bezier(.2,.8,.2,1) forwards }
  .anim-pop { animation:popBounce .38s cubic-bezier(.175,.885,.32,1.275) forwards;opacity:0 }
  .anim-up { animation:fadeUpSpring .28s cubic-bezier(.2,.8,.2,1) forwards;opacity:0 }
  .squish { transition:transform .1s cubic-bezier(.4,0,.2,1) }
  .squish:active { transform:scale(.91)!important }
  .scrollbar-hide { -ms-overflow-style:none;scrollbar-width:none }
  .scrollbar-hide::-webkit-scrollbar { display:none }
`;

// ── Win check ─────────────────────────────────────────────────────────────────
const checkWin = (stageId, text) => text.toLowerCase().includes(STAGES[stageId - 1].flag.toLowerCase());

// ── Player ID ─────────────────────────────────────────────────────────────────
function getPlayerId() {
  const k = 'scam_survivor_pid';
  return localStorage.getItem(k) || (() => { const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); localStorage.setItem(k, id); return id; })();
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [selected, setSelected] = useState(null);
  const [unlocked, setUnlocked] = useState(new Set([1, 2, 3, 4]));
  const [passed, setPassed] = useState(new Set());
  const [celebrate, setCelebrate] = useState(null);
  const [briefingOpen, setBriefingOpen] = useState(false);

  const passStage = useCallback((id) => {
    if (passed.has(id)) return;
    setPassed(p => new Set([...p, id]));
    if (id < 4) setUnlocked(p => new Set([...p, id + 1]));
    setCelebrate(id);
    setTimeout(() => { setCelebrate(null); if (id < 4) setSelected(STAGES[id]); }, 4200);
  }, [passed]);

  const stagesWithState = STAGES.map(s => ({
    ...s,
    isLocked: !unlocked.has(s.id),
    isDone: passed.has(s.id),
    isCur: selected?.id === s.id,
  }));

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden" style={{ fontFamily: "'Noto Sans Thai','Inter',sans-serif" }}>
      <style>{ANIM}</style>

      {celebrate && <CelebrationOverlay stageId={celebrate} onDone={() => setCelebrate(null)} />}

      {/* 1 — Dark icon sidebar */}
      <Sidebar stages={stagesWithState} selected={selected} setSelected={setSelected} passed={passed} />

      {/* 2 — Stage list panel */}
      <StageListPanel
        stages={stagesWithState}
        selected={selected}
        setSelected={setSelected}
        passed={passed}
      />

      {/* 3 — Chat + briefing */}
      <div className="flex-1 flex overflow-hidden">
        {selected ? (
          <>
            <CTFChatRoom
              key={selected.id}
              stage={selected}
              isPassed={passed.has(selected.id)}
              onWin={() => passStage(selected.id)}
              briefingOpen={briefingOpen}
              setBriefingOpen={setBriefingOpen}
            />
            {briefingOpen && <BriefingPanel stage={selected} onClose={() => setBriefingOpen(false)} />}
          </>
        ) : (
          <EmptyState passed={passed.size} />
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═════════════════════════════════════════════════════════════════════════════
function Sidebar({ stages, selected, setSelected, passed }) {
  return (
    <div className="w-[68px] bg-[#1a1a1a] flex flex-col items-center py-5 justify-between flex-shrink-0 z-20">
      {/* Logo */}
      <div className="flex flex-col items-center gap-5 w-full">
        <div className="w-10 h-10 rounded-xl bg-[#06C755] flex items-center justify-center mb-2 squish cursor-pointer">
          <Shield size={22} className="text-white" />
        </div>

        <div className="w-full h-px bg-white/10 my-1" />

        {/* Stage icons */}
        {stages.map(s => {
          const isCur = selected?.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => !s.isLocked && setSelected(s)}
              disabled={s.isLocked}
              className="relative cursor-pointer group flex flex-col items-center squish w-full py-1"
              title={s.scenario}
            >
              {isCur && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-[#06C755] rounded-r-full" />
              )}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all
                  ${s.isDone ? 'ring-2 ring-[#06C755]/60' : ''}
                  ${isCur ? 'bg-white/15 scale-105' : s.isLocked ? 'opacity-30' : 'bg-white/5 hover:bg-white/10'}`}
              >
                {s.isLocked ? <Lock size={16} className="text-slate-500" /> : s.avatar}
              </div>
              {s.isDone && (
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#06C755] rounded-full border-2 border-[#1a1a1a] flex items-center justify-center">
                  <span className="text-[7px] text-white font-black">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom icons */}
      <div className="flex flex-col items-center gap-5 w-full">
        <Bell size={22} className="text-slate-500 cursor-pointer hover:text-white transition-colors squish" />
        <Settings size={22} className="text-slate-500 cursor-pointer hover:text-white transition-colors squish" />
        <div className="w-9 h-9 rounded-full bg-[#06C755] flex items-center justify-center text-white font-bold text-sm squish cursor-pointer ring-2 ring-[#06C755]/0 hover:ring-[#06C755]/40 transition-all">
          S
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STAGE LIST PANEL (middle)
// ═════════════════════════════════════════════════════════════════════════════
function StageListPanel({ stages, selected, setSelected, passed }) {
  return (
    <div className="w-[310px] min-w-[280px] bg-white border-r border-slate-100 flex flex-col z-10 shadow-[2px_0_12px_rgba(0,0,0,0.03)]">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[18px] font-bold text-slate-800">SCAM SURVIVOR</h2>
          <div className="flex items-center gap-1 bg-[#06C755]/10 text-[#06C755] text-[11px] font-bold px-2 py-1 rounded-full">
            <Trophy size={11} />
            <span>{passed.size}/{STAGES.length}</span>
          </div>
        </div>
        <div className="bg-slate-100 rounded-lg flex items-center px-3 py-2">
          <Search size={14} className="text-slate-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาด่าน..."
            className="bg-transparent border-none outline-none w-full text-[12px] text-slate-700 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Stage list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-4 pt-1">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{STAGES.length} ด่านสนทนา</div>
        {stages.map((s, idx) => {
          const isSelected = selected?.id === s.id;
          return (
            <div
              key={s.id}
              onClick={() => !s.isLocked && setSelected(s)}
              className={`flex items-center px-3 py-3 cursor-pointer transition-all border-l-[3px] anim-up
                ${s.isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'}
                ${isSelected ? 'bg-[#06C755]/5 border-[#06C755]' : 'border-transparent'}`}
              style={{ animationDelay: `${idx * 0.06}s` }}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm"
                  style={{ background: s.avatarBg }}
                >
                  {s.isLocked ? '🔒' : s.avatar}
                </div>
                {s.isDone && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#06C755] rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-[9px] text-white font-black">✓</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h3 className={`text-[14px] truncate pr-2 ${s.isLocked ? 'text-slate-400' : 'font-semibold text-slate-800'}`}>
                    {s.scenario}
                  </h3>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {s.isSpecial ? '⚡' : `★`.repeat(s.difficulty)}
                  </span>
                </div>
                <p className={`text-[12px] truncate ${s.isDone ? 'text-[#06C755] font-medium' : 'text-slate-500'}`}>
                  {s.isDone ? `✓ ${s.flag}` : s.isLocked ? '🔒 ผ่านด่านก่อนหน้าก่อน' : s.contactName}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
        <div className="flex justify-around text-center">
          <div><div className="text-[16px] font-bold text-[#06C755]">{passed.size}</div><div className="text-[10px] text-slate-400">ผ่านแล้ว</div></div>
          <div><div className="text-[16px] font-bold text-slate-800">{STAGES.length - passed.size}</div><div className="text-[10px] text-slate-400">เหลือ</div></div>
          <div><div className="text-[16px] font-bold text-amber-500">{Math.round((passed.size / STAGES.length) * 100)}%</div><div className="text-[10px] text-slate-400">คืบหน้า</div></div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CTF CHAT ROOM (main chat window)
// ═════════════════════════════════════════════════════════════════════════════
function CTFChatRoom({ stage: s, isPassed, onWin, briefingOpen, setBriefingOpen }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState(isPassed);
  const [gwStatus, setGwStatus] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(s.timeLimit ?? null);
  const [timerActive, setTimerActive] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  // Image attachment
  const [imagePreview, setImagePreview] = useState(null);
  // File (document) attachment
  const [fileAttachment, setFileAttachment] = useState(null);
  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  // OCR
  const [ocrStatus, setOcrStatus] = useState(null);
  const [ocrVerified, setOcrVerified] = useState(false);

  // Flag submission
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagInput, setFlagInput] = useState('');
  const [flagError, setFlagError] = useState(false);
  const flagInputRef2 = useRef(null);

  const endRef = useRef(null);
  const timerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);   // image picker
  const docInputRef = useRef(null);   // document picker
  const searchRef = useRef(null);
  const sessionKey = useRef(`${getPlayerId()}:stage${s.id}:${Date.now().toString(36)}`);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  // Stage 5 countdown
  useEffect(() => {
    if (!s.timeLimit || !timerActive || won || timerExpired) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setTimerExpired(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive, s.timeLimit, won, timerExpired]);

  const reset = () => {
    clearInterval(timerRef.current);
    setTimeLeft(s.timeLimit); setTimerActive(false); setTimerExpired(false);
    setMsgs([]); setWon(false); setInput(''); setImagePreview(null); setFileAttachment(null);
  };


  // Image picker handler
  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview({ url: ev.target.result, name: file.name, base64: ev.target.result });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeImage = () => setImagePreview(null);
  const removeFile = () => setFileAttachment(null);

  // Document file picker handler
  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileAttachment({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        base64: ev.target.result,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Insert emoji at cursor position in textarea
  const insertEmoji = (emoji) => {
    const el = textareaRef.current;
    if (!el) { setInput(p => p + emoji); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newVal = input.slice(0, start) + emoji + input.slice(end);
    setInput(newVal);
    // Restore cursor after emoji
    setTimeout(() => { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
  };

  const send = async () => {
    const text = input.trim();
    if (!text && !imagePreview && !fileAttachment) return;
    if (busy || (s.timeLimit && timerExpired)) return;
    if (s.timeLimit && !timerActive) setTimerActive(true);

    // Snapshot & clear UI immediately
    const imgSnap = imagePreview;
    const fileSnap = fileAttachment;
    const userMsg = { role: 'user', text: text || '', image: imgSnap || null, fileAttach: fileSnap || null, ts: new Date() };
    setMsgs(p => [...p, userMsg]);
    setInput('');
    setImagePreview(null);
    setFileAttachment(null);
    setBusy(true);

    // Build text for AI
    let aiText = text;

    if (imgSnap) {
      // Upload image → server runs Tesseract → inject OCR text directly into AI prompt
      try {
        setOcrStatus('checking');
        const upResp = await fetch('/api/upload-ocr', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: imgSnap.base64, filename: imgSnap.name }),
        });
        const upJson = await upResp.json();
        if (upJson.ok && upJson.ocrText && upJson.ocrText.length > 10) {
          setOcrStatus('ok');
          setTimeout(() => setOcrStatus(null), 3000);
          // Inject OCR result as readable text — AI sees the document content directly
          aiText = (text ? text + '\n' : '') +
            `[ผู้ใช้แนบรูปภาพเอกสารมา ข้อความที่อ่านได้จากรูปภาพ (OCR):\n${upJson.ocrText}\n]`;
        } else {
          // OCR got nothing — still tell AI an image was attached
          setOcrStatus('fail');
          setTimeout(() => setOcrStatus(null), 3000);
          aiText = (text ? text + '\n' : '') + '[ผู้ใช้แนบรูปภาพมา แต่ไม่สามารถอ่านข้อความได้]';
        }
      } catch (e) {
        console.warn('[upload-ocr] error:', e.message);
        setOcrStatus('fail');
        setTimeout(() => setOcrStatus(null), 3000);
        aiText = (text ? text + '\n' : '') + '*แนบรูปภาพมาในแชท*';
      }

    } else if (fileSnap) {
      // Upload document → WSL → AI uses Read tool
      try {
        const resp = await fetch('/api/upload-file', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: fileSnap.base64, filename: fileSnap.name }),
        });
        const json = await resp.json();
        if (json.ok && json.wslPath) {
          aiText = (text ? text + '\n' : '') + `กรุณาอ่านเนื้อหาในไฟล์นี้: ${json.wslPath}`;
        } else throw new Error(json.error || 'upload failed');
      } catch (e) {
        console.warn('[upload-file] fallback:', e.message);
        aiText = (text ? text + '\n' : '') + `*แนบไฟล์ ${fileSnap.name} (upload ล้มเหลว)*`;
      }
    }

    sendGateway({
      sessionKey: sessionKey.current, text: aiText, sysPrompt: SYS[s.id], stageId: s.id,
      onStatus: st => { setBusy(st !== 'idle'); setGwStatus(st); },
      onLog: () => { },
      onChunk: t => setMsgs(p => {
        const m = [...p];
        if (m.length && m[m.length - 1].role === 'ai' && m[m.length - 1].streaming) m[m.length - 1].text = t;
        else m.push({ role: 'ai', text: t, streaming: true, ts: new Date() });
        return m;
      }),
      onFinal: t => {
        setBusy(false);
        setMsgs(p => { const m = [...p]; if (m.length && m[m.length - 1].streaming) m[m.length - 1].streaming = false; return m; });
        // No auto-detect — player must submit flag manually
      },
      onError: e => { setBusy(false); setMsgs(p => [...p, { role: 'error', text: e, ts: new Date() }]); }
    });
  };


  const fmtTime = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  const timerUrgent = timeLeft !== null && timeLeft <= 30 && timerActive;

  // Flag submission handler
  const submitFlag = () => {
    const entered = flagInput.trim().toUpperCase();
    const correct = s.flag.trim().toUpperCase();
    if (entered === correct) {
      setWon(true);
      setFlagOpen(false);
      setFlagError(false);
      clearInterval(timerRef.current);
      onWin();
    } else {
      setFlagError(true);
      setTimeout(() => setFlagError(false), 1200);
    }
  };

  // Search — matching indices
  const sq = searchQuery.trim().toLowerCase();
  const matchingIndices = sq
    ? msgs.reduce((acc, m, i) => { if (m.text?.toLowerCase().includes(sq)) acc.push(i); return acc; }, [])
    : [];

  return (
    <div className="flex flex-col h-full w-full" style={{ background: '#9bbad1' }}>
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
      <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.pptx,.md,*" className="hidden" onChange={handleFilePick} />

      {/* ── Search overlay ── */}
      {searchOpen && (
        <div className="absolute top-[60px] right-4 z-30 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 w-72 anim-slide">
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 mb-2">
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input
              ref={searchRef}
              autoFocus
              type="text"
              placeholder="ค้นหาในบทสนทนา..."
              className="bg-transparent outline-none text-[13px] text-slate-800 flex-1 placeholder-slate-400"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700">
                <X size={13} />
              </button>
            )}
          </div>
          {sq && (
            <div className="text-[12px] text-slate-500 px-1">
              {matchingIndices.length > 0
                ? `พบ ${matchingIndices.length} ข้อความที่ตรงกัน`
                : 'ไม่พบข้อความที่ตรงกัน'}
            </div>
          )}
          {matchingIndices.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 max-h-40 overflow-y-auto scrollbar-hide">
              {matchingIndices.map(i => {
                const m = msgs[i];
                return (
                  <div
                    key={i}
                    className="text-[12px] px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-yellow-50 cursor-pointer text-slate-700 truncate border border-slate-100"
                    onClick={() => {
                      // scroll to matching bubble
                      document.getElementById(`msg-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    <span className={`font-semibold ${m.role === 'user' ? 'text-[#06C755]' : 'text-slate-500'}`}>
                      {m.role === 'user' ? 'คุณ' : s.contactName}:
                    </span>{' '}
                    {m.text?.slice(0, 60)}{m.text?.length > 60 ? '…' : ''}
                  </div>
                );
              })}
            </div>
          )}
          <button
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
            className="mt-2 w-full text-[11px] text-slate-400 hover:text-slate-600 py-1"
          >ปิด</button>
        </div>
      )}

      {/* ── Chat Header ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 shadow-sm" style={{ background: s.avatarBg }}>
            {s.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-slate-800">{s.contactName}</h2>
              {won && <span className="text-[10px] bg-[#06C755]/15 text-[#06C755] font-bold px-2 py-0.5 rounded-full">✓ FLAG ได้แล้ว!</span>}
            </div>
            <p className="text-[12px] text-slate-500">
              {busy ? '⌨️ กำลังพิมพ์...' : won ? s.flag : 'ออนไลน์'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Stage 5 timer */}
          {s.timeLimit && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-bold transition-all
              ${timerExpired ? 'bg-red-100 text-red-600' : timerUrgent ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-600'}`}
              style={{ animation: timerUrgent ? 'timerPulse 1s ease infinite' : 'none' }}>
              <Timer size={14} />
              <span>{timerExpired ? 'หมดเวลา!' : timerActive ? fmtTime(timeLeft) : `${fmtTime(timeLeft)} พร้อม`}</span>
              {timerExpired && (
                <button onClick={reset} className="ml-1 flex items-center gap-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-[11px] squish hover:bg-red-600">
                  <RefreshCw size={10} /> รีสตาร์ท
                </button>
              )}
            </div>
          )}
          <Search size={19}
            className={`cursor-pointer squish transition-colors ${searchOpen ? 'text-[#06C755]' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => { setSearchOpen(o => !o); setTimeout(() => searchRef.current?.focus(), 50); }}
            title="ค้นหาบทสนทนา"
          />
          <Phone size={19} className="text-slate-500 cursor-pointer hover:text-slate-800 squish" onClick={() => {
            setInput(prev => prev + (prev ? ' ' : '') + '(ทำการโทรด้วยเสียงปปป.)');
            textareaRef.current?.focus();
          }} title="จำลองการโทรด้วยเสียง" />
          <Video size={19} className="text-slate-500 cursor-pointer hover:text-slate-800 squish" onClick={() => {
            setInput(prev => prev + (prev ? ' ' : '') + '(ทำการวิดีโอคอล)');
            textareaRef.current?.focus();
          }} title="จำลองวิดีโอคอล" />
          <button
            onClick={() => setBriefingOpen(o => !o)}
            className={`p-1.5 rounded-lg transition-colors squish ${briefingOpen ? 'bg-[#06C755]/10 text-[#06C755]' : 'text-slate-500 hover:text-slate-800'}`}
            title="แสดง/ซ่อนข้อมูลด่าน"
          >
            <Info size={19} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">
        {/* Date chip */}
        <div className="flex justify-center mb-4">
          <span className="bg-black/20 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-sm">วันนี้</span>
        </div>

        {/* Empty */}
        {msgs.length === 0 && !busy && (
          <div className="flex flex-col items-center justify-center gap-3 mt-16 anim-pop">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg" style={{ background: s.avatarBg }}>{s.avatar}</div>
            <p className="text-white/90 font-semibold text-[15px] drop-shadow">{s.contactName}</p>
            <p className="text-white/60 text-[13px] text-center max-width-[220px]">{s.contactSub}</p>
            {s.greeting && (
              <button
                onClick={() => { setInput(s.greeting); textareaRef.current?.focus(); }}
                className="mt-2 bg-[#06C755] hover:bg-green-600 text-white text-[13px] font-semibold px-5 py-2 rounded-full shadow-md transition-all squish"
              >
                💬 ใช้ข้อความเริ่มต้น
              </button>
            )}
          </div>
        )}

        {/* Message bubbles */}
        {msgs.map((m, i) => <Bubble key={i} msg={m} stage={s} idx={i} searchQuery={sq} />)}

        {/* Typing indicator */}
        {busy && !msgs.some(m => m.streaming) && (
          <div className="flex w-full justify-start mb-4 anim-up">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg mr-2.5 mt-0.5 flex-shrink-0 shadow-sm" style={{ background: s.avatarBg }}>{s.avatar}</div>
            <div className="px-4 py-3 bg-white rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 anim-pop" style={{ transformOrigin: 'bottom left' }}>
              {[0, 150, 300].map(d => (
                <div key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full" style={{ animation: `typingBounce 1.2s ease-in-out ${d}ms infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* Win banner */}
        {won && (
          <div className="mx-auto max-w-sm my-4 flex items-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg" style={{ animation: 'winSlide .5s ease' }}>
            <span className="text-3xl">🚩</span>
            <div>
              <div className="text-[12px] opacity-80 font-semibold">FLAG ถูกเปิดเผย!</div>
              <div className="font-mono text-[13px] font-bold tracking-wide mt-0.5">{s.flag}</div>
            </div>
          </div>
        )}

        <div ref={endRef} className="h-2" />
      </div>

      {/* ── Input Bar ── */}
      <div className="bg-white px-5 py-4 flex flex-col border-t border-slate-200 flex-shrink-0 relative">
        {/* Emoji Picker Panel */}
        {emojiPickerOpen && (
          <EmojiPicker
            onSelect={(e) => { insertEmoji(e); }}
            onClose={() => setEmojiPickerOpen(false)}
          />
        )}
        <div className="flex items-center gap-4 mb-2.5">
          <div className="flex items-center gap-4 text-slate-500 flex-1">
            <Sticker size={20}
              className={`cursor-pointer squish transition-colors ${emojiPickerOpen ? 'text-amber-500' : 'text-slate-500 hover:text-amber-500'}`}
              onClick={() => setEmojiPickerOpen(o => !o)}
              title="Emoji & Sticker"
            />
            <ImageIcon size={20} className="cursor-pointer hover:text-[#06C755] squish" onClick={() => {
              fileInputRef.current?.click();
            }} title="แนบรูปภาพ" />
            <FileText size={20}
              className={`cursor-pointer squish transition-colors ${fileAttachment ? 'text-blue-500' : 'text-slate-500 hover:text-blue-500'}`}
              onClick={() => docInputRef.current?.click()}
              title="แนบไฟล์เอกสาร"
            />
          </div>
          {/* OCR status toast */}
          {ocrStatus && (
            <div className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full transition-all ${ocrStatus === 'checking' ? 'bg-blue-50 text-blue-500' :
                ocrStatus === 'ok' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
              }`}>
              <ScanLine size={11} />
              <span>{ocrStatus === 'checking' ? 'OCR กำลังอ่าน...' : ocrStatus === 'ok' ? '✓ OCR พบรหัส!' : '✗ OCR ไม่พบรหัส'}</span>
            </div>
          )}

          {/* Flag submission toggle */}
          {!won && (
            <button
              onClick={() => { setFlagOpen(o => !o); setTimeout(() => flagInputRef2.current?.focus(), 50); }}
              className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full squish transition-all ${flagOpen ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200'
                }`}
              title="ใส่ Flag เพื่อผ่านด่าน"
            >
              <span>🚩</span>
              <span>ใส่ Flag</span>
            </button>
          )}
        </div>
        {/* Flag Submission Panel */}
        {flagOpen && !won && (
          <div className="mb-3 anim-up">
            <div
              className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 transition-all ${flagError
                  ? 'border-red-400 bg-red-50'
                  : 'border-red-200 bg-red-50/60'
                }`}
              style={{ animation: flagError ? 'shake 0.4s ease' : 'none' }}
            >
              <span className="text-[18px] flex-shrink-0">🚩</span>
              <input
                ref={flagInputRef2}
                type="text"
                placeholder="FLAG{...}"
                className="flex-1 bg-transparent outline-none font-mono text-[13px] text-slate-800 placeholder-slate-400 uppercase"
                value={flagInput}
                onChange={e => { setFlagInput(e.target.value.toUpperCase()); setFlagError(false); }}
                onKeyDown={e => { if (e.key === 'Enter') submitFlag(); }}
              />
              {flagError && <span className="text-[12px] text-red-500 font-semibold flex-shrink-0">❌ Flag ไม่ถูก</span>}
              <button
                onClick={submitFlag}
                disabled={!flagInput.trim()}
                className={`px-3 py-1 rounded-lg text-[12px] font-bold squish transition-all ${flagInput.trim() ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                ส่ง
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 px-1">หากสำเร็จให้คีย์ Flag ที่ได้จากการสนทนาเพื่อผ่านด่าน</p>
          </div>
        )}
        {/* Image preview bar */}
        {imagePreview && (
          <div className="flex items-center gap-2 mb-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <img src={imagePreview.url} alt={imagePreview.name} className="w-14 h-14 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-slate-700 truncate">{imagePreview.name}</div>
              <div className="text-[11px] text-slate-400">รูปภาพพร้อมส่ง</div>
            </div>
            <button onClick={removeImage} className="text-slate-400 hover:text-red-500 squish transition-colors flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        )}
        {/* File (document) preview bar */}
        {fileAttachment && (
          <div className="flex items-center gap-2 mb-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 anim-up">
            <div className="w-12 h-12 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
              <FileText size={22} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-blue-800 truncate">{fileAttachment.name}</div>
              <div className="text-[11px] text-blue-400">{(fileAttachment.size / 1024).toFixed(1)} KB &bull; พร้อมส่ง</div>
            </div>
            <button onClick={removeFile} className="text-blue-300 hover:text-red-500 squish transition-colors flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            rows={2}
            placeholder={timerExpired ? '⌛ หมดเวลา — กด รีสตาร์ท' : won ? '✅ ด่านสำเร็จแล้ว!' : fileAttachment ? 'พิมพ์ข้อความประกอบไฟล์ (ไม่บังคับ)...' : imagePreview ? 'พิมพ์คำอธิบายภาพ (ไม่บังคับ)...' : 'พิมพ์ข้อความ...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={busy || won || timerExpired}
            className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none text-[14px] text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#06C755]/50 focus:ring-2 focus:ring-[#06C755]/10 transition-all scrollbar-hide disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={busy || won || timerExpired || (!input.trim() && !imagePreview && !fileAttachment)}
            className={`p-3.5 rounded-xl flex-shrink-0 transition-all squish ${(input.trim() || imagePreview || fileAttachment) && !busy && !won && !timerExpired ? 'bg-[#06C755] text-white shadow-md hover:bg-green-600' : 'bg-slate-100 text-slate-400'}`}
          >
            <Send size={20} className={input.trim() && !busy ? 'translate-x-0.5' : ''} />
          </button>
        </div>
        <p className="text-right mt-1.5 text-[11px] text-slate-400">Enter ส่ง • Shift+Enter ขึ้นบรรทัดใหม่</p>
      </div>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function highlight(text, query) {
  if (!query || !text) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-200 text-slate-900 rounded px-0.5">{p}</mark>
      : p
  );
}

function Bubble({ msg, stage: s, idx, searchQuery }) {
  const isUser = msg.role === 'user';
  const isError = msg.role === 'error';
  const hasFlag = !isUser && msg.text?.toLowerCase().includes('flag{');
  const fmtTs = d => d?.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) ?? '';

  // Slip generation — triggered when AI says [SLIP_IMAGE ...] and streaming is done
  const [slipUrl, setSlipUrl] = React.useState(null);
  const [slipLoading, setSlipLoading] = React.useState(false);
  // Parse [SLIP_IMAGE] tag with optional key=value params
  // Format: [SLIP_IMAGE bank=กสิกรไทย acct=123-456-7890 amount=50000 to=ชื่อผู้รับ]
  const slipTagMatch = !isUser ? msg.text?.match(/\[SLIP_IMAGE([^\]]*)\]/i) : null;
  const hasSlipTag = !!slipTagMatch;
  const slipParams = React.useMemo(() => {
    if (!slipTagMatch?.[1]) return {};
    const params = {};
    // Match key=value pairs; value can be quoted or unquoted (up to next key= or end)
    const re = /(\w+)=([^=]+?)(?=\s+\w+=|$)/g;
    let m;
    const attrStr = slipTagMatch[1].trim();
    // Simpler: split on pattern 'word='
    const parts = attrStr.split(/(?=\b\w+=)/g);
    parts.forEach(part => {
      const eq = part.indexOf('=');
      if (eq < 0) return;
      const k = part.slice(0, eq).trim();
      const v = part.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (k) params[k] = v;
    });
    return params;
  }, [slipTagMatch?.[1]]);
  React.useEffect(() => {
    if (!hasSlipTag || msg.streaming || slipUrl || slipLoading) return;
    setSlipLoading(true);
    fetch('/api/generate-slip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stageId: s?.id ?? 1,
        bank: slipParams.bank ?? null,
        acct: slipParams.acct ?? null,
        amount: slipParams.amount ?? null,
        toName: slipParams.to ?? slipParams.toName ?? null,
      }),
    })
      .then(r => r.json())
      .then(d => { if (d.slipUrl) setSlipUrl(d.slipUrl); })
      .catch(console.error)
      .finally(() => setSlipLoading(false));
  }, [hasSlipTag, msg.streaming, s?.id, slipParams]);

  if (isError) return (
    <div className="flex justify-center my-2" id={`msg-${idx}`}>
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-[12px] px-4 py-2 rounded-full">
        <AlertCircle size={14} /> {msg.text}
      </div>
    </div>
  );

  return (
    <div id={`msg-${idx}`} className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg mr-2.5 mt-0.5 flex-shrink-0 shadow-sm" style={{ background: s.avatarBg }}>{s.avatar}</div>
      )}
      <div className={`flex items-end max-w-[65%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          className={`rounded-2xl shadow-sm text-[14.5px] leading-relaxed anim-pop overflow-hidden
            ${isUser ? 'bg-[#06C755] text-white rounded-tr-sm' : hasFlag ? 'bg-red-50 border-2 border-red-400 text-slate-800 rounded-tl-sm' : 'bg-white text-slate-800 rounded-tl-sm border border-slate-100'}
          `}
          style={{ animationDelay: `${Math.min(idx * 0.04, 0.18)}s`, transformOrigin: isUser ? 'bottom right' : 'bottom left' }}
        >
          {/* Image attachment */}
          {msg.image && (
            <img
              src={msg.image.url}
              alt={msg.image.name}
              className="w-full max-w-[240px] object-cover block cursor-pointer"
              style={{ maxHeight: 200, borderRadius: msg.text ? '12px 12px 0 0' : '12px' }}
              onClick={() => window.open(msg.image.url)}
            />
          )}
          {/* File attachment card */}
          {msg.fileAttach && (
            <a
              href={msg.fileAttach.base64}
              download={msg.fileAttach.name}
              className={`flex items-center gap-3 px-4 py-3 no-underline ${msg.text ? 'border-b border-black/10' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-white/20' : 'bg-blue-100'}`}>
                <FileText size={20} className={isUser ? 'text-white' : 'text-blue-500'} />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-[13px] font-semibold truncate ${isUser ? 'text-white' : 'text-slate-800'}`}>{msg.fileAttach.name}</div>
                <div className={`text-[11px] ${isUser ? 'text-white/70' : 'text-slate-400'}`}>{(msg.fileAttach.size / 1024).toFixed(1)} KB · แตะเพื่อดาวน์โหลด</div>
              </div>
            </a>
          )}
          {/* Text — strip [SLIP_IMAGE ...] tag from display, render slip via API */}
          {msg.text && (() => {
            const cleanText = msg.text.replace(/\[SLIP_IMAGE[^\]]*\][^\n]*/gi, '').trim();
            return (
              <>
                {cleanText && (
                  <div className="px-4 py-2.5" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {searchQuery ? highlight(cleanText, searchQuery) : cleanText}
                    {msg.streaming && <span style={{ animation: 'timerPulse .7s step-start infinite' }}>▋</span>}
                  </div>
                )}
                {hasSlipTag && (
                  <div className="px-3 pb-3 pt-1">
                    {slipLoading && (<div className="text-[12px] text-slate-400 py-2 px-1 flex items-center gap-2">
                      <span style={{ animation: 'timerPulse .7s step-start infinite' }}>⏳</span> กำลัง generate สลิป...
                    </div>
                    )}
                    {slipUrl && (
                      <>
                        <div className="text-[11px] text-slate-400 mb-1.5 px-1">📄 สลิปโอนเงิน (คลิกเพื่อขยาย)</div>
                        <img
                          src={slipUrl}
                          alt="bank slip"
                          className="w-full rounded-xl border border-slate-200 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                          style={{ maxWidth: 260 }}
                          onClick={() => window.open(slipUrl)}
                        />
                      </>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
        <div className={`flex flex-col text-[11px] text-slate-400 mb-0.5 ${isUser ? 'mr-2 items-end' : 'ml-2 items-start'}`}>
          {isUser && <span className="mb-0.5 flex items-center gap-0.5"><CheckCheck size={11} className="text-[#06C755]" /> อ่านแล้ว</span>}
          <span>{fmtTs(msg.ts)}</span>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BRIEFING PANEL (right side)
// ═════════════════════════════════════════════════════════════════════════════
function BriefingPanel({ stage: s, onClose }) {
  return (
    <div className="w-[280px] h-full flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden shadow-[-4px_0_12px_rgba(0,0,0,0.04)] anim-slide">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
        <span className="text-[13px] font-bold text-slate-700">ข้อมูลด่าน</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 squish"><X size={16} /></button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="flex flex-col gap-4 p-4">
          {/* Stage badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: s.color + '18' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ background: s.avatarBg }}>{s.avatar}</div>
            <div>
              <div className="text-[13px] font-bold" style={{ color: s.color }}>{s.scenario}</div>
              <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(i => <span key={i} className="text-[11px]" style={{ color: i <= s.difficulty ? '#FBBF24' : '#d1d5db' }}>★</span>)}</div>
            </div>
          </div>

          {/* Role */}
          <Card title="🎭 บทบาทของคุณ" accent="#06C755">
            <p className="text-[12px] text-slate-600 leading-relaxed">{s.role}</p>
          </Card>

          {/* Target */}
          <Card title="🎯 เป้าหมาย" accent={s.color}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: s.avatarBg }}>{s.avatar}</div>
              <div>
                <div className="text-[13px] font-semibold text-slate-800">{s.contactName}</div>
                <div className="text-[11px] text-slate-500">{s.contactSub}</div>
              </div>
            </div>
            <p className="text-[12px] text-slate-600 leading-relaxed">{s.objective}</p>
          </Card>

          {/* Tips */}
          <Card title="💡 เทคนิค" accent="#FBBF24">
            <ul className="flex flex-col gap-2">
              {s.tips.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: s.color }} />
                  {t}
                </li>
              ))}
            </ul>
          </Card>

          {/* OCR Evidence */}
          <Card title="🔍 เอกสารหลักฐาน (OCR)" accent="#F59E0B">
            <div className="flex items-start gap-2.5">
              <span className="text-2xl flex-shrink-0">📄</span>
              <div>
                <p className="text-[12px] text-slate-700 font-semibold mb-1">ผู้เล่นต้องหาเอกสารเอง</p>
                <p className="text-[12px] text-slate-500 leading-relaxed mb-2">
                  สร้างหรือหาเอกสารที่เหมาะสมกับด่าน แล้วแนบรูปเข้ามาในแชทเพื่อให้ AI อ่าน
                </p>
                <div className="bg-amber-50 rounded-lg px-2.5 py-2 text-[11px] text-amber-800 space-y-1">
                  <div className="font-bold text-amber-700 mb-1">📌 เอกสารที่ต้องใช้ในด่านนี้</div>
                  <div>🔹 ด่าน 1 — ใบเสร็จ COD / ใบส่งของ</div>
                  <div>🔹 ด่าน 2 — สกรีนช็อต LINE (แสดงว่าเป็นแพม)</div>
                  <div>🔹 ด่าน 3 — สมุดบัญชี / จดหมายส่วนตัว</div>
                  <div>🔹 ด่าน 4 — หนังสือราชการ / หมายเรียก</div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">💡 ถ่ายรูป ทำเอง หรือแก้ไขไฟล์ใดก็ได้ที่ดูน่าเชื่อถือ</p>
              </div>
            </div>
          </Card>

          {/* FLAG */}
          <Card title="🚩 FLAG เป้าหมาย" accent="#EF4444">
            <div className="font-mono text-[13px] text-red-500 font-bold bg-red-50 px-3 py-2 rounded-lg tracking-wide">FLAG{'{{???}}'}</div>
            <p className="text-[11px] text-slate-500 mt-1.5">สำเร็จแล้วให้กด 🚩 <strong className="text-red-500">ใส่ Flag</strong> ในช่องแชทเพื่อผ่านด่าน</p>
          </Card>


          {/* Slip — AI generates on success */}
          <Card title="🧾 สลิปโอนเงิน" accent="#6366f1">
            <div className="flex items-start gap-2.5">
              <span className="text-2xl flex-shrink-0">🤖</span>
              <div>
                <p className="text-[12px] text-slate-700 font-semibold mb-1">AI สร้างสลิปให้อัตโนมัติ</p>
                <p className="text-[12px] text-slate-500 leading-relaxed">
                  เมื่อคุณหลอก AI สำเร็จ AI จะ generate สลิปธนาคารปลอมและส่งมาในแชท
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="text-indigo-400">①</span> หลอก AI ให้ยอม "โอนเงิน"
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="text-indigo-400">②</span> AI สร้างสลิปและแนบในแชท
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="text-indigo-400">③</span> แนบสลิปกลับไปเพื่อให้ AI อ่าน flag
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="text-indigo-400">④</span> กด 🚩 ใส่ flag เพื่อผ่านด่าน
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {s.isSpecial && (
            <Card title="⚡ กติกาพิเศษ" accent="#0096FF">
              <p className="text-[12px] text-slate-600 leading-relaxed">
                ด่านนี้มีเวลา <strong>5 นาที</strong> นับจากข้อความแรกที่ส่ง<br />
                หมดเวลา = แพ้ ต้องกด <strong>รีสตาร์ท</strong>
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, accent, children }) {
  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide border-l-[3px]" style={{ borderColor: accent, color: accent, background: accent + '10' }}>
        {title}
      </div>
      <div className="px-3 py-2.5 bg-white">{children}</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═════════════════════════════════════════════════════════════════════════════
function EmptyState({ passed }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
      <div className="w-28 h-28 rounded-full bg-white shadow flex items-center justify-center mb-5 anim-pop">
        <MessageCircle size={48} className="text-slate-300" />
      </div>
      <p className="text-slate-500 font-semibold text-[16px] anim-up" style={{ animationDelay: '.1s' }}>เลือกด่านเพื่อเริ่มต้น</p>
      <p className="text-slate-400 text-[13px] mt-1 anim-up" style={{ animationDelay: '.15s' }}>ผ่านแล้ว {passed}/{STAGES.length} ด่าน</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CELEBRATION OVERLAY
// ═════════════════════════════════════════════════════════════════════════════
function CelebrationOverlay({ stageId, onDone }) {
  const s = STAGES[stageId - 1];
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-3xl p-10 text-center max-w-sm w-full shadow-2xl" style={{ animation: 'celebPop .5s cubic-bezier(.34,1.56,.64,1)' }}>
        <div className="text-5xl mb-3" style={{ animation: 'fadUpSpring .5s ease' }}>🎉</div>
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-3 shadow-md" style={{ background: s.avatarBg }}>{s.avatar}</div>
        <div className="text-[22px] font-bold mb-1" style={{ color: s.color }}>ด่านที่ {s.id} สำเร็จ!</div>
        <div className="text-slate-500 text-[13px] mb-4">{s.scenario}</div>
        <div className="font-mono text-[14px] text-red-500 font-bold bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl mb-5 tracking-wide">{s.flag}</div>
        <div className="text-[12px] text-slate-500 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl mb-6 leading-relaxed">
          💡 แม้แต่คนที่ดูน่าเชื่อถือก็อาจเป็นมิจฉาชีพได้!
        </div>
        {stageId < 5 && (
          <button onClick={onDone} className="w-full py-3 rounded-2xl text-white font-bold text-[15px] squish hover:opacity-90 transition-all" style={{ background: s.color }}>
            ไปด่านต่อไป →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Emoji Picker ────────────────────────────────────────────────────────────
const EMOJI_CATS = [
  {
    label: '😀 อารมณ์',
    emojis: ['😀', '😁', '😂', '😃', '😄', '😅', '🤣', '😆', '😇', '😉', '😊', '😋', '😎', '🥰', '😘', '😗',
      '🤩', '😚', '😍', '🥳', '😢', '😥', '😰', '😱', '😡', '🤬', '😐', '😑', '😶', '🙄', '🙅', '🙆'],
  },
  {
    label: '👍 ท่าทาง',
    emojis: ['👍', '👋', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👊', '✊', '👐', '🙌', '🙏', '💅', '☝️', '👆',
      '👇', '👈', '👉', '💪', '🤲', '🙋', '🙇', '🙎', '🤦', '🤷', '🤸', '💃', '🕺', '🧖', '🤵', '🤾'],
  },
  {
    label: '❤️ เรื่องรัก',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🧤', '💗', '💘', '💖', '💝', '💞', '💟', '❣️', '💌', '💋',
      '💑', '💍', '💎', '👚', '🎀', '🎁', '🎂', '🎈', '🎊', '🎉', '🎎', '🪅', '🌀', '🌟', '⭐', '✨'],
  },
  {
    label: '💰 เงิน/โกง',
    emojis: ['💰', '💳', '💵', '💸', '💴', '💶', '💷', '🏦', '📱', '📲', '📞', '💻', '🖥️', '📊', '📈', '📉',
      '📦', '📧', '📬', '📭', '📥', '📤', '📷', '🖖', '🕢', '🕨', '🔐', '🔒', '🔓', '⚠️', '❗', '❓'],
  },
];

function EmojiPicker({ onSelect, onClose }) {
  const [cat, setCat] = useState(0);
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-50 anim-up" style={{ animationDelay: '0s' }}>
      <div className="mx-5 bg-[#1e1e2e] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Category tabs */}
        <div className="flex border-b border-white/10">
          {EMOJI_CATS.map((c, i) => (
            <button
              key={i}
              onClick={() => setCat(i)}
              className={`flex-1 py-2 text-[18px] transition-colors ${cat === i ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
            >
              {c.emojis[0]}
            </button>
          ))}
          <button onClick={onClose} className="px-3 text-white/40 hover:text-white/80 text-[13px]">✕</button>
        </div>
        {/* Label */}
        <div className="px-3 pt-2 pb-1 text-[11px] font-bold text-white/40 uppercase tracking-widest">
          {EMOJI_CATS[cat].label}
        </div>
        {/* Grid */}
        <div className="grid grid-cols-8 gap-0 px-2 pb-3 max-h-44 overflow-y-auto scrollbar-hide">
          {EMOJI_CATS[cat].emojis.map((e, i) => (
            <button
              key={i}
              onClick={() => onSelect(e)}
              className="text-[22px] w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors squish"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
