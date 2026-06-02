import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { DEFAULT_AGENTS } from '../config/agentDefaults';

const SPRITE_TYPES = [
  { value:'robot',    emoji:'🤖', label:'Robot AI' },
  { value:'engineer', emoji:'👷', label:'Engineer' },
  { value:'manager',  emoji:'💼', label:'Manager' },
];

const PRESET_COLORS = ['#60a5fa','#c084fc','#fb923c','#f87171','#34d399','#fbbf24','#f472b6','#a78bfa','#38bdf8','#4ade80'];

function EditModal({ agent, onSave, onCancel }) {
  const [form, setForm] = useState({ ...agent, messages:[...agent.messages] });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const setMsg = (i,v) => setForm(f=>{ const m=[...f.messages]; m[i]=v; return {...f,messages:m}; });

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="overlay" onClick={onCancel}>
      <motion.div
        initial={{scale:.88,y:24}} animate={{scale:1,y:0}} exit={{scale:.88,y:24}}
        transition={{type:'spring',stiffness:320,damping:26}}
        onClick={e=>e.stopPropagation()}
        style={{ background:'var(--bg3)', border:'1px solid var(--border2)',
          borderRadius:12, padding:24, width:'min(500px,95vw)',
          maxHeight:'90vh', overflowY:'auto', boxShadow:'var(--shadow-lg)' }}
      >
        <div style={{fontWeight:800,fontSize:17,color:'var(--text)',marginBottom:18}}>
          ⚙️ ตั้งค่า <span style={{color:form.color}}>{form.name}</span>
        </div>

        {/* Sprite type */}
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:'var(--muted)',letterSpacing:'.1em',textTransform:'uppercase'}}>ประเภท Sprite</label>
          <div style={{display:'flex',gap:8,marginTop:6}}>
            {SPRITE_TYPES.map(t=>(
              <button key={t.value} onClick={()=>set('type',t.value)} style={{
                flex:1, padding:'8px 4px',
                background:form.type===t.value?form.color+'22':'var(--bg2)',
                border:`1.5px solid ${form.type===t.value?form.color:'var(--border)'}`,
                borderRadius:8, cursor:'pointer',
                fontSize:11, fontWeight:700, color:form.type===t.value?form.color:'var(--muted)',
                transition:'all .15s',
              }}>
                <div style={{fontSize:22,marginBottom:2}}>{t.emoji}</div>
                <div>{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:'var(--muted)',letterSpacing:'.1em',textTransform:'uppercase'}}>สี Agent</label>
          <div style={{display:'flex',gap:7,marginTop:6,flexWrap:'wrap'}}>
            {PRESET_COLORS.map(c=>(
              <button key={c} onClick={()=>set('color',c)} style={{
                width:28,height:28,borderRadius:'50%',background:c,
                border:`2.5px solid ${form.color===c?'var(--text)':'transparent'}`,
                outline:form.color===c?`2px solid ${c}`:'none',
                outlineOffset:2,cursor:'pointer',padding:0,
              }}/>
            ))}
          </div>
        </div>

        {/* Name + Role */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5}}>ชื่อ Agent</label>
            <input value={form.name} onChange={e=>set('name',e.target.value)}/>
          </div>
          <div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5}}>หน้าที่</label>
            <input value={form.role} onChange={e=>set('role',e.target.value)}/>
          </div>
        </div>

        {/* KPI fields */}
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5}}>KPI</label>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr .7fr',gap:8}}>
            <input placeholder="ชื่อ KPI" value={form.kpi} onChange={e=>set('kpi',e.target.value)}/>
            <input placeholder="ค่าปัจจุบัน" type="number" value={form.value} onChange={e=>set('value',+e.target.value)}/>
            <input placeholder="เป้าหมาย" type="number" value={form.target} onChange={e=>set('target',+e.target.value)}/>
            <input placeholder="%" value={form.unit} onChange={e=>set('unit',e.target.value)}/>
          </div>
        </div>

        {/* Speed */}
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5}}>
            ความเร็ว — <strong style={{color:'var(--text)'}}>{form.speed.toFixed(1)}x</strong>
          </label>
          <input type="range" min=".3" max="2.5" step=".1" value={form.speed}
            onChange={e=>set('speed',+e.target.value)}
            style={{padding:0,height:4,width:'100%'}}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--muted)',marginTop:3}}>
            <span>🐢 0.3x</span><span>🐇 2.5x</span>
          </div>
        </div>

        {/* Messages */}
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5}}>Speech Bubbles (4 ข้อความ)</label>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {form.messages.map((m,i)=>(
              <input key={i} value={m} onChange={e=>setMsg(i,e.target.value)}
                placeholder={`ข้อความที่ ${i+1}`}/>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{display:'flex',gap:8}}>
          <button onClick={onCancel} style={{flex:1,padding:'10px',background:'var(--bg2)',
            border:'1px solid var(--border)',borderRadius:8,fontSize:13,fontWeight:700,color:'var(--muted)'}}>
            ยกเลิก
          </button>
          <button onClick={()=>onSave(form)} style={{flex:2,padding:'10px',
            background:form.color,color:'#000',border:'none',
            borderRadius:8,fontSize:13,fontWeight:800}}>
            💾 บันทึก
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AgentSetup() {
  const [agents, setAgents] = useState(() => {
    try { const s=localStorage.getItem('kpi-agents'); if(s) return JSON.parse(s); } catch {}
    return DEFAULT_AGENTS;
  });
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState(false);

  const save = (updated) => {
    const next = agents.map(a=>a.id===updated.id?updated:a);
    setAgents(next);
    localStorage.setItem('kpi-agents', JSON.stringify(next));
    setEditing(null);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const reset = () => {
    if (!window.confirm('รีเซ็ต agents ทั้งหมด?')) return;
    setAgents(DEFAULT_AGENTS);
    localStorage.removeItem('kpi-agents');
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:22}}>⚙️</span>
          <div>
            <h1 style={{fontSize:18,fontWeight:800,color:'var(--text)',margin:0}}>Agent Setup</h1>
            <p style={{fontSize:12,color:'var(--muted)',margin:0}}>กำหนดค่า KPI agent แต่ละตัว — บันทึกใน browser</p>
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <AnimatePresence>
            {saved && (
              <motion.span initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0}}
                style={{fontSize:12,color:'var(--green)',fontWeight:700}}>✅ บันทึกแล้ว</motion.span>
            )}
          </AnimatePresence>
          <button onClick={reset} style={{padding:'7px 14px',background:'var(--red-dim)',
            border:'1px solid var(--red)',borderRadius:8,fontSize:12,fontWeight:700,color:'var(--red)'}}>
            ↺ รีเซ็ต
          </button>
          <Link to="/gamesim" style={{display:'flex',alignItems:'center',gap:5,
            padding:'7px 14px',background:'var(--accent-dim)',border:'1px solid var(--accent)',
            borderRadius:8,textDecoration:'none',fontSize:12,fontWeight:700,color:'var(--accent)'}}>
            🎮 เปิด Sim
          </Link>
        </div>
      </div>

      {/* Agent cards grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
        {agents.map(a=>{
          const isGood = a.value >= a.target;
          const typeInfo = SPRITE_TYPES.find(t=>t.value===a.type)||SPRITE_TYPES[0];
          return (
            <div key={a.id} className="card" style={{padding:16,borderLeft:`3px solid ${a.color}`}}>
              {/* Card header */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <div style={{width:46,height:46,borderRadius:10,
                  background:a.color+'22',border:`1.5px solid ${a.color}55`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>
                  {typeInfo.emoji}
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:14,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name}</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>{a.role}</div>
                </div>
              </div>

              {/* KPI meter */}
              <div style={{background:isGood?'var(--green-dim)':'var(--red-dim)',
                border:`1px solid ${isGood?'var(--green)':'var(--red)'}`,
                borderRadius:8,padding:'8px 12px',marginBottom:10,
                display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:9,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em'}}>{a.kpi}</div>
                  <div style={{fontSize:24,fontWeight:900,color:isGood?'var(--green)':'var(--red)',lineHeight:1.1}}>{a.value}{a.unit}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:10,color:'var(--muted)'}}>เป้า</div>
                  <div style={{fontSize:15,fontWeight:700,color:'var(--text2)'}}>{a.target}{a.unit}</div>
                  <div style={{fontSize:13}}>{isGood?'✅':'⚠️'}</div>
                </div>
              </div>

              {/* Tags */}
              <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                <span style={{fontSize:10,padding:'2px 8px',borderRadius:12,
                  background:a.color+'22',color:a.color,fontWeight:700}}>
                  {typeInfo.emoji} {typeInfo.label}
                </span>
                <span style={{fontSize:10,padding:'2px 8px',borderRadius:12,
                  background:'var(--bg3)',color:'var(--muted)',fontWeight:600}}>
                  {a.speed}x
                </span>
                <div style={{width:16,height:16,borderRadius:'50%',background:a.color,
                  boxShadow:`0 0 6px ${a.color}88`,alignSelf:'center'}}/>
              </div>

              {/* Messages preview */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:'var(--muted)',marginBottom:4}}>Speech bubbles:</div>
                <div style={{display:'flex',flexDirection:'column',gap:3}}>
                  {a.messages.slice(0,2).map((m,i)=>(
                    <div key={i} style={{fontSize:11,color:'var(--text2)',padding:'3px 8px',
                      background:'var(--bg3)',borderRadius:4,overflow:'hidden',
                      textOverflow:'ellipsis',whiteSpace:'nowrap'}}>“{m}”</div>
                  ))}
                  {a.messages.length>2 && <div style={{fontSize:10,color:'var(--muted)',paddingLeft:8}}>+{a.messages.length-2} เพิ่มเติม...</div>}
                </div>
              </div>

              <button onClick={()=>setEditing(a)} style={{width:'100%',padding:'8px',
                background:a.color+'18',border:`1px solid ${a.color}55`,
                borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:700,color:a.color}}>
                ✏️ แก้ไข Agent
              </button>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {editing && <EditModal agent={editing} onSave={save} onCancel={()=>setEditing(null)}/>}
      </AnimatePresence>
    </div>
  );
}
