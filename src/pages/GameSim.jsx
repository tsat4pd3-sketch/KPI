import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { loadAgents } from '../config/agentDefaults';

/* ── Pixar-style SVG Sprites ─────────────────────────── */
function RobotSprite({ color = '#60a5fa', uid = 'r' }) {
  const [h, b, gl] = [`rh${uid}`, `rb${uid}`, `gl${uid}`];
  return (
    <svg width="48" height="67" viewBox="0 0 48 67" fill="none">
      <defs>
        <linearGradient id={h} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f0f6ff"/><stop offset="1" stopColor="#c8d8ec"/></linearGradient>
        <linearGradient id={b} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e4eef8"/><stop offset="1" stopColor="#b0c4d8"/></linearGradient>
        <filter id={gl}><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Antenna */}
      <rect x="22" y="0" width="4" height="7" rx="2" fill={color} opacity=".7"/>
      <circle cx="24" cy="2" r="3" fill={color}/>
      <circle cx="24" cy="2" r="1.2" fill="white" opacity=".8"/>
      {/* Head */}
      <rect x="7" y="7" width="34" height="24" rx="9" fill={`url(#${h})`} stroke={color} strokeWidth=".8"/>
      <ellipse cx="18" cy="11" rx="9" ry="3.5" fill="white" opacity=".35"/>
      {/* Eye screen */}
      <rect x="11" y="11" width="26" height="16" rx="5" fill="#040d1e"/>
      {/* Eyes */}
      <circle cx="20" cy="19" r="4.5" fill={color} opacity=".9" filter={`url(#${gl})`}/>
      <circle cx="28" cy="19" r="4.5" fill={color} opacity=".9" filter={`url(#${gl})`}/>
      <circle cx="20" cy="19" r="2.2" fill="white"/>
      <circle cx="28" cy="19" r="2.2" fill="white"/>
      <circle cx="21" cy="18" r=".9" fill={color}/>
      <circle cx="29" cy="18" r=".9" fill={color}/>
      <path d="M17 25 Q24 28 31 25" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".7"/>
      {/* Neck */}
      <rect x="19" y="31" width="10" height="6" rx="3" fill="#c0d0e0"/>
      {/* Body */}
      <rect x="5" y="37" width="38" height="22" rx="7" fill={`url(#${b})`} stroke={color} strokeWidth=".6"/>
      <ellipse cx="16" cy="41" rx="9" ry="3" fill="white" opacity=".25"/>
      <rect x="12" y="41" width="24" height="13" rx="4" fill="#040d1e"/>
      <circle cx="18" cy="47" r="2.2" fill={color} opacity=".9"/>
      <circle cx="24" cy="47" r="2.2" fill={color} opacity=".55"/>
      <circle cx="30" cy="47" r="2.2" fill={color} opacity=".25"/>
      <rect x="14" y="52" width="20" height="1.5" rx=".75" fill="#0a1a30"/>
      <rect x="14" y="52" width="13" height="1.5" rx=".75" fill={color} opacity=".7"/>
      {/* Arms */}
      <rect x="0" y="37" width="5" height="16" rx="2.5" fill="#ccdde8"/>
      <rect x="43" y="37" width="5" height="16" rx="2.5" fill="#ccdde8"/>
      <circle cx="2.5" cy="55" r="3.5" fill="#d8e8f4"/>
      <circle cx="45.5" cy="55" r="3.5" fill="#d8e8f4"/>
      {/* Legs */}
      <rect x="11" y="59" width="11" height="8" rx="3" fill="#b0c0d0"/>
      <rect x="26" y="59" width="11" height="8" rx="3" fill="#b0c0d0"/>
    </svg>
  );
}

function EngineerSprite({ color = '#fb923c', uid = 'e' }) {
  const [h, b] = [`eh${uid}`, `eb${uid}`];
  return (
    <svg width="48" height="67" viewBox="0 0 48 67" fill="none">
      <defs>
        <linearGradient id={h} x1="0" y1="0" x2="1" y2="1"><stop stopColor={color}/><stop offset="1" stopColor={color} stopOpacity=".6"/></linearGradient>
        <linearGradient id={b} x1="0" y1="0" x2="1" y2="1"><stop stopColor={color}/><stop offset="1" stopColor={color} stopOpacity=".55"/></linearGradient>
      </defs>
      {/* Hard hat */}
      <ellipse cx="24" cy="8" rx="15" ry="5.5" fill={`url(#${h})`}/>
      <rect x="9" y="6" width="30" height="8" rx="4" fill={`url(#${h})`}/>
      <rect x="7" y="12" width="34" height="2.5" rx="1.25" fill={color} opacity=".45"/>
      <ellipse cx="17" cy="8" rx="6" ry="2.5" fill="white" opacity=".35"/>
      {/* Head */}
      <circle cx="24" cy="23" r="12" fill="#f5c99a"/>
      <ellipse cx="19" cy="18" rx="7" ry="3.5" fill="#fad9b4" opacity=".5"/>
      <circle cx="20" cy="22" r="2" fill="#4a2810"/>
      <circle cx="28" cy="22" r="2" fill="#4a2810"/>
      <circle cx="21" cy="21.2" r=".8" fill="white" opacity=".8"/>
      <circle cx="29" cy="21.2" r=".8" fill="white" opacity=".8"/>
      <path d="M20 27 Q24 30.5 28 27" stroke="#4a2810" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M18 19 Q20 17.5 22 19" stroke="#4a2810" strokeWidth=".9" strokeLinecap="round" fill="none"/>
      <path d="M26 19 Q28 17.5 30 19" stroke="#4a2810" strokeWidth=".9" strokeLinecap="round" fill="none"/>
      {/* Body polo */}
      <rect x="10" y="35" width="28" height="22" rx="6" fill={`url(#${b})`}/>
      <path d="M17 35 L24 42 L31 35" stroke="white" strokeWidth="2" fill="none" strokeLinejoin="round"/>
      <rect x="23" y="42" width="2" height="12" rx="1" fill="white" opacity=".2"/>
      <ellipse cx="16" cy="39" rx="5" ry="3" fill="white" opacity=".18"/>
      {/* Arms */}
      <rect x="2" y="35" width="8" height="17" rx="4" fill={color} opacity=".8"/>
      <rect x="38" y="35" width="8" height="17" rx="4" fill={color} opacity=".8"/>
      <circle cx="6" cy="54" r="4" fill="#f5c99a"/>
      <circle cx="42" cy="54" r="4" fill="#f5c99a"/>
      {/* Belt */}
      <rect x="10" y="56" width="28" height="3" rx="1.5" fill="#3a2510"/>
      <rect x="22" y="56" width="4" height="3" rx="1" fill="#c9963a"/>
      {/* Jeans */}
      <rect x="11" y="57" width="12" height="10" rx="3" fill="#2d4da0"/>
      <rect x="25" y="57" width="12" height="10" rx="3" fill="#2d4da0"/>
      <line x1="17" y1="57" x2="17" y2="67" stroke="#3d5db0" strokeWidth=".8"/>
      <line x1="31" y1="57" x2="31" y2="67" stroke="#3d5db0" strokeWidth=".8"/>
    </svg>
  );
}

function ManagerSprite({ color = '#fbbf24', uid = 'm' }) {
  const b = `mb${uid}`;
  return (
    <svg width="48" height="67" viewBox="0 0 48 67" fill="none">
      <defs>
        <linearGradient id={b} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f0f4fc"/><stop offset="1" stopColor="#d0d8ec"/></linearGradient>
      </defs>
      {/* Hair */}
      <ellipse cx="24" cy="11" rx="13" ry="7" fill="#2a1a0a"/>
      <rect x="11" y="10" width="26" height="5" rx="2.5" fill="#2a1a0a"/>
      {/* Head */}
      <circle cx="24" cy="23" r="12" fill="#f5c99a"/>
      <ellipse cx="19" cy="18" rx="7" ry="3.5" fill="#fad9b4" opacity=".45"/>
      {/* Glasses */}
      <circle cx="20" cy="22" r="4" fill="none" stroke="#3a2a1a" strokeWidth="1.1"/>
      <circle cx="30" cy="22" r="4" fill="none" stroke="#3a2a1a" strokeWidth="1.1"/>
      <line x1="24" y1="22" x2="26" y2="22" stroke="#3a2a1a" strokeWidth="1.1"/>
      <line x1="11" y1="21" x2="16" y2="21" stroke="#3a2a1a" strokeWidth="1.1"/>
      <line x1="34" y1="21" x2="37" y2="21" stroke="#3a2a1a" strokeWidth="1.1"/>
      <circle cx="20" cy="22" r="2.2" fill="#d0e8f8" opacity=".35"/>
      <circle cx="30" cy="22" r="2.2" fill="#d0e8f8" opacity=".35"/>
      <path d="M20 28 Q24 31 28 28" stroke="#3a2a1a" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* White shirt */}
      <rect x="10" y="35" width="28" height="24" rx="6" fill={`url(#${b})`}/>
      <ellipse cx="16" cy="39" rx="5.5" ry="3" fill="white" opacity=".5"/>
      {/* Tie */}
      <path d="M22 35 L20 46 L24 51 L28 46 L26 35 Z" fill={color}/>
      <path d="M22 35 L24 38 L26 35" fill={color} opacity=".6"/>
      <line x1="23" y1="37" x2="21.5" y2="44" stroke="white" strokeWidth=".8" strokeLinecap="round" opacity=".45"/>
      {/* Arms */}
      <rect x="2" y="35" width="8" height="17" rx="4" fill="#e0e8f4"/>
      <rect x="38" y="35" width="8" height="17" rx="4" fill="#e0e8f4"/>
      <circle cx="6" cy="54" r="4" fill="#f5c99a"/>
      <circle cx="42" cy="54" r="4" fill="#f5c99a"/>
      {/* Pants */}
      <rect x="10" y="57" width="28" height="2" rx="1" fill="#1a2a3a"/>
      <rect x="11" y="57" width="12" height="10" rx="3" fill="#1a2a3a"/>
      <rect x="25" y="57" width="12" height="10" rx="3" fill="#1a2a3a"/>
    </svg>
  );
}

/* ── Factory SVG Assets ──────────────────────────────── */
function HoloCar() {
  return (
    <svg width="110" height="62" viewBox="0 0 110 62">
      <rect x="5" y="28" width="100" height="24" rx="5" fill="#001530" stroke="#00cfff" strokeWidth="1"/>
      <path d="M25 28 L34 10 L76 10 L85 28" stroke="#00cfff" strokeWidth="1.5" fill="#001530"/>
      <line x1="5" y1="39" x2="105" y2="39" stroke="#00cfff" strokeWidth=".4" opacity=".5"/>
      <line x1="5" y1="50" x2="105" y2="50" stroke="#00cfff" strokeWidth=".4" opacity=".5"/>
      <line x1="40" y1="28" x2="40" y2="52" stroke="#00cfff" strokeWidth=".4" opacity=".4"/>
      <line x1="60" y1="28" x2="60" y2="52" stroke="#00cfff" strokeWidth=".4" opacity=".4"/>
      <line x1="50" y1="10" x2="50" y2="28" stroke="#00cfff" strokeWidth=".4" opacity=".4"/>
      <circle cx="27" cy="52" r="10" fill="#001530" stroke="#00cfff" strokeWidth="1.2"/>
      <circle cx="83" cy="52" r="10" fill="#001530" stroke="#00cfff" strokeWidth="1.2"/>
      <circle cx="27" cy="52" r="4" stroke="#00cfff" strokeWidth=".8" fill="none"/>
      <circle cx="83" cy="52" r="4" stroke="#00cfff" strokeWidth=".8" fill="none"/>
      <rect x="5" y="28" width="100" height="24" rx="5" stroke="#00cfff" strokeWidth="3" fill="none" opacity=".1"/>
    </svg>
  );
}

function RoboticArm({ color = '#fb923c' }) {
  return (
    <svg width="54" height="70" viewBox="0 0 54 70">
      <rect x="11" y="60" width="32" height="10" rx="4" fill="#1a2a3a"/>
      <rect x="19" y="54" width="16" height="8" rx="3" fill="#243444"/>
      <rect x="23" y="32" width="8" height="24" rx="4" fill={color} opacity=".8"/>
      <circle cx="27" cy="34" r="6" fill="#1a2a3a"/>
      <circle cx="27" cy="34" r="3" fill={color}/>
      <g transform="rotate(-25 27 28)"><rect x="23" y="12" width="8" height="22" rx="4" fill={color} opacity=".65"/></g>
      <circle cx="25" cy="24" r="6" fill="#1a2a3a"/>
      <circle cx="25" cy="24" r="3" fill={color} opacity=".8"/>
      <rect x="10" y="4" width="5" height="13" rx="2.5" fill="#60a5fa" transform="rotate(18 12.5 10)"/>
      <rect x="21" y="2" width="5" height="13" rx="2.5" fill="#60a5fa" transform="rotate(-18 23.5 8)"/>
      <circle cx="27" cy="65" r="3" fill="#4ade80" opacity=".9"/>
    </svg>
  );
}

function MonitorChart({ color = '#3dd65c' }) {
  return (
    <svg width="72" height="76" viewBox="0 0 72 76">
      <rect x="31" y="64" width="10" height="8" rx="2" fill="#243444"/>
      <rect x="22" y="70" width="28" height="4" rx="2" fill="#1a2a3a"/>
      <rect x="2" y="2" width="68" height="64" rx="6" fill="#0a1520" stroke="#243444" strokeWidth="2"/>
      <rect x="6" y="6" width="60" height="56" rx="4" fill="#060d1a"/>
      <rect x="12" y="44" width="7" height="12" rx="1" fill={color} opacity=".6"/>
      <rect x="22" y="34" width="7" height="22" rx="1" fill={color} opacity=".75"/>
      <rect x="32" y="26" width="7" height="30" rx="1" fill={color}/>
      <rect x="42" y="30" width="7" height="26" rx="1" fill={color} opacity=".85"/>
      <rect x="52" y="20" width="7" height="36" rx="1" fill={color}/>
      <path d="M12 40 L22 30 L32 23 L42 27 L52 17 L62 13" stroke="#60a5fa" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <circle cx="62" cy="13" r="2.5" fill="#60a5fa"/>
      <line x1="8" y1="56" x2="64" y2="56" stroke="#243444" strokeWidth=".6"/>
      <circle cx="59" cy="57" r="2" fill={color}/>
    </svg>
  );
}

function EngineBlock() {
  return (
    <svg width="90" height="50" viewBox="0 0 90 50">
      <rect x="5" y="12" width="80" height="34" rx="5" fill="#1a2a3a" stroke="#4a5a6a" strokeWidth="1.5"/>
      <path d="M5 12 L15 4 L85 4 L85 12" stroke="#5a6a7a" strokeWidth="1" fill="#243444"/>
      {[18,36,54,72].map((x,i) => <g key={i}>
        <ellipse cx={x} cy="12" rx="9" ry="4" fill="#2a3a4a" stroke="#5a6a7a" strokeWidth="1"/>
        <ellipse cx={x} cy="12" rx="5" ry="2.5" fill="#fb923c" opacity=".35"/>
        <circle cx={x} cy="12" r="2" fill="#fb923c" opacity=".6"/>
      </g>)}
      {[10,25,45,65,80].map((x,i) => <circle key={i} cx={x} cy="42" r="2.5" fill="#4a5a6a" stroke="#5a6a7a" strokeWidth=".8"/>)}
      <rect x="25" y="20" width="40" height="14" rx="3" fill="#0a1520"/>
      <rect x="27" y="22" width="26" height="3" rx="1.5" fill="#fb923c" opacity=".4"/>
      <rect x="27" y="27" width="18" height="3" rx="1.5" fill="#fb923c" opacity=".25"/>
    </svg>
  );
}

const MACHINES = [
  { x:'4%',  y:'6%',  type:'monitor', color:'#3dd65c', label:'KPI BOARD' },
  { x:'72%', y:'6%',  type:'monitor', color:'#60a5fa', label:'OEE SCREEN' },
  { x:'2%',  y:'54%', type:'arm',     color:'#fb923c', label:'ARM-01' },
  { x:'80%', y:'54%', type:'arm',     color:'#c084fc', label:'ARM-02' },
  { x:'36%', y:'66%', type:'engine',  color:'#fbbf24', label:'ENGINE' },
  { x:'36%', y:'2%',  type:'car',     color:'#00cfff', label:'HOLO CAR' },
];

/* ── Speech bubble ────────────────────────────────────── */
function SpeechBubble({ message, color }) {
  return (
    <motion.div
      initial={{ opacity:0, y:6, scale:.85 }}
      animate={{ opacity:1, y:0, scale:1 }}
      exit={{ opacity:0, y:-4, scale:.85 }}
      transition={{ duration:.18 }}
      style={{
        position:'absolute', bottom:'110%', left:'50%', transform:'translateX(-50%)',
        background:'rgba(6,8,14,0.92)', color, border:`1px solid ${color}`,
        borderRadius:8, padding:'4px 9px', fontSize:10, fontWeight:700,
        whiteSpace:'nowrap', pointerEvents:'none',
        boxShadow:`0 0 10px ${color}55`, zIndex:20, letterSpacing:'.03em',
      }}
    >
      {message}
      <div style={{ position:'absolute', bottom:-6, left:'50%', transform:'translateX(-50%)',
        width:0, height:0, borderLeft:'5px solid transparent',
        borderRight:'5px solid transparent', borderTop:`6px solid ${color}` }} />
    </motion.div>
  );
}

/* ── Moving agent on the floor ────────────────────────── */
function AgentSprite({ agent, floorWidth, floorHeight, onClick }) {
  const [pos, setPos] = useState({ x:60+Math.random()*Math.max(floorWidth-140,1), y:60+Math.random()*Math.max(floorHeight-150,1) });
  const [msgIdx, setMsgIdx] = useState(0);
  const [showMsg, setShowMsg] = useState(true);
  const posRef = useRef(pos);
  const dirRef = useRef({ x:(Math.random()-.5)*2, y:(Math.random()-.5)*2 });
  const animRef = useRef(null);
  const lastMsgRef = useRef(Date.now());

  useEffect(() => { posRef.current = pos; }, [pos]);

  useEffect(() => {
    if (!floorWidth || !floorHeight) return;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now-last)/16, 3); last = now;
      let { x, y } = posRef.current;
      let { x:dx, y:dy } = dirRef.current;
      x += dx * agent.speed * dt;
      y += dy * agent.speed * dt;
      let bounced = false;
      if (x < 4)              { x = 4;              dx =  Math.abs(dx); bounced=true; }
      if (x > floorWidth-62)  { x = floorWidth-62;  dx = -Math.abs(dx); bounced=true; }
      if (y < 4)              { y = 4;              dy =  Math.abs(dy); bounced=true; }
      if (y > floorHeight-82) { y = floorHeight-82; dy = -Math.abs(dy); bounced=true; }
      if (bounced || Math.random()<.004) {
        const a = Math.random()*Math.PI*2;
        dirRef.current = { x:Math.cos(a), y:Math.sin(a) };
      } else dirRef.current = { x:dx, y:dy };
      if (Date.now()-lastMsgRef.current > 2800) {
        lastMsgRef.current = Date.now();
        setShowMsg(false);
        setTimeout(() => { setMsgIdx(i=>(i+1)%agent.messages.length); setShowMsg(true); }, 180);
      }
      const np={x,y}; posRef.current=np; setPos(np);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [agent, floorWidth, floorHeight]);

  const isGood = agent.value >= agent.target;
  const Sprite = agent.type==='robot' ? RobotSprite : agent.type==='engineer' ? EngineerSprite : ManagerSprite;

  return (
    <div onClick={()=>onClick(agent)}
      onMouseEnter={e=>e.currentTarget.style.filter=`brightness(1.2) drop-shadow(0 0 8px ${agent.color}88)`}
      onMouseLeave={e=>e.currentTarget.style.filter='none'}
      style={{ position:'absolute', left:pos.x, top:pos.y, width:62, cursor:'pointer',
        userSelect:'none', display:'flex', flexDirection:'column', alignItems:'center',
        zIndex:5, transition:'filter .15s' }}
    >
      <AnimatePresence mode="wait">
        {showMsg && <SpeechBubble key={msgIdx} message={agent.messages[msgIdx]} color={agent.color}/>}
      </AnimatePresence>
      <div style={{ background:isGood?agent.color:'#f87171', color:'#000',
        fontSize:9, fontWeight:800, padding:'1px 7px', borderRadius:4, marginBottom:2,
        boxShadow:`0 1px 6px ${isGood?agent.color:'#f87171'}55` }}>
        {agent.value}{agent.unit}
      </div>
      <div style={{ animation:'spriteWalk .55s ease-in-out infinite alternate' }}>
        <Sprite color={agent.color} uid={agent.id}/>
      </div>
      <div style={{ fontSize:9, color:agent.color, fontWeight:700, marginTop:2,
        textShadow:'0 1px 4px rgba(0,0,0,.9)', textAlign:'center', lineHeight:1.2 }}>
        {agent.name}
      </div>
      <div style={{ width:6, height:6, borderRadius:'50%',
        background:isGood?'#4ade80':'#f87171', marginTop:2,
        boxShadow:`0 0 8px ${isGood?'#4ade80':'#f87171'}`,
        animation:'statusPulse 2s ease-in-out infinite' }}/>
    </div>
  );
}

/* ── Detail modal ─────────────────────────────────────── */
function AgentDetail({ agent, onClose }) {
  const isGood = agent.value >= agent.target;
  const Sprite = agent.type==='robot' ? RobotSprite : agent.type==='engineer' ? EngineerSprite : ManagerSprite;
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="overlay" onClick={onClose}>
      <motion.div
        initial={{scale:.85,y:24}} animate={{scale:1,y:0}} exit={{scale:.85,y:24}}
        transition={{type:'spring',stiffness:340,damping:28}}
        className="modal" onClick={e=>e.stopPropagation()} style={{textAlign:'center'}}
      >
        <div style={{display:'flex',justifyContent:'center',marginBottom:8}}>
          <Sprite color={agent.color} uid={`${agent.id}m`}/>
        </div>
        <div style={{fontSize:20,fontWeight:800,color:agent.color}}>{agent.name}</div>
        <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>{agent.role}</div>
        <div style={{ background:isGood?'var(--green-dim)':'var(--red-dim)',
          border:`1px solid ${isGood?'var(--green)':'var(--red)'}`,
          borderRadius:10, padding:'12px 20px', marginBottom:12 }}>
          <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:3}}>{agent.kpi}</div>
          <div style={{fontSize:38,fontWeight:900,color:isGood?'var(--green)':'var(--red)',lineHeight:1}}>{agent.value}{agent.unit}</div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>{`เป้าหมาย ${agent.target}${agent.unit}`}</div>
          <div style={{fontSize:12,fontWeight:700,marginTop:5,color:isGood?'var(--green)':'var(--red)'}}>
            {isGood?'✅ ผ่านเป้าหมาย':'⚠️ ต่ำกว่าเป้าหมาย'}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:5,textAlign:'left',marginBottom:14}}>
          {agent.messages.map((m,i)=>(
            <div key={i} style={{fontSize:13,padding:'6px 12px',
              background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text)'}}>{m}</div>
          ))}
        </div>
        <button onClick={onClose} style={{background:agent.color,color:'#000',border:'none',
          borderRadius:8,padding:'11px 24px',fontSize:14,fontWeight:800,width:'100%'}}>
          {`ปิด`}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ── Main page ─────────────────────────────────────────── */
export default function GameSim() {
  const [agents] = useState(loadAgents);
  const [selected, setSelected] = useState(null);
  const [dims, setDims] = useState({ width:0, height:0 });
  const floorRef = useRef(null);

  useEffect(() => {
    const update = () => {
      if (floorRef.current)
        setDims({ width:floorRef.current.offsetWidth, height:floorRef.current.offsetHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    if (floorRef.current) ro.observe(floorRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{height:'calc(100vh - 58px)',display:'flex',flexDirection:'column',padding:14,overflow:'hidden',boxSizing:'border-box'}}>
      {/* Header */}
      <div style={{marginBottom:10,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:22}}>🎮</span>
            <div>
              <h1 style={{fontSize:17,fontWeight:800,color:'var(--text)',lineHeight:1,margin:0}}>KPI Agent Sim</h1>
              <p style={{fontSize:11,color:'var(--muted)',margin:0}}>Pixar-style agents — แตะตัวละครเพื่อดู KPI</p>
            </div>
          </div>
          <Link to="/agentsetup" style={{display:'flex',alignItems:'center',gap:5,
            padding:'6px 12px',background:'var(--accent-dim)',border:'1px solid var(--accent)',
            borderRadius:8,textDecoration:'none',fontSize:12,fontWeight:700,color:'var(--accent)'}}>
            ⚙️ ตั้งค่า Agent
          </Link>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {agents.map(a=>{
            const good=a.value>=a.target;
            return (
              <button key={a.id} onClick={()=>setSelected(a)} style={{
                display:'flex',alignItems:'center',gap:5,padding:'3px 9px',
                background:'var(--card)',border:`1px solid ${a.color}50`,
                borderRadius:20,cursor:'pointer',fontSize:11,fontWeight:600,
                color:good?'var(--green)':'var(--red)'}}>
                <span style={{fontSize:14}}>{a.type==='robot'?'🤖':a.type==='engineer'?'👷':'💼'}</span>
                <span>{a.value}{a.unit}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floor */}
      <div ref={floorRef} style={{flex:1,position:'relative',background:'var(--bg3)',
        border:'2px solid var(--border2)',borderRadius:12,overflow:'hidden',boxShadow:'var(--shadow-md)'}}>
        <div style={{position:'absolute',inset:0,
          backgroundImage:'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
          backgroundSize:'40px 40px',opacity:.5}}/>
        {MACHINES.map((m,i)=>(
          <div key={i} style={{position:'absolute',left:m.x,top:m.y,pointerEvents:'none',
            filter:`drop-shadow(0 0 8px ${m.color}44)`}}>
            {m.type==='monitor' && <MonitorChart color={m.color}/>}
            {m.type==='arm'     && <RoboticArm   color={m.color}/>}
            {m.type==='engine'  && <EngineBlock/>}
            {m.type==='car'     && <HoloCar/>}
            <div style={{fontSize:8,color:m.color,fontWeight:800,textAlign:'center',letterSpacing:'.06em',marginTop:2}}>{m.label}</div>
          </div>
        ))}
        {dims.width>0 && agents.map(a=>(
          <AgentSprite key={a.id} agent={a} floorWidth={dims.width} floorHeight={dims.height} onClick={setSelected}/>
        ))}
        <div style={{position:'absolute',bottom:7,right:12,fontSize:9,color:'var(--muted)',opacity:.5}}>
          Thai Summit Group · Factory Floor Simulation
        </div>
      </div>

      <AnimatePresence>
        {selected && <AgentDetail agent={selected} onClose={()=>setSelected(null)}/>}
      </AnimatePresence>

      <style>{`
        @keyframes statusPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.7)} }
        @keyframes spriteWalk  { from{transform:translateY(0)} to{transform:translateY(-3px)} }
      `}</style>
    </div>
  );
}
