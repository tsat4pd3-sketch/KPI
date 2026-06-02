import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { loadAgents } from '../config/agentDefaults';

// ── Sprite sheet 1: engineer character ────────────────────────────
// Upload as public/sprites.png
// Row 0: stand | walk | hold-tablet | point-tablet | blueprint
// Row 1: study-blueprint | carry-battery | carry-stand | hold-scan | car-scan
// Row 2: battery | gears | tablet | multi-tool | gears-lightning
// ← Adjust w/h after upload to match actual image size
const SHEET = {
  url: '/sprites.png',
  cols: 5, rows: 3,
  w: 1500, h: 900,
  get cw() { return this.w / this.cols; },
  get ch() { return this.h / this.rows; },
};

// ── Sprite sheet 2: factory machines ────────────────────────────
// Upload as public/sprites2.png
// Row 0: car | conveyor/AGV | battery-station | robot-arm
// Row 1: engineer+machine scenes
// Row 2: small icons
// ← Adjust w/h after upload to match actual image size
const SHEET2 = {
  url: '/sprites2.png',
  cols: 4, rows: 3,
  w: 1480, h: 870,
  get cw() { return this.w / this.cols; },
  get ch() { return this.h / this.rows; },
};

const TYPE_ROW  = { engineer: 0, manager: 0, robot: 0 };
const WALK_COLS = { engineer: [0, 1], manager: [0, 1], robot: [0, 1] };
const WORK_COL  = { engineer: 2, manager: 3, robot: 2 };

// Factory machines → mapped to SHEET2 row 0
const MACHINES = [
  { x:'8%',  y:'27%', s2col:0, s2row:0, color:'#60a5fa', label:'EV BODY',      task:'ตรวจสอบตัวถัง',  size:90 },
  { x:'68%', y:'27%', s2col:3, s2row:0, color:'#fb923c', label:'ROBOT ARM',    task:'เชื่อมอัตโนมัติ', size:80 },
  { x:'5%',  y:'60%', s2col:2, s2row:0, color:'#fbbf24', label:'BATTERY STA.', task:'ชาร์จพลังงาน',  size:85 },
  { x:'76%', y:'58%', s2col:1, s2row:0, color:'#34d399', label:'AGV LINE',     task:'ส่งชิ้นส่วน',    size:95 },
  { x:'37%', y:'70%', s2col:2, s2row:0, color:'#c084fc', label:'CHARGE STA.',  task:'ตรวจสอบแบต',    size:75 },
  { x:'54%', y:'44%', s2col:0, s2row:0, color:'#7dd3fc', label:'BODY LINE',    task:'ตรวจ QC ตัวถัง',  size:80 },
];

const AGENT_STATE = { IDLE:'idle', GOING:'going', WORKING:'working', LEAVING:'leaving' };

// ── CSS sprite renderers ──────────────────────────────────────────
function SheetSprite({ col, row, size, flipX = false, sheet = SHEET }) {
  const scale = size / sheet.cw;
  return (
    <div style={{
      width: size,
      height: Math.round(sheet.ch * scale),
      backgroundImage: `url(${sheet.url})`,
      backgroundPosition: `${-(col * sheet.cw * scale).toFixed(1)}px ${-(row * sheet.ch * scale).toFixed(1)}px`,
      backgroundSize: `${(sheet.w * scale).toFixed(1)}px ${(sheet.h * scale).toFixed(1)}px`,
      backgroundRepeat: 'no-repeat',
      transform: flipX ? 'scaleX(-1)' : 'none',
    }} />
  );
}

function SpriteChar({ type = 'engineer', frame = 0, working = false, size = 72, flipX = false }) {
  const row = TYPE_ROW[type] ?? 0;
  const col = working ? (WORK_COL[type] ?? 2) : (WALK_COLS[type] ?? [0,1])[frame % 2];
  return <SheetSprite col={col} row={row} size={size} flipX={flipX} />;
}

// Machine sprite from SHEET2
function SpriteAsset({ machine, size = 80 }) {
  const scale = size / SHEET2.cw;
  return (
    <div style={{
      width: size,
      height: Math.round(SHEET2.ch * scale),
      backgroundImage: `url(${SHEET2.url})`,
      backgroundPosition: `${-(machine.s2col * SHEET2.cw * scale).toFixed(1)}px ${-(machine.s2row * SHEET2.ch * scale).toFixed(1)}px`,
      backgroundSize: `${(SHEET2.w * scale).toFixed(1)}px ${(SHEET2.h * scale).toFixed(1)}px`,
      backgroundRepeat: 'no-repeat',
    }} />
  );
}

// ── Work progress ring ──────────────────────────────────────────
function WorkRing({ progress, color }) {
  const r = 15, circ = 2 * Math.PI * r;
  return (
    <svg width={36} height={36} style={{ position:'absolute', top:-5, left:'50%', transform:'translateX(-50%)' }}>
      <circle cx={18} cy={18} r={r} fill="none" stroke="rgba(0,0,0,.12)" strokeWidth={3} />
      <circle cx={18} cy={18} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={circ*(1-progress)}
        strokeLinecap="round" transform="rotate(-90 18 18)" />
    </svg>
  );
}

// ── Speech bubble ──────────────────────────────────────────────
function SpeechBubble({ message, color }) {
  return (
    <motion.div
      initial={{ opacity:0, y:6, scale:.85 }}
      animate={{ opacity:1, y:0, scale:1 }}
      exit={{ opacity:0, y:-4, scale:.85 }}
      transition={{ duration:.18 }}
      style={{
        position:'absolute', bottom:'115%', left:'50%', transform:'translateX(-50%)',
        background:'rgba(255,248,235,0.96)', color:'#3a2008', border:`1.5px solid ${color}`,
        borderRadius:8, padding:'4px 9px', fontSize:10, fontWeight:700,
        whiteSpace:'nowrap', pointerEvents:'none',
        boxShadow:`0 2px 10px ${color}55`, zIndex:30, letterSpacing:'.02em',
      }}
    >
      {message}
      <div style={{
        position:'absolute', bottom:-7, left:'50%', transform:'translateX(-50%)',
        width:0, height:0, borderLeft:'5px solid transparent',
        borderRight:'5px solid transparent', borderTop:`7px solid ${color}`,
      }} />
    </motion.div>
  );
}

// ── Agent sprite (state machine) ───────────────────────────────
function AgentSprite({ agent, floorW, floorH, machinesPixel, onClick, onMachineChange }) {
  const [rd, setRd] = useState({ pos:{x:100,y:100}, frame:0, flipX:false, state:AGENT_STATE.IDLE, msgIdx:0, showMsg:true, workProgress:0 });

  const stRef = useRef(null);
  if (!stRef.current) stRef.current = {
    pos:{ x:80+Math.random()*Math.max(floorW-180,100), y:Math.floor(floorH*0.35)+Math.random()*Math.max(floorH*0.5,60) },
    target:null, frame:0, flipX:false, state:AGENT_STATE.IDLE,
    msgIdx:0, showMsg:true, frameTimer:0, msgTimer:0,
    idleTimer:20+Math.random()*100,
    workElapsed:0, workDuration:0, workProgress:0,
    machineIdx:null, notifiedMachine:null,
  };

  const flRef  = useRef({ w:floorW, h:floorH });
  const machRef = useRef(machinesPixel);
  const cbRef   = useRef(onMachineChange);
  const agRef   = useRef(agent);
  useEffect(() => { flRef.current  = { w:floorW, h:floorH }; }, [floorW, floorH]);
  useEffect(() => { machRef.current = machinesPixel; }, [machinesPixel]);
  useEffect(() => { cbRef.current   = onMachineChange; }, [onMachineChange]);
  useEffect(() => { agRef.current   = agent; }, [agent]);

  const animRef = useRef(null);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    const tick = (now) => {
      const dt  = Math.min((now-lastRef.current)/16, 3);
      lastRef.current = now;
      const st  = stRef.current;
      const ag  = agRef.current;
      const fl  = flRef.current;
      const mps = machRef.current;
      const SPEED=ag.speed*2.8, ARRIVE=22;
      const Y_MIN=fl.h*0.32, Y_MAX=fl.h-110;
      const X_MIN=fl.w*0.08, X_MAX=fl.w*0.90;

      // Walk frame
      st.frameTimer+=dt;
      if (st.frameTimer>28) { st.frameTimer=0; if (st.state===AGENT_STATE.GOING||st.state===AGENT_STATE.LEAVING) st.frame=1-st.frame; }

      // Message cycle
      st.msgTimer+=dt;
      if (st.msgTimer>168) {
        st.msgTimer=0; st.showMsg=false;
        const next=(st.msgIdx+1)%ag.messages.length;
        setTimeout(()=>{ if(stRef.current){stRef.current.msgIdx=next;stRef.current.showMsg=true;} },180);
      }

      // State machine
      if (st.state===AGENT_STATE.IDLE) {
        st.idleTimer-=dt;
        if (st.idleTimer<=0&&mps.length>0) {
          const mi=Math.floor(Math.random()*mps.length), mp=mps[mi];
          st.target={ x:Math.min(Math.max(mp.x-20+Math.random()*40,X_MIN),X_MAX), y:Math.min(Math.max(mp.y+35+Math.random()*20,Y_MIN),Y_MAX) };
          st.machineIdx=mi; st.state=AGENT_STATE.GOING;
        }
      } else if (st.state===AGENT_STATE.GOING) {
        const dx=st.target.x-st.pos.x, dy=st.target.y-st.pos.y, dist=Math.sqrt(dx*dx+dy*dy);
        if (dist<ARRIVE) {
          st.pos={...st.target}; st.state=AGENT_STATE.WORKING; st.frame=0;
          st.workDuration=200+Math.random()*280; st.workElapsed=0; st.workProgress=0;
          if(cbRef.current) cbRef.current(st.machineIdx,ag.id,null);
          st.notifiedMachine=st.machineIdx;
        } else {
          const spd=Math.min(SPEED*dt,dist);
          st.pos={x:st.pos.x+(dx/dist)*spd, y:st.pos.y+(dy/dist)*spd};
          st.flipX=dx<0;
        }
      } else if (st.state===AGENT_STATE.WORKING) {
        st.workElapsed+=dt; st.workProgress=Math.min(st.workElapsed/st.workDuration,1);
        if (st.workElapsed>=st.workDuration) {
          if(cbRef.current&&st.notifiedMachine!==null){cbRef.current(st.notifiedMachine,null,ag.id);st.notifiedMachine=null;}
          st.target={x:X_MIN+Math.random()*(X_MAX-X_MIN), y:Y_MIN+Math.random()*(Y_MAX-Y_MIN)};
          st.machineIdx=null; st.state=AGENT_STATE.LEAVING;
        }
      } else if (st.state===AGENT_STATE.LEAVING) {
        const dx=st.target.x-st.pos.x, dy=st.target.y-st.pos.y, dist=Math.sqrt(dx*dx+dy*dy);
        if (dist<ARRIVE) { st.state=AGENT_STATE.IDLE; st.idleTimer=30+Math.random()*80; st.frame=0; }
        else { const spd=Math.min(SPEED*dt,dist); st.pos={x:st.pos.x+(dx/dist)*spd,y:st.pos.y+(dy/dist)*spd}; st.flipX=dx<0; }
      }

      setRd({ pos:{...st.pos}, frame:st.frame, flipX:st.flipX, state:st.state, msgIdx:st.msgIdx, showMsg:st.showMsg, workProgress:st.workProgress });
      animRef.current=requestAnimationFrame(tick);
    };
    animRef.current=requestAnimationFrame(tick);
    return ()=>{ if(animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const isGood=agent.value>=agent.target, sc=isGood?'#22c55e':'#ef4444';
  const isWorking=rd.state===AGENT_STATE.WORKING, isMoving=rd.state===AGENT_STATE.GOING||rd.state===AGENT_STATE.LEAVING;

  return (
    <div onClick={()=>onClick(agent)}
      onMouseEnter={e=>{e.currentTarget.style.filter=`drop-shadow(0 0 10px ${agent.color}cc)`;}} 
      onMouseLeave={e=>{e.currentTarget.style.filter='none';}}
      style={{ position:'absolute', left:rd.pos.x, top:rd.pos.y, width:80, cursor:'pointer', userSelect:'none', display:'flex', flexDirection:'column', alignItems:'center', zIndex:10, transition:'filter .15s' }}
    >
      <AnimatePresence mode="wait">
        {rd.showMsg && <SpeechBubble key={rd.msgIdx} message={agent.messages[rd.msgIdx]} color={agent.color}/>}
      </AnimatePresence>

      <div style={{ background:isGood?agent.color:'#ef4444', color:'#fff', fontSize:9, fontWeight:800, padding:'1px 7px', borderRadius:4, marginBottom:2, boxShadow:`0 1px 6px ${isGood?agent.color:'#ef4444'}88` }}>{agent.value}{agent.unit}</div>

      {isWorking && <WorkRing progress={rd.workProgress} color={agent.color}/>}

      <SpriteChar type={agent.type} frame={rd.frame} working={isWorking} size={72} flipX={rd.flipX}/>

      <div style={{ fontSize:9, color:agent.color, fontWeight:800, marginTop:1, textShadow:'0 1px 3px rgba(0,0,0,.5)', textAlign:'center', lineHeight:1.2 }}>{agent.name}</div>
      <div style={{ fontSize:7.5, color:'#8a6030', marginTop:1 }}>{isWorking?'⚡ ทำงาน':isMoving?'🚶 เดิน':'💤 รอ'}</div>
      <div style={{ width:6, height:6, borderRadius:'50%', background:sc, marginTop:2, boxShadow:`0 0 6px ${sc}`, animation:'statusPulse 2s ease-in-out infinite' }}/>
    </div>
  );
}

// ── Agent detail modal ──────────────────────────────────────────
function AgentDetail({ agent, onClose }) {
  const isGood = agent.value >= agent.target;
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="overlay" onClick={onClose}>
      <motion.div initial={{scale:.85,y:24}} animate={{scale:1,y:0}} exit={{scale:.85,y:24}}
        transition={{type:'spring',stiffness:340,damping:28}}
        className="modal" onClick={e=>e.stopPropagation()} style={{textAlign:'center'}}
      >
        <div style={{display:'flex',justifyContent:'center',marginBottom:10}}><SpriteChar type={agent.type} frame={0} size={96}/></div>
        <div style={{fontSize:20,fontWeight:800,color:agent.color}}>{agent.name}</div>
        <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>{agent.role}</div>
        <div style={{ background:isGood?'var(--green-dim)':'var(--red-dim)', border:`1px solid ${isGood?'var(--green)':'var(--red)'}`, borderRadius:10, padding:'12px 20px', marginBottom:12 }}>
          <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:3}}>{agent.kpi}</div>
          <div style={{fontSize:38,fontWeight:900,color:isGood?'var(--green)':'var(--red)',lineHeight:1}}>{agent.value}{agent.unit}</div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>เป้าหมาย {agent.target}{agent.unit}</div>
          <div style={{fontSize:12,fontWeight:700,marginTop:5,color:isGood?'var(--green)':'var(--red)'}}>{isGood?'✅ ผ่านเป้าหมาย':'⚠️ ต่ำกว่าเป้าหมาย'}</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:5,textAlign:'left',marginBottom:14}}>
          {agent.messages.map((m,i)=>(<div key={i} style={{fontSize:13,padding:'6px 12px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text)'}}>{m}</div>))}
        </div>
        <button onClick={onClose} style={{background:agent.color,color:'#fff',border:'none',borderRadius:8,padding:'11px 24px',fontSize:14,fontWeight:800,width:'100%'}}>ปิด</button>
      </motion.div>
    </motion.div>
  );
}

// ── Activity log ──────────────────────────────────────────────────
function LogItem({ item }) {
  return (
    <motion.div initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} transition={{duration:.2}}
      style={{display:'flex',flexDirection:'column',gap:1,padding:'5px 8px',borderLeft:`3px solid ${item.color}`,marginBottom:4,background:'rgba(255,245,225,0.7)',borderRadius:'0 6px 6px 0'}}
    >
      <div style={{fontSize:10,fontWeight:700,color:item.color}}>{item.agentName}</div>
      <div style={{fontSize:9,color:'#7a5530'}}>{item.task} · {item.machineName}</div>
      <div style={{fontSize:8,color:'#a07040'}}>{item.time}</div>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function GameSim() {
  const [agents]     = useState(loadAgents);
  const [selected, setSelected]   = useState(null);
  const [dims, setDims]           = useState({ width:0, height:0 });
  const [machineOccupants, setMachineOccupants] = useState({});
  const [activityLog, setActivityLog]           = useState([]);
  const [showLog, setShowLog] = useState(window.innerWidth > 580);
  const floorRef  = useRef(null);
  const agentsRef = useRef(agents);

  useEffect(() => {
    const update = () => {
      if (floorRef.current) setDims({ width:floorRef.current.offsetWidth, height:floorRef.current.offsetHeight });
      setShowLog(window.innerWidth > 580);
    };
    update();
    const ro = new ResizeObserver(update);
    if (floorRef.current) ro.observe(floorRef.current);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  const machinesPixel = useMemo(() =>
    dims.width > 0 ? MACHINES.map(m => ({ x:parseFloat(m.x)/100*dims.width, y:parseFloat(m.y)/100*dims.height })) : [],
  [dims]);

  const handleMachineChange = useCallback((machineIdx, agentId, leavingId) => {
    if (agentId) {
      setMachineOccupants(prev => ({ ...prev, [machineIdx]:agentId }));
      const ag=agentsRef.current.find(a=>a.id===agentId), machine=MACHINES[machineIdx];
      if (ag&&machine) {
        const now=new Date(), time=`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
        setActivityLog(prev=>[{ id:`${agentId}-${Date.now()}`, agentName:ag.name, machineName:machine.label, task:machine.task, color:ag.color, time },...prev.slice(0,19)]);
      }
    } else {
      setMachineOccupants(prev=>{ if(prev[machineIdx]===leavingId) return {...prev,[machineIdx]:null}; return prev; });
    }
  }, []);

  return (
    <div style={{ height:'calc(100vh - 58px)', display:'flex', flexDirection:'column', padding:14, overflow:'hidden', boxSizing:'border-box', background:'#1a0f06' }}>

      {/* Header */}
      <div style={{ marginBottom:10, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>🏭</span>
            <div>
              <h1 style={{ fontSize:17, fontWeight:800, color:'#f5c87a', lineHeight:1, margin:0, textShadow:'0 0 16px #c8903055' }}>KPI Factory Sim</h1>
              <p style={{ fontSize:11, color:'#a07040', margin:0 }}>Agent เดินทำงาน · แตะตัวละครเพื่อดู KPI</p>
            </div>
          </div>
          <Link to="/agentsetup" style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'rgba(200,140,50,0.12)', border:'1px solid rgba(200,140,50,0.35)', borderRadius:8, textDecoration:'none', fontSize:12, fontWeight:700, color:'#e8a840' }}>⚙️ ตั้งค่า Agent</Link>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {agents.map(a => {
            const good=a.value>=a.target, occupied=Object.values(machineOccupants).includes(a.id);
            return (
              <button key={a.id} onClick={()=>setSelected(a)} style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 9px', background:occupied?`${a.color}18`:'rgba(30,18,8,0.8)', border:`1px solid ${occupied?a.color:a.color+'40'}`, borderRadius:20, cursor:'pointer', fontSize:11, fontWeight:600, color:good?'#22c55e':'#ef4444', boxShadow:occupied?`0 0 8px ${a.color}44`:'none' }}>
                {occupied&&<span style={{fontSize:8,color:a.color}}>⚡</span>}
                <span style={{fontSize:13}}>👷</span>
                <span>{a.value}{a.unit}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floor + log */}
      <div style={{ flex:1, display:'flex', gap:10, overflow:'hidden', minHeight:0 }}>

        {/* ╔═══════════════════════╗
             ISOMETRIC FACTORY ROOM
             WARM ORANGE + CREAM TILES
           ╚═══════════════════════╝ */}
        <div ref={floorRef} style={{ flex:1, position:'relative', overflow:'hidden', borderRadius:14, border:'1px solid rgba(160,90,30,0.4)', boxShadow:'0 0 50px rgba(140,80,20,0.2)', background:'#1a0e05' }}>

          {/* 3D perspective floor — cream tiles with warm grout */}
          <div style={{
            position:'absolute', top:'25%', left:'-15%', right:'-15%', bottom:'-90%',
            pointerEvents:'none',
            transform:'perspective(440px) rotateX(26deg)',
            transformOrigin:'50% 0%',
            backgroundColor:'#ede0b5',
            backgroundImage:[
              'linear-gradient(to bottom, rgba(185,115,45,0.18) 0%, transparent 20%)',
              'linear-gradient(rgba(145,115,65,0.4) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(145,115,65,0.4) 1px, transparent 1px)',
            ].join(','),
            backgroundSize:'auto, 44px 44px, 44px 44px',
          }}/>

          {/* Back wall — warm orange */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'28%', background:'linear-gradient(to bottom, rgba(195,105,32,0.98) 0%, rgba(162,72,15,0.88) 62%, transparent 100%)', pointerEvents:'none', zIndex:2 }}>
            {/* Ceiling light */}
            <div style={{ position:'absolute', top:0, left:'14%', right:'14%', height:3, background:'rgba(250,195,80,0.9)', boxShadow:'0 0 20px rgba(230,160,50,0.85), 0 0 55px rgba(210,130,30,0.45)' }}/>
            {/* Warm glow under ceiling */}
            <div style={{ position:'absolute', top:0, left:'5%', right:'5%', height:'55%', background:'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(230,155,50,0.1) 0%, transparent 100%)' }}/>
            {/* Vertical wall panels */}
            <div style={{ position:'absolute', inset:'10px 0 0 0', backgroundImage:'repeating-linear-gradient(90deg, rgba(0,0,0,0.09) 0, rgba(0,0,0,0.09) 1px, transparent 1px, transparent 80px)' }}/>
            {/* Horizontal wall panels */}
            <div style={{ position:'absolute', inset:'10px 0 0 0', backgroundImage:'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 28px)' }}/>
            {/* Wall-floor junction */}
            <div style={{ position:'absolute', bottom:0, left:'7%', right:'7%', height:2, background:'rgba(100,50,10,0.55)' }}/>
          </div>

          {/* Left wall — amber */}
          <div style={{ position:'absolute', top:0, left:0, width:'7%', height:'100%', background:'linear-gradient(to right, rgba(162,72,15,0.95) 0%, transparent 100%)', pointerEvents:'none', zIndex:2 }}>
            <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:'linear-gradient(to bottom, rgba(250,195,80,0.9) 0%, rgba(180,100,30,0.3) 70%, transparent 100%)', boxShadow:'2px 0 12px rgba(200,130,40,0.4)' }}/>
            <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg, rgba(0,0,0,0.07) 0, rgba(0,0,0,0.07) 1px, transparent 1px, transparent 35px)' }}/>
          </div>

          {/* Right wall — amber */}
          <div style={{ position:'absolute', top:0, right:0, width:'7%', height:'100%', background:'linear-gradient(to left, rgba(162,72,15,0.95) 0%, transparent 100%)', pointerEvents:'none', zIndex:2 }}>
            <div style={{ position:'absolute', top:0, right:0, bottom:0, width:3, background:'linear-gradient(to bottom, rgba(250,195,80,0.9) 0%, rgba(180,100,30,0.3) 70%, transparent 100%)', boxShadow:'-2px 0 12px rgba(200,130,40,0.4)' }}/>
            <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg, rgba(0,0,0,0.07) 0, rgba(0,0,0,0.07) 1px, transparent 1px, transparent 35px)' }}/>
          </div>

          {/* Corner junction dots */}
          {[['26%','6.5%'],['26%','93.5%']].map(([top,left],i)=>(
            <div key={i} style={{ position:'absolute', top, left, width:8, height:8, borderRadius:'50%', transform:'translate(-50%,-50%)', background:'rgba(245,185,60,0.95)', boxShadow:'0 0 10px rgba(220,155,40,0.9)', zIndex:3, pointerEvents:'none' }}/>
          ))}

          {/* Ambient warm glow */}
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:'radial-gradient(ellipse 60% 45% at 50% 62%, rgba(210,140,40,0.09) 0%, transparent 72%)' }}/>
          {/* Edge vignette */}
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', boxShadow:'inset 0 0 70px rgba(0,0,0,0.4)' }}/>

          {/* Machines */}
          {MACHINES.map((m,i)=>{
            const occupantId=machineOccupants[i], occupant=occupantId?agents.find(a=>a.id===occupantId):null;
            return (
              <div key={i} style={{ position:'absolute', left:m.x, top:m.y, pointerEvents:'none', display:'flex', flexDirection:'column', alignItems:'center', zIndex:5, filter:occupant?`drop-shadow(0 0 14px ${occupant.color}cc) brightness(1.12)`:`drop-shadow(0 0 8px ${m.color}66)`, transition:'filter .4s' }}>
                {occupant&&(
                  <div style={{ fontSize:7, color:occupant.color, fontWeight:800, background:'rgba(255,248,225,0.92)', border:`1px solid ${occupant.color}`, borderRadius:4, padding:'1px 5px', marginBottom:2, boxShadow:`0 0 8px ${occupant.color}55`, animation:'statusPulse 1.4s ease-in-out infinite' }}>⚡ {occupant.name}</div>
                )}
                <SpriteAsset machine={m} size={m.size}/>
                <div style={{ fontSize:8, color:occupant?occupant.color:m.color, fontWeight:800, letterSpacing:'.05em', marginTop:2, textAlign:'center', textShadow:'0 1px 3px rgba(0,0,0,.4)', transition:'color .4s' }}>{m.label}</div>
              </div>
            );
          })}

          {/* Agents */}
          {dims.width>0&&machinesPixel.length>0&&agents.map(a=>(
            <AgentSprite key={a.id} agent={a} floorW={dims.width} floorH={dims.height} machinesPixel={machinesPixel} onClick={setSelected} onMachineChange={handleMachineChange}/>
          ))}

          <div style={{ position:'absolute', bottom:7, right:12, fontSize:9, color:'#7a5030', opacity:.8, zIndex:4 }}>Thai Summit Group · Factory Floor Simulation</div>
        </div>

        {/* Activity log */}
        {showLog&&(
          <div style={{ width:168, flexShrink:0, display:'flex', flexDirection:'column', background:'rgba(30,18,6,0.97)', border:'1px solid rgba(180,110,40,0.28)', borderRadius:10, overflow:'hidden' }}>
            <div style={{ padding:'8px 10px', borderBottom:'1px solid rgba(180,110,40,0.2)', fontSize:11, fontWeight:700, color:'#e8a840', flexShrink:0 }}>📋 Activity Log</div>
            <div style={{ flex:1, overflowY:'auto', padding:'6px 6px' }}>
              <AnimatePresence initial={false}>
                {activityLog.length===0
                  ?<div style={{fontSize:10,color:'#7a5030',padding:10,textAlign:'center'}}>รอ Agent เริ่มทำงาน...</div>
                  :activityLog.map(item=><LogItem key={item.id} item={item}/>)
                }
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>{selected&&<AgentDetail agent={selected} onClose={()=>setSelected(null)}/>}</AnimatePresence>
      <style>{`@keyframes statusPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.7)} }`}</style>
    </div>
  );
}
