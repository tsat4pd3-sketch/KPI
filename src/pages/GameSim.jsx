import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { loadAgents } from '../config/agentDefaults';

// ── Sprite sheet config ──────────────────────────────────────────
// Row 0: engineer (stand, walk, blueprint, tablet, wave)
// Row 1: robot    (wrench, box, carry, charge, compute)
// Row 2: assets   (car, arm, charger, delivery-bot, gear)
const SHEET = {
  url: '/sprites.png',
  cols: 5, rows: 3,
  w: 1400, h: 870,
  get cw() { return this.w / this.cols; },
  get ch() { return this.h / this.rows; },
};

const TYPE_ROW   = { engineer: 0, manager: 0, robot: 1 };
const WALK_COLS  = { engineer: [0, 1], manager: [0, 4], robot: [0, 2] };
const WORK_COL   = { engineer: 2, manager: 3, robot: 1 };
const ASSET_COLS = { car: 0, arm: 1, charger: 2, delivery: 3, gear: 4 };

const MACHINES = [
  { x: '4%',  y: '26%', asset: 'car',      color: '#60a5fa', label: 'HOLO CAR',     task: 'ตรวจสอบระบบ',   size: 90 },
  { x: '72%', y: '26%', asset: 'gear',     color: '#3dd65c', label: 'KPI BOARD',    task: 'อัปเดต KPI',    size: 68 },
  { x: '6%',  y: '60%', asset: 'arm',      color: '#fb923c', label: 'ARM-01',       task: 'ซ่อมบำรุง',     size: 78 },
  { x: '79%', y: '60%', asset: 'arm',      color: '#c084fc', label: 'ARM-02',       task: 'ปรับแต่ง',      size: 78 },
  { x: '38%', y: '72%', asset: 'charger',  color: '#fbbf24', label: 'CHARGE STA.', task: 'ชาร์จพลังงาน',  size: 72 },
  { x: '58%', y: '46%', asset: 'delivery', color: '#34d399', label: 'DELIVERY BOT', task: 'ส่งรายงาน',     size: 72 },
];

const AGENT_STATE = { IDLE: 'idle', GOING: 'going', WORKING: 'working', LEAVING: 'leaving' };

// ── CSS sprite renderer ──────────────────────────────────────────
function SheetSprite({ col, row, size, flipX = false }) {
  const scale = size / SHEET.cw;
  return (
    <div style={{
      width: size,
      height: Math.round(SHEET.ch * scale),
      backgroundImage: `url(${SHEET.url})`,
      backgroundPosition: `${-(col * SHEET.cw * scale).toFixed(1)}px ${-(row * SHEET.ch * scale).toFixed(1)}px`,
      backgroundSize: `${(SHEET.w * scale).toFixed(1)}px ${(SHEET.h * scale).toFixed(1)}px`,
      backgroundRepeat: 'no-repeat',
      transform: flipX ? 'scaleX(-1)' : 'none',
    }} />
  );
}

function SpriteChar({ type = 'engineer', frame = 0, working = false, size = 72, flipX = false }) {
  const row = TYPE_ROW[type] ?? 0;
  const col = working ? (WORK_COL[type] ?? 2) : (WALK_COLS[type] ?? [0, 1])[frame % 2];
  return <SheetSprite col={col} row={row} size={size} flipX={flipX} />;
}

function SpriteAsset({ assetKey, size = 80 }) {
  return <SheetSprite col={ASSET_COLS[assetKey] ?? 0} row={2} size={size} />;
}

// ── Work progress ring ───────────────────────────────────────────
function WorkRing({ progress, color }) {
  const r = 15, circ = 2 * Math.PI * r;
  return (
    <svg width={36} height={36} style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)' }}>
      <circle cx={18} cy={18} r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={3} />
      <circle cx={18} cy={18} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
        strokeLinecap="round" transform="rotate(-90 18 18)" />
    </svg>
  );
}

// ── Speech bubble ────────────────────────────────────────────────
function SpeechBubble({ message, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: .85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: .85 }}
      transition={{ duration: .18 }}
      style={{
        position: 'absolute', bottom: '115%', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(2,8,4,0.96)', color, border: `1px solid ${color}`,
        borderRadius: 8, padding: '4px 9px', fontSize: 10, fontWeight: 700,
        whiteSpace: 'nowrap', pointerEvents: 'none',
        boxShadow: `0 0 14px ${color}66`, zIndex: 30, letterSpacing: '.03em',
      }}
    >
      {message}
      <div style={{
        position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0, borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent', borderTop: `6px solid ${color}`,
      }} />
    </motion.div>
  );
}

// ── Agent sprite (state machine) ─────────────────────────────────
function AgentSprite({ agent, floorW, floorH, machinesPixel, onClick, onMachineChange }) {
  const [rd, setRd] = useState({
    pos: { x: 100, y: 100 }, frame: 0, flipX: false,
    state: AGENT_STATE.IDLE, msgIdx: 0, showMsg: true, workProgress: 0,
  });

  const stRef = useRef(null);
  if (!stRef.current) {
    stRef.current = {
      pos: {
        x: 80 + Math.random() * Math.max(floorW - 180, 100),
        y: Math.floor(floorH * 0.35) + Math.random() * Math.max(floorH * 0.5, 60),
      },
      target: null, frame: 0, flipX: false, state: AGENT_STATE.IDLE,
      msgIdx: 0, showMsg: true, frameTimer: 0, msgTimer: 0,
      idleTimer: 20 + Math.random() * 100,
      workElapsed: 0, workDuration: 0, workProgress: 0,
      machineIdx: null, notifiedMachine: null,
    };
  }

  const flRef = useRef({ w: floorW, h: floorH });
  useEffect(() => { flRef.current = { w: floorW, h: floorH }; }, [floorW, floorH]);
  const machRef = useRef(machinesPixel);
  useEffect(() => { machRef.current = machinesPixel; }, [machinesPixel]);
  const cbRef = useRef(onMachineChange);
  useEffect(() => { cbRef.current = onMachineChange; }, [onMachineChange]);
  const agRef = useRef(agent);
  useEffect(() => { agRef.current = agent; }, [agent]);

  const animRef = useRef(null);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    const tick = (now) => {
      const dt  = Math.min((now - lastRef.current) / 16, 3);
      lastRef.current = now;
      const st  = stRef.current;
      const ag  = agRef.current;
      const fl  = flRef.current;
      const mps = machRef.current;
      const SPEED  = ag.speed * 2.8;
      const ARRIVE = 22;
      // floor area limits (stay below back wall ~28%)
      const Y_MIN = fl.h * 0.30;
      const Y_MAX = fl.h - 110;
      const X_MIN = fl.w * 0.08;
      const X_MAX = fl.w * 0.90;

      st.frameTimer += dt;
      if (st.frameTimer > 28) {
        st.frameTimer = 0;
        if (st.state === AGENT_STATE.GOING || st.state === AGENT_STATE.LEAVING)
          st.frame = 1 - st.frame;
      }

      st.msgTimer += dt;
      if (st.msgTimer > 168) {
        st.msgTimer = 0; st.showMsg = false;
        const next = (st.msgIdx + 1) % ag.messages.length;
        setTimeout(() => { if (stRef.current) { stRef.current.msgIdx = next; stRef.current.showMsg = true; } }, 180);
      }

      if (st.state === AGENT_STATE.IDLE) {
        st.idleTimer -= dt;
        if (st.idleTimer <= 0 && mps.length > 0) {
          const mi = Math.floor(Math.random() * mps.length);
          const mp = mps[mi];
          st.target = {
            x: Math.min(Math.max(mp.x - 20 + Math.random() * 40, X_MIN), X_MAX),
            y: Math.min(Math.max(mp.y + 35 + Math.random() * 20, Y_MIN), Y_MAX),
          };
          st.machineIdx = mi; st.state = AGENT_STATE.GOING;
        }
      } else if (st.state === AGENT_STATE.GOING) {
        const dx = st.target.x - st.pos.x, dy = st.target.y - st.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ARRIVE) {
          st.pos = { ...st.target }; st.state = AGENT_STATE.WORKING;
          st.frame = 0; st.workDuration = 200 + Math.random() * 280;
          st.workElapsed = 0; st.workProgress = 0;
          if (cbRef.current) cbRef.current(st.machineIdx, ag.id, null);
          st.notifiedMachine = st.machineIdx;
        } else {
          const spd = Math.min(SPEED * dt, dist);
          st.pos = { x: st.pos.x + (dx / dist) * spd, y: st.pos.y + (dy / dist) * spd };
          st.flipX = dx < 0;
        }
      } else if (st.state === AGENT_STATE.WORKING) {
        st.workElapsed += dt;
        st.workProgress = Math.min(st.workElapsed / st.workDuration, 1);
        if (st.workElapsed >= st.workDuration) {
          if (cbRef.current && st.notifiedMachine !== null) {
            cbRef.current(st.notifiedMachine, null, ag.id); st.notifiedMachine = null;
          }
          st.target = {
            x: X_MIN + Math.random() * (X_MAX - X_MIN),
            y: Y_MIN + Math.random() * (Y_MAX - Y_MIN),
          };
          st.machineIdx = null; st.state = AGENT_STATE.LEAVING;
        }
      } else if (st.state === AGENT_STATE.LEAVING) {
        const dx = st.target.x - st.pos.x, dy = st.target.y - st.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ARRIVE) {
          st.state = AGENT_STATE.IDLE; st.idleTimer = 30 + Math.random() * 80; st.frame = 0;
        } else {
          const spd = Math.min(SPEED * dt, dist);
          st.pos = { x: st.pos.x + (dx / dist) * spd, y: st.pos.y + (dy / dist) * spd };
          st.flipX = dx < 0;
        }
      }

      setRd({ pos: { ...st.pos }, frame: st.frame, flipX: st.flipX, state: st.state,
              msgIdx: st.msgIdx, showMsg: st.showMsg, workProgress: st.workProgress });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const isGood    = agent.value >= agent.target;
  const sc        = isGood ? '#4ade80' : '#f87171';
  const isWorking = rd.state === AGENT_STATE.WORKING;
  const isMoving  = rd.state === AGENT_STATE.GOING || rd.state === AGENT_STATE.LEAVING;

  return (
    <div
      onClick={() => onClick(agent)}
      onMouseEnter={e => { e.currentTarget.style.filter = `drop-shadow(0 0 12px ${agent.color}cc)`; }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
      style={{
        position: 'absolute', left: rd.pos.x, top: rd.pos.y,
        width: 80, cursor: 'pointer', userSelect: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        zIndex: 10, transition: 'filter .15s',
      }}
    >
      <AnimatePresence mode="wait">
        {rd.showMsg && <SpeechBubble key={rd.msgIdx} message={agent.messages[rd.msgIdx]} color={agent.color} />}
      </AnimatePresence>

      <div style={{
        background: isGood ? agent.color : '#f87171', color: '#000',
        fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 4, marginBottom: 2,
        boxShadow: `0 0 8px ${isGood ? agent.color : '#f87171'}99`,
      }}>{agent.value}{agent.unit}</div>

      {isWorking && <WorkRing progress={rd.workProgress} color={agent.color} />}

      <SpriteChar type={agent.type} frame={rd.frame} working={isWorking} size={72} flipX={rd.flipX} />

      <div style={{
        fontSize: 9, color: agent.color, fontWeight: 700, marginTop: 1,
        textShadow: `0 0 8px ${agent.color}99`, textAlign: 'center', lineHeight: 1.2,
      }}>{agent.name}</div>

      <div style={{ fontSize: 7.5, color: '#5ecf8a', marginTop: 1, opacity: .85 }}>
        {isWorking ? '⚡ ทำงาน' : isMoving ? '🚶 เดิน' : '💤 รอ'}
      </div>

      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: sc, marginTop: 2,
        boxShadow: `0 0 8px ${sc}`, animation: 'statusPulse 2s ease-in-out infinite',
      }} />
    </div>
  );
}

// ── Agent detail modal ───────────────────────────────────────────
function AgentDetail({ agent, onClose }) {
  const isGood = agent.value >= agent.target;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="overlay" onClick={onClose}>
      <motion.div
        initial={{ scale: .85, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .85, y: 24 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <SpriteChar type={agent.type} frame={0} size={96} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: agent.color }}>{agent.name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{agent.role}</div>
        <div style={{
          background: isGood ? 'var(--green-dim)' : 'var(--red-dim)',
          border: `1px solid ${isGood ? 'var(--green)' : 'var(--red)'}`,
          borderRadius: 10, padding: '12px 20px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 3 }}>{agent.kpi}</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: isGood ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>{agent.value}{agent.unit}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>เป้าหมาย {agent.target}{agent.unit}</div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 5, color: isGood ? 'var(--green)' : 'var(--red)' }}>
            {isGood ? '✅ ผ่านเป้าหมาย' : '⚠️ ต่ำกว่าเป้าหมาย'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, textAlign: 'left', marginBottom: 14 }}>
          {agent.messages.map((m, i) => (
            <div key={i} style={{ fontSize: 13, padding: '6px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}>{m}</div>
          ))}
        </div>
        <button onClick={onClose} style={{ background: agent.color, color: '#000', border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 800, width: '100%' }}>ปิด</button>
      </motion.div>
    </motion.div>
  );
}

// ── Activity log item ────────────────────────────────────────────
function LogItem({ item }) {
  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '5px 8px',
        borderLeft: `3px solid ${item.color}`, marginBottom: 4,
        background: 'rgba(6,16,9,0.85)', borderRadius: '0 6px 6px 0' }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: item.color, lineHeight: 1.2 }}>{item.agentName}</div>
      <div style={{ fontSize: 9, color: '#5ecf8a', lineHeight: 1.2 }}>{item.task} · {item.machineName}</div>
      <div style={{ fontSize: 8, color: '#3a6b4a' }}>{item.time}</div>
    </motion.div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function GameSim() {
  const [agents]           = useState(loadAgents);
  const [selected, setSelected]   = useState(null);
  const [dims, setDims]           = useState({ width: 0, height: 0 });
  const [machineOccupants, setMachineOccupants] = useState({});
  const [activityLog, setActivityLog]           = useState([]);
  const [showLog, setShowLog] = useState(window.innerWidth > 580);
  const floorRef  = useRef(null);
  const agentsRef = useRef(agents);

  useEffect(() => {
    const update = () => {
      if (floorRef.current)
        setDims({ width: floorRef.current.offsetWidth, height: floorRef.current.offsetHeight });
      setShowLog(window.innerWidth > 580);
    };
    update();
    const ro = new ResizeObserver(update);
    if (floorRef.current) ro.observe(floorRef.current);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  const machinesPixel = useMemo(() =>
    dims.width > 0 ? MACHINES.map(m => ({
      x: parseFloat(m.x) / 100 * dims.width,
      y: parseFloat(m.y) / 100 * dims.height,
    })) : [],
  [dims]);

  const handleMachineChange = useCallback((machineIdx, agentId, leavingId) => {
    if (agentId) {
      setMachineOccupants(prev => ({ ...prev, [machineIdx]: agentId }));
      const ag = agentsRef.current.find(a => a.id === agentId);
      const machine = MACHINES[machineIdx];
      if (ag && machine) {
        const now  = new Date();
        const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
        setActivityLog(prev => [
          { id: `${agentId}-${Date.now()}`, agentName: ag.name, machineName: machine.label, task: machine.task, color: ag.color, time },
          ...prev.slice(0, 19),
        ]);
      }
    } else {
      setMachineOccupants(prev => {
        if (prev[machineIdx] === leavingId) return { ...prev, [machineIdx]: null };
        return prev;
      });
    }
  }, []);

  return (
    <div style={{
      height: 'calc(100vh - 58px)', display: 'flex', flexDirection: 'column',
      padding: 14, overflow: 'hidden', boxSizing: 'border-box',
      background: '#040a05',
    }}>

      {/* Header */}
      <div style={{ marginBottom: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🎮</span>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 800, color: '#7dffb0', lineHeight: 1, margin: 0, textShadow: '0 0 20px #3dff8055' }}>KPI Agent Sim</h1>
              <p style={{ fontSize: 11, color: '#3d8c58', margin: 0 }}>Agent เดินทำงาน · แตะตัวละครเพื่อดู KPI</p>
            </div>
          </div>
          <Link to="/agentsetup" style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
            background: 'rgba(61,214,92,0.08)', border: '1px solid rgba(61,214,92,0.3)',
            borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 700, color: '#3dd65c',
          }}>⚙️ ตั้งค่า Agent</Link>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {agents.map(a => {
            const good     = a.value >= a.target;
            const occupied = Object.values(machineOccupants).includes(a.id);
            return (
              <button key={a.id} onClick={() => setSelected(a)} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px',
                background: occupied ? `${a.color}15` : 'rgba(8,18,11,0.8)',
                border: `1px solid ${occupied ? a.color : a.color + '40'}`,
                borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                color: good ? '#4ade80' : '#f87171',
                boxShadow: occupied ? `0 0 8px ${a.color}44` : 'none',
              }}>
                {occupied && <span style={{ fontSize: 8, color: a.color }}>⚡</span>}
                <span style={{ fontSize: 13 }}>{a.type === 'robot' ? '🤖' : a.type === 'engineer' ? '👷' : '💼'}</span>
                <span>{a.value}{a.unit}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floor + log */}
      <div style={{ flex: 1, display: 'flex', gap: 10, overflow: 'hidden', minHeight: 0 }}>

        {/* ╔════════════════════════════╗
             3D DIORAMA FACTORY ROOM
           ╚════════════════════════════╝ */}
        <div ref={floorRef} style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          borderRadius: 14,
          border: '1px solid rgba(52,210,92,0.18)',
          boxShadow: '0 0 60px rgba(0,180,60,0.1), 0 0 0 1px rgba(52,210,92,0.06)',
          background: '#030804',
        }}>

          {/* ── LAYER 1: 3D perspective floor grid ──
               Only this div is CSS-3D rotated so the grid looks like
               a floor receding into the distance. Agents/machines stay flat. */}
          <div style={{
            position: 'absolute',
            top: '22%', left: '-15%', right: '-15%', bottom: '-90%',
            pointerEvents: 'none',
            transform: 'perspective(440px) rotateX(26deg)',
            transformOrigin: '50% 0%',
            backgroundColor: '#050e07',
            backgroundImage: [
              'linear-gradient(to bottom, rgba(14,38,22,1) 0%, rgba(4,10,6,0.85) 50%, rgba(7,18,12,0.6) 100%)',
              'linear-gradient(rgba(52,255,100,0.07) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(52,255,100,0.07) 1px, transparent 1px)',
              'linear-gradient(rgba(52,255,100,0.022) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(52,255,100,0.022) 1px, transparent 1px)',
            ].join(','),
            backgroundSize: 'auto, 120px 120px, 120px 120px, 40px 40px, 40px 40px',
          }} />

          {/* ── LAYER 2: Back wall (top strip) ── */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '26%',
            background: 'linear-gradient(to bottom, rgba(18,46,26,0.98) 0%, rgba(10,26,15,0.85) 65%, transparent 100%)',
            pointerEvents: 'none', zIndex: 2,
          }}>
            {/* Ceiling light bar */}
            <div style={{
              position: 'absolute', top: 0, left: '18%', right: '18%', height: 3,
              background: 'rgba(90,255,140,0.85)',
              boxShadow: '0 0 24px rgba(52,255,100,0.9), 0 0 70px rgba(52,255,100,0.4), 0 4px 30px rgba(52,255,100,0.3)',
            }} />
            {/* Ceiling diffuse glow below light */}
            <div style={{
              position: 'absolute', top: 0, left: '5%', right: '5%', height: '60%',
              background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(52,255,100,0.08) 0%, transparent 100%)',
            }} />
            {/* Wall vertical panels */}
            <div style={{
              position: 'absolute', inset: '8px 0 0 0',
              backgroundImage: 'repeating-linear-gradient(90deg, rgba(52,255,100,0.055) 0, rgba(52,255,100,0.055) 1px, transparent 1px, transparent 90px)',
            }} />
            {/* Wall-floor junction line */}
            <div style={{
              position: 'absolute', bottom: 0, left: '7%', right: '7%', height: 1,
              background: 'rgba(52,255,100,0.3)',
              boxShadow: '0 0 10px rgba(52,255,100,0.5)',
            }} />
          </div>

          {/* ── LAYER 3: Left wall ── */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '7%', height: '100%',
            background: 'linear-gradient(to right, rgba(16,44,24,0.92) 0%, transparent 100%)',
            pointerEvents: 'none', zIndex: 2,
          }}>
            {/* Glowing left edge */}
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0, width: 2,
              background: 'linear-gradient(to bottom, rgba(90,255,140,0.8) 0%, rgba(52,210,92,0.25) 60%, transparent 100%)',
              boxShadow: '2px 0 14px rgba(52,255,100,0.45)',
            }} />
            {/* Wall panel horizontal lines */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(52,255,100,0.04) 0, rgba(52,255,100,0.04) 1px, transparent 1px, transparent 38px)',
            }} />
          </div>

          {/* ── LAYER 4: Right wall ── */}
          <div style={{
            position: 'absolute', top: 0, right: 0, width: '7%', height: '100%',
            background: 'linear-gradient(to left, rgba(16,44,24,0.92) 0%, transparent 100%)',
            pointerEvents: 'none', zIndex: 2,
          }}>
            <div style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: 2,
              background: 'linear-gradient(to bottom, rgba(90,255,140,0.8) 0%, rgba(52,210,92,0.25) 60%, transparent 100%)',
              boxShadow: '-2px 0 14px rgba(52,255,100,0.45)',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(52,255,100,0.04) 0, rgba(52,255,100,0.04) 1px, transparent 1px, transparent 38px)',
            }} />
          </div>

          {/* ── LAYER 5: Corner junction dots (where walls meet floor) ── */}
          {[['24%','6.5%'], ['24%','93.5%']].map(([top, left], i) => (
            <div key={i} style={{
              position: 'absolute', top, left,
              width: 8, height: 8, borderRadius: '50%',
              transform: 'translate(-50%,-50%)',
              background: 'rgba(110,255,150,0.95)',
              boxShadow: '0 0 12px rgba(52,255,100,0.9), 0 0 4px #fff',
              zIndex: 3, pointerEvents: 'none',
            }} />
          ))}

          {/* ── LAYER 6: Atmospheric effects ── */}
          {/* Center ambient glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 60% 48% at 50% 60%, rgba(18,130,50,0.13) 0%, transparent 72%)',
          }} />
          {/* Blue accent corner (bottom-right) */}
          <div style={{
            position: 'absolute', bottom: 0, right: 0, width: 200, height: 180,
            background: 'radial-gradient(circle at 100% 100%, rgba(80,150,255,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          {/* Edge vignette */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.55)',
          }} />

          {/* ── LAYER 7: Machines (zIndex 5, above wall decorations) ── */}
          {MACHINES.map((m, i) => {
            const occupantId = machineOccupants[i];
            const occupant   = occupantId ? agents.find(a => a.id === occupantId) : null;
            return (
              <div key={i} style={{
                position: 'absolute', left: m.x, top: m.y, pointerEvents: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                zIndex: 5,
                filter: occupant
                  ? `drop-shadow(0 0 16px ${occupant.color}cc) brightness(1.15)`
                  : `drop-shadow(0 0 10px ${m.color}77)`,
                transition: 'filter .4s',
              }}>
                {occupant && (
                  <div style={{
                    fontSize: 7, color: occupant.color, fontWeight: 800,
                    background: `${occupant.color}18`, border: `1px solid ${occupant.color}55`,
                    borderRadius: 4, padding: '1px 5px', marginBottom: 2,
                    boxShadow: `0 0 8px ${occupant.color}44`,
                    animation: 'statusPulse 1.4s ease-in-out infinite',
                  }}>⚡ {occupant.name}</div>
                )}
                <SpriteAsset assetKey={m.asset} size={m.size} />
                <div style={{
                  fontSize: 8, color: occupant ? occupant.color : m.color,
                  fontWeight: 800, letterSpacing: '.06em', marginTop: 2, textAlign: 'center',
                  textShadow: `0 0 8px ${occupant ? occupant.color : m.color}99`,
                  transition: 'color .4s',
                }}>{m.label}</div>
              </div>
            );
          })}

          {/* ── LAYER 8: Agent sprites (zIndex 10) ── */}
          {dims.width > 0 && machinesPixel.length > 0 && agents.map(a => (
            <AgentSprite key={a.id} agent={a}
              floorW={dims.width} floorH={dims.height}
              machinesPixel={machinesPixel}
              onClick={setSelected}
              onMachineChange={handleMachineChange}
            />
          ))}

          <div style={{ position: 'absolute', bottom: 7, right: 12, fontSize: 9, color: '#246635', opacity: .8, zIndex: 4 }}>
            Thai Summit Group · Factory Floor Simulation
          </div>
        </div>

        {/* Activity log sidebar */}
        {showLog && (
          <div style={{
            width: 168, flexShrink: 0, display: 'flex', flexDirection: 'column',
            background: 'rgba(4,10,6,0.96)',
            border: '1px solid rgba(52,210,92,0.18)',
            borderRadius: 10, overflow: 'hidden',
            boxShadow: '0 0 20px rgba(0,160,55,0.07)',
          }}>
            <div style={{
              padding: '8px 10px', borderBottom: '1px solid rgba(52,210,92,0.14)',
              fontSize: 11, fontWeight: 700, color: '#3dd65c', flexShrink: 0,
              textShadow: '0 0 12px #3dd65c55',
            }}>📋 Activity Log</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
              <AnimatePresence initial={false}>
                {activityLog.length === 0
                  ? <div style={{ fontSize: 10, color: '#2d6040', padding: 10, textAlign: 'center' }}>รอ Agent เริ่มทำงาน...</div>
                  : activityLog.map(item => <LogItem key={item.id} item={item} />)
                }
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && <AgentDetail agent={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>

      <style>{`
        @keyframes statusPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.7)} }
      `}</style>
    </div>
  );
}
