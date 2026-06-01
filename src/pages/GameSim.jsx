import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AGENTS = [
  {
    id: 'oee',
    name: 'OEE Monitor',
    role: 'ติดตาม OEE',
    emoji: '🤖',
    color: '#3dd65c',
    kpi: 'OEE',
    value: 87.3,
    target: 85,
    unit: '%',
    messages: ['OEE อยู่ที่ 87.3%! ✅', 'Availability 92%', 'Performance 95%', 'Quality 99.5%'],
    speed: 1.2,
  },
  {
    id: 'quality',
    name: 'Quality Inspector',
    role: 'ตรวจสอบคุณภาพ',
    emoji: '🔍',
    color: '#60a5fa',
    kpi: 'Quality Rate',
    value: 99.5,
    target: 99,
    unit: '%',
    messages: ['คุณภาพผ่าน 99.5%! ✅', 'NG Rate: 0.5%', 'กำลังตรวจ lot #42', 'Customer complaint: 0'],
    speed: 0.8,
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    role: 'งานซ่อมบำรุง',
    emoji: '🔧',
    color: '#fbbf24',
    kpi: 'PM Compliance',
    value: 94.0,
    target: 90,
    unit: '%',
    messages: ['PM ครบ 94%! ✅', 'MTBF: 720 ชม.', 'MTTR: 2.1 ชม.', 'PM เสร็จแล้ว 3/3'],
    speed: 1.0,
  },
  {
    id: 'finance',
    name: 'Cost Manager',
    role: 'ควบคุมต้นทุน',
    emoji: '💰',
    color: '#f87171',
    kpi: 'Cost Variance',
    value: -3.2,
    target: 0,
    unit: '%',
    messages: ['ต้นทุนเกิน 3.2%! ⚠️', 'Budget: 2.1M', 'Actual: 2.17M', 'กำลังวิเคราะห์...'],
    speed: 1.5,
  },
  {
    id: 'delivery',
    name: 'Delivery Agent',
    role: 'ส่งมอบตรงเวลา',
    emoji: '🚚',
    color: '#c084fc',
    kpi: 'On-Time Delivery',
    value: 96.8,
    target: 95,
    unit: '%',
    messages: ['OTD: 96.8%! ✅', 'Shipment ครบ 24/25', 'Delay: 1 lot', 'กำลัง track order'],
    speed: 0.9,
  },
  {
    id: 'safety',
    name: 'Safety Officer',
    role: 'ความปลอดภัย',
    emoji: '⛑️',
    color: '#fb923c',
    kpi: 'Safety Score',
    value: 100,
    target: 100,
    unit: '%',
    messages: ['0 อุบัติเหตุ! ✅', 'Near miss: 0', 'PPE ครบ 100%', '45 วันปลอดภัย'],
    speed: 0.7,
  },
];

const MACHINES = [
  { x: '5%',  y: '10%', w: 80, h: 60,  label: 'CNC-01',   color: '#3dd65c', icon: '⚙️' },
  { x: '20%', y: '60%', w: 60, h: 80,  label: 'PRESS-A',  color: '#60a5fa', icon: '🔩' },
  { x: '68%', y: '12%', w: 70, h: 50,  label: 'WELD-02',  color: '#fbbf24', icon: '⚡' },
  { x: '78%', y: '62%', w: 65, h: 70,  label: 'ASSY-03',  color: '#c084fc', icon: '🔧' },
  { x: '42%', y: '72%', w: 90, h: 38,  label: 'CONVEYOR', color: '#fb923c', icon: '📦' },
  { x: '45%', y: '5%',  w: 70, h: 45,  label: 'INSP-01',  color: '#f472b6', icon: '🔍' },
];

function SpeechBubble({ message, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.85 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'absolute',
        bottom: '110%',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(8,8,12,0.88)',
        color: color,
        border: `1px solid ${color}`,
        borderRadius: 8,
        padding: '4px 9px',
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        boxShadow: `0 0 10px ${color}55`,
        zIndex: 20,
        letterSpacing: '0.03em',
      }}
    >
      {message}
      <div style={{
        position: 'absolute', bottom: -6, left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: `6px solid ${color}`,
      }} />
    </motion.div>
  );
}

function AgentSprite({ agent, floorWidth, floorHeight, onClick }) {
  const [pos, setPos] = useState({
    x: 60 + Math.random() * Math.max(floorWidth - 120, 1),
    y: 60 + Math.random() * Math.max(floorHeight - 140, 1),
  });
  const [msgIdx, setMsgIdx] = useState(0);
  const [showMsg, setShowMsg] = useState(true);
  const posRef = useRef(pos);
  const dirRef = useRef({
    x: (Math.random() - 0.5) * 2,
    y: (Math.random() - 0.5) * 2,
  });
  const animRef = useRef(null);
  const lastMsgRef = useRef(Date.now());

  useEffect(() => { posRef.current = pos; }, [pos]);

  useEffect(() => {
    if (floorWidth === 0 || floorHeight === 0) return;
    let lastTime = performance.now();
    const SPRITE_W = 56;
    const SPRITE_H = 76;

    const tick = (now) => {
      const dt = Math.min((now - lastTime) / 16, 3);
      lastTime = now;

      let { x, y } = posRef.current;
      let { x: dx, y: dy } = dirRef.current;

      x += dx * agent.speed * dt;
      y += dy * agent.speed * dt;

      let bounced = false;
      if (x < 4) { x = 4; dx = Math.abs(dx); bounced = true; }
      if (x > floorWidth - SPRITE_W) { x = floorWidth - SPRITE_W; dx = -Math.abs(dx); bounced = true; }
      if (y < 4) { y = 4; dy = Math.abs(dy); bounced = true; }
      if (y > floorHeight - SPRITE_H) { y = floorHeight - SPRITE_H; dy = -Math.abs(dy); bounced = true; }

      if (bounced || Math.random() < 0.004) {
        const angle = Math.random() * Math.PI * 2;
        dirRef.current = { x: Math.cos(angle), y: Math.sin(angle) };
      } else {
        dirRef.current = { x: dx, y: dy };
      }

      if (Date.now() - lastMsgRef.current > 2800) {
        lastMsgRef.current = Date.now();
        setShowMsg(false);
        setTimeout(() => {
          setMsgIdx(i => (i + 1) % agent.messages.length);
          setShowMsg(true);
        }, 180);
      }

      const newPos = { x, y };
      posRef.current = newPos;
      setPos(newPos);
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [agent, floorWidth, floorHeight]);

  const isGood = agent.id === 'finance' ? agent.value >= agent.target : agent.value >= agent.target;
  const statusColor = isGood ? '#4ade80' : '#f87171';

  return (
    <div
      onClick={() => onClick(agent)}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: 56,
        cursor: 'pointer',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 5,
        transition: 'filter 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'}
      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
    >
      <AnimatePresence mode="wait">
        {showMsg && <SpeechBubble key={msgIdx} message={agent.messages[msgIdx]} color={agent.color} />}
      </AnimatePresence>

      {/* KPI badge */}
      <div style={{
        background: isGood ? agent.color : '#f87171',
        color: '#000',
        fontSize: 9,
        fontWeight: 800,
        padding: '1px 6px',
        borderRadius: 4,
        marginBottom: 2,
        letterSpacing: '0.04em',
        boxShadow: `0 1px 4px ${isGood ? agent.color : '#f87171'}66`,
      }}>
        {agent.value}{agent.unit}
      </div>

      {/* Emoji sprite */}
      <div style={{
        fontSize: 30,
        lineHeight: 1,
        filter: `drop-shadow(0 2px 6px ${agent.color}99)`,
        animation: 'spriteWalk 0.5s steps(2) infinite',
      }}>
        {agent.emoji}
      </div>

      {/* Name tag */}
      <div style={{
        fontSize: 9,
        color: agent.color,
        fontWeight: 700,
        marginTop: 1,
        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
        textAlign: 'center',
        lineHeight: 1.2,
        letterSpacing: '0.02em',
      }}>
        {agent.name}
      </div>

      {/* Pulse dot */}
      <div style={{
        width: 6, height: 6,
        borderRadius: '50%',
        background: statusColor,
        marginTop: 2,
        boxShadow: `0 0 8px ${statusColor}`,
        animation: 'statusPulse 2s ease-in-out infinite',
      }} />
    </div>
  );
}

function AgentDetail({ agent, onClose }) {
  const isGood = agent.id === 'finance' ? agent.value >= 0 : agent.value >= agent.target;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 24 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontSize: 56, marginBottom: 6 }}>{agent.emoji}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: agent.color, lineHeight: 1 }}>{agent.name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{agent.role}</div>

        <div style={{
          background: isGood ? 'var(--green-dim)' : 'var(--red-dim)',
          border: `1px solid ${isGood ? 'var(--green)' : 'var(--red)'}`,
          borderRadius: 10,
          padding: '14px 20px',
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
            {agent.kpi}
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: isGood ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>
            {agent.value}{agent.unit}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>เป้าหมาย: {agent.target}{agent.unit}</div>
          <div style={{
            fontSize: 13, fontWeight: 700, marginTop: 6,
            color: isGood ? 'var(--green)' : 'var(--red)',
          }}>
            {isGood ? '✅ ผ่านเป้าหมาย' : '⚠️ ต่ำกว่าเป้าหมาย'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', marginBottom: 16 }}>
          {agent.messages.map((m, i) => (
            <div key={i} style={{
              fontSize: 13,
              padding: '7px 12px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
            }}>
              {m}
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            background: agent.color,
            color: '#000',
            border: 'none',
            borderRadius: 8,
            padding: '11px 24px',
            fontSize: 14,
            fontWeight: 800,
            width: '100%',
            letterSpacing: '0.04em',
          }}
        >
          ปิด
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function GameSim() {
  const [selected, setSelected] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const floorRef = useRef(null);

  useEffect(() => {
    const update = () => {
      if (floorRef.current) {
        setDimensions({
          width: floorRef.current.offsetWidth,
          height: floorRef.current.offsetHeight,
        });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (floorRef.current) ro.observe(floorRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{
      height: 'calc(100vh - 58px)',
      display: 'flex',
      flexDirection: 'column',
      padding: 14,
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>🎮</span>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', lineHeight: 1, margin: 0 }}>KPI Agent Sim</h1>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>แตะตัวละครเพื่อดูรายละเอียด KPI</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {AGENTS.map(a => {
            const good = a.id === 'finance' ? a.value >= 0 : a.value >= a.target;
            return (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px',
                  background: 'var(--card)',
                  border: `1px solid ${a.color}55`,
                  borderRadius: 20,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  color: good ? 'var(--green)' : 'var(--red)',
                }}
              >
                <span>{a.emoji}</span>
                <span>{a.value}{a.unit}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Factory floor */}
      <div
        ref={floorRef}
        style={{
          flex: 1,
          position: 'relative',
          background: 'var(--bg3)',
          border: '2px solid var(--border2)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: [
            'linear-gradient(var(--border) 1px, transparent 1px)',
            'linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: '40px 40px',
          opacity: 0.5,
        }} />

        {/* Machines */}
        {MACHINES.map((m, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: m.x, top: m.y,
            width: m.w, height: m.h,
            background: 'var(--bg2)',
            border: `2px solid ${m.color}66`,
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `inset 0 0 12px ${m.color}18, 0 0 8px ${m.color}22`,
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 16 }}>{m.icon}</div>
            <div style={{ fontSize: 8, color: m.color, fontWeight: 800, letterSpacing: '0.06em', marginTop: 2 }}>{m.label}</div>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: m.color,
              marginTop: 4,
              boxShadow: `0 0 8px ${m.color}`,
              animation: `statusPulse ${1.2 + i * 0.3}s ease-in-out infinite`,
            }} />
          </div>
        ))}

        {/* Agent sprites */}
        {dimensions.width > 0 && AGENTS.map(agent => (
          <AgentSprite
            key={agent.id}
            agent={agent}
            floorWidth={dimensions.width}
            floorHeight={dimensions.height}
            onClick={setSelected}
          />
        ))}

        {/* Watermark */}
        <div style={{
          position: 'absolute', bottom: 7, right: 12,
          fontSize: 9, color: 'var(--muted)', opacity: 0.6,
          pointerEvents: 'none',
          letterSpacing: '0.05em',
        }}>
          Thai Summit Group · Factory Floor Simulation
        </div>
      </div>

      <AnimatePresence>
        {selected && <AgentDetail agent={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>

      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.7); }
        }
        @keyframes spriteWalk {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}
