import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { loadAgents } from '../config/agentDefaults';

// ── Sprite sheet config ─────────────────────────────────────────
// ปรับค่า w/h ให้ตรงกับขนาดจริงของ sprites.png
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

const TYPE_ROW   = { engineer:0, manager:0, robot:1 };
const WALK_COLS  = { engineer:[0,1], manager:[0,4], robot:[0,2] };
const ASSET_COLS = { car:0, arm:1, charger:2, delivery:3, gear:4 };

// ── CSS sprite renderer ────────────────────────────────────
function SheetSprite({ col, row, size }) {
  const scale = size / SHEET.cw;
  return (
    <div style={{
      width: size,
      height: Math.round(SHEET.ch * scale),
      backgroundImage: `url(${SHEET.url})`,
      backgroundPosition: `${-(col * SHEET.cw * scale).toFixed(1)}px ${-(row * SHEET.ch * scale).toFixed(1)}px`,
      backgroundSize: `${(SHEET.w * scale).toFixed(1)}px ${(SHEET.h * scale).toFixed(1)}px`,
      backgroundRepeat: 'no-repeat',
    }}/>
  );
}

function SpriteChar({ type = 'engineer', frame = 0, size = 72 }) {
  const row  = TYPE_ROW[type]  ?? 0;
  const cols = WALK_COLS[type] ?? [0,1];
  return <SheetSprite col={cols[frame % cols.length]} row={row} size={size}/>;
}

function SpriteAsset({ assetKey, size = 80 }) {
  return <SheetSprite col={ASSET_COLS[assetKey] ?? 0} row={2} size={size}/>;
}

// ── Factory floor machines ───────────────────────────────
const MACHINES = [
  { x:'4%',  y:'4%',  asset:'car',      color:'#60a5fa', label:'HOLO CAR',       size:90 },
  { x:'70%', y:'4%',  asset:'gear',     color:'#3dd65c', label:'KPI BOARD',      size:68 },
  { x:'2%',  y:'54%', asset:'arm',      color:'#fb923c', label:'ARM-01',         size:78 },
  { x:'80%', y:'54%', asset:'arm',      color:'#c084fc', label:'ARM-02',         size:78 },
  { x:'38%', y:'64%', asset:'charger',  color:'#fbbf24', label:'CHARGE STA.',    size:72 },
  { x:'60%', y:'38%', asset:'delivery', color:'#34d399', label:'DELIVERY BOT',   size:72 },
];

// ── Speech bubble ──────────────────────────────────────
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
        borderRight:'5px solid transparent', borderTop:`6px solid ${color}` }}/>
    </motion.div>
  );
}

// ── Moving agent ───────────────────────────────────────
function AgentSprite({ agent, floorWidth, floorHeight, onClick }) {
  const [pos, setPos] = useState({
    x: 60 + Math.random() * Math.max(floorWidth - 140, 1),
    y: 60 + Math.random() * Math.max(floorHeight - 150, 1),
  });
  const [frame, setFrame] = useState(0);
  const [msgIdx, setMsgIdx]   = useState(0);
  const [showMsg, setShowMsg] = useState(true);
  const posRef    = useRef(pos);
  const dirRef    = useRef({ x:(Math.random()-.5)*2, y:(Math.random()-.5)*2 });
  const animRef   = useRef(null);
  const lastMsgRef = useRef(Date.now());

  useEffect(() => { posRef.current = pos; }, [pos]);

  // Walking frame toggle
  useEffect(() => {
    const id = setInterval(() => setFrame(f => 1 - f), 520);
    return () => clearInterval(id);
  }, []);

  // Movement loop
  useEffect(() => {
    if (!floorWidth || !floorHeight) return;
    let last = performance.now();
    const SPRITE_W = 80, SPRITE_H = 100;
    const tick = (now) => {
      const dt = Math.min((now - last) / 16, 3); last = now;
      let { x, y } = posRef.current;
      let { x:dx, y:dy } = dirRef.current;
      x += dx * agent.speed * dt;
      y += dy * agent.speed * dt;
      let bounced = false;
      if (x < 4)                  { x = 4;                  dx =  Math.abs(dx); bounced = true; }
      if (x > floorWidth - SPRITE_W)  { x = floorWidth - SPRITE_W;  dx = -Math.abs(dx); bounced = true; }
      if (y < 4)                  { y = 4;                  dy =  Math.abs(dy); bounced = true; }
      if (y > floorHeight - SPRITE_H) { y = floorHeight - SPRITE_H; dy = -Math.abs(dy); bounced = true; }
      if (bounced || Math.random() < .004) {
        const a = Math.random() * Math.PI * 2;
        dirRef.current = { x: Math.cos(a), y: Math.sin(a) };
      } else dirRef.current = { x: dx, y: dy };

      if (Date.now() - lastMsgRef.current > 2800) {
        lastMsgRef.current = Date.now();
        setShowMsg(false);
        setTimeout(() => { setMsgIdx(i => (i + 1) % agent.messages.length); setShowMsg(true); }, 180);
      }
      const np = { x, y }; posRef.current = np; setPos(np);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [agent, floorWidth, floorHeight]);

  const isGood = agent.value >= agent.target;
  const sc = isGood ? '#4ade80' : '#f87171';

  return (
    <div onClick={() => onClick(agent)}
      onMouseEnter={e => e.currentTarget.style.filter = `drop-shadow(0 0 10px ${agent.color}aa) brightness(1.1)`}
      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
      style={{
        position:'absolute', left:pos.x, top:pos.y,
        width:80, cursor:'pointer', userSelect:'none',
        display:'flex', flexDirection:'column', alignItems:'center',
        zIndex:5, transition:'filter .15s',
      }}
    >
      <AnimatePresence mode="wait">
        {showMsg && <SpeechBubble key={msgIdx} message={agent.messages[msgIdx]} color={agent.color}/>}
      </AnimatePresence>

      {/* KPI badge */}
      <div style={{
        background: isGood ? agent.color : '#f87171', color:'#000',
        fontSize:9, fontWeight:800, padding:'1px 7px', borderRadius:4, marginBottom:2,
        boxShadow:`0 1px 6px ${isGood ? agent.color : '#f87171'}55`,
      }}>{agent.value}{agent.unit}</div>

      {/* Sprite from sheet */}
      <SpriteChar type={agent.type} frame={frame} size={72}/>

      {/* Name */}
      <div style={{
        fontSize:9, color:agent.color, fontWeight:700, marginTop:1,
        textShadow:'0 1px 4px rgba(0,0,0,.9)', textAlign:'center', lineHeight:1.2,
      }}>{agent.name}</div>

      {/* Status dot */}
      <div style={{
        width:6, height:6, borderRadius:'50%', background:sc,
        marginTop:2, boxShadow:`0 0 8px ${sc}`,
        animation:'statusPulse 2s ease-in-out infinite',
      }}/>
    </div>
  );
}

// ── Detail modal ───────────────────────────────────────
function AgentDetail({ agent, onClose }) {
  const isGood = agent.value >= agent.target;
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="overlay" onClick={onClose}>
      <motion.div
        initial={{scale:.85,y:24}} animate={{scale:1,y:0}} exit={{scale:.85,y:24}}
        transition={{type:'spring',stiffness:340,damping:28}}
        className="modal" onClick={e=>e.stopPropagation()} style={{textAlign:'center'}}
      >
        {/* Big sprite preview */}
        <div style={{display:'flex',justifyContent:'center',marginBottom:10}}>
          <SpriteChar type={agent.type} frame={0} size={96}/>
        </div>
        <div style={{fontSize:20,fontWeight:800,color:agent.color}}>{agent.name}</div>
        <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>{agent.role}</div>

        <div style={{
          background:isGood?'var(--green-dim)':'var(--red-dim)',
          border:`1px solid ${isGood?'var(--green)':'var(--red)'}`,
          borderRadius:10, padding:'12px 20px', marginBottom:12,
        }}>
          <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:3}}>{agent.kpi}</div>
          <div style={{fontSize:38,fontWeight:900,color:isGood?'var(--green)':'var(--red)',lineHeight:1}}>{agent.value}{agent.unit}</div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>เป้าหมาย {agent.target}{agent.unit}</div>
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
          borderRadius:8,padding:'11px 24px',fontSize:14,fontWeight:800,width:'100%'}}>ปิด</button>
      </motion.div>
    </motion.div>
  );
}

// ── Main page ───────────────────────────────────────────
export default function GameSim() {
  const [agents]   = useState(loadAgents);
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
              <p style={{fontSize:11,color:'var(--muted)',margin:0}}>แตะตัวละครเพื่อดู KPI · sprite จาก sprites.png</p>
            </div>
          </div>
          <Link to="/agentsetup" style={{display:'flex',alignItems:'center',gap:5,
            padding:'6px 12px',background:'var(--accent-dim)',border:'1px solid var(--accent)',
            borderRadius:8,textDecoration:'none',fontSize:12,fontWeight:700,color:'var(--accent)'}}>
            ⚙️ ตั้งค่า Agent
          </Link>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {agents.map(a => {
            const good = a.value >= a.target;
            return (
              <button key={a.id} onClick={()=>setSelected(a)} style={{
                display:'flex',alignItems:'center',gap:5,padding:'3px 9px',
                background:'var(--card)',border:`1px solid ${a.color}50`,
                borderRadius:20,cursor:'pointer',fontSize:11,fontWeight:600,
                color:good?'var(--green)':'var(--red)'}}>
                <span style={{fontSize:13}}>{a.type==='robot'?'🤖':a.type==='engineer'?'👷':'💼'}</span>
                <span>{a.value}{a.unit}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Factory floor */}
      <div ref={floorRef} style={{
        flex:1, position:'relative', background:'var(--bg3)',
        border:'2px solid var(--border2)', borderRadius:12, overflow:'hidden', boxShadow:'var(--shadow-md)',
      }}>
        {/* Grid */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
          backgroundSize:'40px 40px', opacity:.5,
        }}/>

        {/* Factory machines using real sprites */}
        {MACHINES.map((m,i) => (
          <div key={i} style={{
            position:'absolute', left:m.x, top:m.y, pointerEvents:'none',
            display:'flex', flexDirection:'column', alignItems:'center',
            filter:`drop-shadow(0 0 8px ${m.color}55)`,
          }}>
            <SpriteAsset assetKey={m.asset} size={m.size}/>
            <div style={{fontSize:8,color:m.color,fontWeight:800,
              letterSpacing:'.06em',marginTop:2,textAlign:'center',
              textShadow:'0 1px 3px rgba(0,0,0,.8)'}}>{m.label}</div>
          </div>
        ))}

        {/* Agent sprites */}
        {dims.width > 0 && agents.map(a => (
          <AgentSprite key={a.id} agent={a}
            floorWidth={dims.width} floorHeight={dims.height}
            onClick={setSelected}/>
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
      `}</style>
    </div>
  );
}
