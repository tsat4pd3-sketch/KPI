import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import tsLogo from '../components/TS logo.png';

// ─── Injected CSS ──────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  @keyframes lp-aurora-1 {
    0%,100%{transform:translate(0%,0%) scale(1);}
    33%{transform:translate(8%,5%) scale(1.08);}
    66%{transform:translate(-5%,8%) scale(0.96);}
  }
  @keyframes lp-aurora-2 {
    0%,100%{transform:translate(0%,0%) scale(1);}
    40%{transform:translate(-9%,-6%) scale(1.1);}
    70%{transform:translate(6%,-4%) scale(0.94);}
  }
  @keyframes lp-aurora-3 {
    0%,100%{transform:translate(0%,0%) scale(1);}
    50%{transform:translate(5%,-9%) scale(1.06);}
  }
  @keyframes lp-float {
    0%,100%{transform:translateY(0px) rotate(0deg);}
    50%{transform:translateY(-18px) rotate(0.4deg);}
  }
  @keyframes lp-glow {
    0%,100%{opacity:.65;transform:scale(1);}
    50%{opacity:1;transform:scale(1.08);}
  }
  @keyframes lp-shine {
    0%{transform:skewX(-15deg) translateX(-240%);}
    100%{transform:skewX(-15deg) translateX(580%);}
  }
  @keyframes lp-fade-up {
    from{opacity:0;transform:translateY(28px);}
    to{opacity:1;transform:translateY(0);}
  }
  @keyframes lp-fade-in {
    from{opacity:0;}to{opacity:1;}
  }
  @keyframes lp-scale-in {
    from{opacity:0;transform:scale(.88);}
    to{opacity:1;transform:scale(1);}
  }
  @keyframes lp-ticker {
    from{transform:translateX(0);}
    to{transform:translateX(-50%);}
  }
  @keyframes lp-blink {
    0%,100%{opacity:1;}50%{opacity:0;}
  }
  @keyframes lp-bar-grow {
    from{width:0;}to{width:var(--w);}
  }
  @keyframes lp-orbit {
    from{transform:rotate(0deg) translateX(110px) rotate(0deg);}
    to{transform:rotate(360deg) translateX(110px) rotate(-360deg);}
  }
  @keyframes lp-ping {
    75%,100%{transform:scale(2);opacity:0;}
  }
  @keyframes lp-sway {
    0%,100%{transform:rotateY(-18deg) rotateX(6deg);}
    50%{transform:rotateY(18deg) rotateX(-4deg);}
  }

  .lp-root * { box-sizing:border-box; margin:0; padding:0; }
  .lp-root { font-family:'Inter','Sarabun',sans-serif; }

  .lp-btn {
    position:relative; overflow:hidden; cursor:pointer; border:none;
    transition:transform .22s ease, box-shadow .22s ease, filter .22s ease;
  }
  .lp-btn::after {
    content:''; position:absolute; inset:0;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);
    transform:skewX(-15deg) translateX(-240%);
    transition:transform .65s ease;
    pointer-events:none;
  }
  .lp-btn:hover { transform:translateY(-3px); filter:brightness(1.08); }
  .lp-btn:hover::after { transform:skewX(-15deg) translateX(500%); }
  .lp-btn:active { transform:translateY(-1px) scale(.98); }

  .lp-btn-ghost {
    cursor:pointer;
    transition:background .2s, color .2s, transform .2s, border-color .2s;
  }
  .lp-btn-ghost:hover {
    background:rgba(61,214,92,.10) !important;
    color:#3dd65c !important;
    border-color:rgba(61,214,92,.44) !important;
    transform:translateY(-2px);
  }

  .lp-card {
    transition:transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s ease, border-color .28s ease;
  }
  .lp-card:hover {
    transform:translateY(-8px);
    border-color:rgba(61,214,92,.32) !important;
    box-shadow:0 28px 70px rgba(0,0,0,.30), 0 0 0 1px rgba(61,214,92,.12) !important;
  }

  .lp-stat-num {
    font-variant-numeric:tabular-nums;
    font-feature-settings:'tnum';
  }

  .lp-reveal {
    opacity:0;
    transform:translateY(24px);
    transition:opacity .7s ease, transform .7s cubic-bezier(.22,1,.36,1);
  }
  .lp-reveal.lp-visible {
    opacity:1;
    transform:translateY(0);
  }

  .lp-ticker-wrap {
    overflow:hidden; white-space:nowrap; width:100%;
  }
  .lp-ticker-track {
    display:inline-flex; gap:0;
    animation:lp-ticker 28s linear infinite;
  }

  .lp-mock-bar { border-radius:3px; animation:lp-bar-grow .9s cubic-bezier(.22,1,.36,1) both; }

  .lp-orb {
    position:absolute; border-radius:50%; pointer-events:none;
    filter:blur(80px);
  }

  @media(max-width:768px){
    .lp-hero-cols{ flex-direction:column !important; gap:40px !important; }
    .lp-logo-wrap{ width:220px !important; height:220px !important; }
    .lp-feat-grid{ grid-template-columns:1fr !important; }
    .lp-stat-grid{ grid-template-columns:repeat(2,1fr) !important; }
    .lp-mock-section{ display:none !important; }
  }
`;

// ─── Particle canvas ─────────────────────────────────────────────────────────
function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let raf, pts = [];
    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;
    const resize = () => { canvas.width = W()*dpr; canvas.height = H()*dpr; };
    const spawn = () => {
      pts = Array.from({ length: 70 }, () => ({
        x: Math.random()*W(), y: Math.random()*H(),
        vx: (Math.random()-.5)*.18, vy: (Math.random()-.5)*.18,
        r: Math.random()*1.5+.3, a: Math.random()*.35+.05,
      }));
    };
    resize(); spawn();
    const ro = () => { resize(); spawn(); };
    window.addEventListener('resize', ro);
    const tick = () => {
      const w=W(), h=H();
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,w,h);
      pts.forEach(p => {
        p.x=(p.x+p.vx+w)%w; p.y=(p.y+p.vy+h)%h;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.2832);
        ctx.fillStyle=`rgba(74,222,128,${p.a})`; ctx.fill();
      });
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);
        if(d<100){
          ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle=`rgba(74,222,128,${.055*(1-d/100)})`; ctx.lineWidth=.6; ctx.stroke();
        }
      }
      raf=requestAnimationFrame(tick);
    };
    tick();
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('resize',ro); };
  }, []);
  return <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} />;
}

// ─── Typewriter headline ──────────────────────────────────────────────────────
function Typewriter({ words, speed=75, pause=1800 }) {
  const [display, setDisplay] = useState('');
  const [wi, setWi]   = useState(0);
  const [ci, setCi]   = useState(0);
  const [del, setDel] = useState(false);

  useEffect(() => {
    const word = words[wi];
    if (!del && ci < word.length) {
      const t = setTimeout(() => { setDisplay(word.slice(0, ci+1)); setCi(c=>c+1); }, speed);
      return () => clearTimeout(t);
    }
    if (!del && ci === word.length) {
      const t = setTimeout(() => setDel(true), pause);
      return () => clearTimeout(t);
    }
    if (del && ci > 0) {
      const t = setTimeout(() => { setDisplay(word.slice(0, ci-1)); setCi(c=>c-1); }, speed*.45);
      return () => clearTimeout(t);
    }
    if (del && ci === 0) {
      setDel(false); setWi(w=>(w+1)%words.length);
    }
  }, [ci, del, wi, words, speed, pause]);

  return (
    <span style={{ color:'#3dd65c' }}>
      {display}
      <span style={{ animation:'lp-blink 1.1s step-end infinite', borderRight:'2px solid #3dd65c', marginLeft:1 }}>&nbsp;</span>
    </span>
  );
}

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target, duration=1600, active=false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = null;
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts-start)/duration, 1);
      const ease = 1 - Math.pow(1-p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return val;
}

// ─── Intersection observer hook ──────────────────────────────────────────────
function useVisible(ref, threshold=0.18) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if(e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

// ─── Stat card with count-up ──────────────────────────────────────────────────
function StatCard({ num, suffix='', label, sublabel, icon, delay=0 }) {
  const ref = useRef(null);
  const visible = useVisible(ref);
  const isNum = !isNaN(parseInt(num));
  const target = isNum ? parseInt(num) : 0;
  const counted = useCountUp(target, 1500, visible);
  const display = isNum ? counted + (num.includes('+') ? '+' : '') : num;

  return (
    <div ref={ref} className="lp-card lp-reveal" style={{
      animationDelay: `${delay}ms`,
      padding:'36px 24px', borderRadius:24, textAlign:'center',
      background:'rgba(255,255,255,.027)',
      border:'1px solid rgba(255,255,255,.072)',
      boxShadow:'0 4px 32px rgba(0,0,0,.22)',
      backdropFilter:'blur(8px)',
      ...(visible ? { opacity:1, transform:'translateY(0)' } : {}),
    }}>
      <div style={{ fontSize:32, marginBottom:14 }}>{icon}</div>
      <div className="lp-stat-num" style={{
        fontSize:'clamp(38px,5vw,54px)', fontWeight:900, lineHeight:1,
        background:'linear-gradient(135deg,#4ade80,#3dd65c)',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
        letterSpacing:'-2px',
      }}>{display}</div>
      <div style={{ fontSize:10, color:'rgba(232,245,234,.32)', letterSpacing:3, marginTop:8, textTransform:'uppercase' }}>{suffix}</div>
      <div style={{ fontSize:13.5, color:'rgba(232,245,234,.58)', marginTop:10, lineHeight:1.5 }}>{label}</div>
      {sublabel && <div style={{ fontSize:11, color:'rgba(61,214,92,.55)', marginTop:6, fontWeight:600 }}>{sublabel}</div>}
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, titleTH, desc, accent='#3dd65c', delay=0 }) {
  const ref = useRef(null);
  const visible = useVisible(ref);
  return (
    <div ref={ref} className="lp-card lp-reveal" style={{
      padding:'38px 32px', borderRadius:24,
      background:'rgba(255,255,255,.022)',
      border:'1px solid rgba(255,255,255,.06)',
      boxShadow:'0 4px 32px rgba(0,0,0,.20)',
      backdropFilter:'blur(6px)',
      borderLeft:`3px solid ${accent}22`,
      transition:'transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s ease, border-color .28s ease',
      ...(visible ? { opacity:1, transform:'translateY(0)', transitionDelay:`${delay}ms` } : { transitionDelay:`${delay}ms` }),
    }}>
      <div style={{
        width:58, height:58, borderRadius:18, fontSize:26,
        display:'flex', alignItems:'center', justifyContent:'center',
        background:`linear-gradient(135deg, ${accent}18, ${accent}08)`,
        border:`1px solid ${accent}28`,
        marginBottom:26, transition:'transform .3s ease',
      }}>{icon}</div>
      <div style={{ fontSize:17, fontWeight:700, color:'#e8f5ea', marginBottom:5, lineHeight:1.3 }}>{title}</div>
      <div style={{ fontSize:12, color:accent, fontWeight:600, marginBottom:16, letterSpacing:'.02em' }}>{titleTH}</div>
      <p style={{ fontSize:14, color:'rgba(232,245,234,.50)', lineHeight:1.82, margin:0 }}>{desc}</p>
    </div>
  );
}

// ─── Mini dashboard mockup ────────────────────────────────────────────────────
function DashMockup() {
  const ref = useRef(null);
  const visible = useVisible(ref, .1);
  const BARS = [
    { label:'OEE PD3', pct:87, color:'#3dd65c' },
    { label:'OEE PD4', pct:79, color:'#f59a3f' },
    { label:'Target', pct:92, color:'rgba(255,255,255,.18)' },
    { label:'Defect PPM', pct:62, color:'#f87171' },
    { label:'DL Cost', pct:74, color:'#60a5fa' },
  ];
  const KPIS = [
    { l:'OEE', v:'87.4%', c:'#4ade80' },
    { l:'Avail.', v:'94.1%', c:'#4ade80' },
    { l:'Perf.', v:'91.2%', c:'#fbbf24' },
    { l:'Quality', v:'99.8%', c:'#4ade80' },
  ];

  return (
    <div ref={ref} style={{
      position:'relative', opacity: visible ? 1 : 0,
      transform: visible ? 'perspective(1000px) rotateY(-8deg) rotateX(3deg)' : 'perspective(1000px) rotateY(-12deg) rotateX(6deg) scale(.92)',
      transition:'opacity .9s ease, transform 1.1s cubic-bezier(.22,1,.36,1)',
      transformStyle:'preserve-3d',
    }}>
      {/* Window chrome */}
      <div style={{
        borderRadius:18, overflow:'hidden',
        border:'1px solid rgba(255,255,255,.12)',
        boxShadow:'0 48px 120px rgba(0,0,0,.60), 0 0 0 1px rgba(61,214,92,.08)',
        background:'#070f08',
      }}>
        {/* Titlebar */}
        <div style={{
          height:38, padding:'0 16px', display:'flex', alignItems:'center', gap:7,
          background:'rgba(255,255,255,.04)', borderBottom:'1px solid rgba(255,255,255,.07)',
        }}>
          {['#f87171','#fbbf24','#4ade80'].map((c,i)=>(
            <div key={i} style={{ width:11, height:11, borderRadius:'50%', background:c, opacity:.8 }}/>
          ))}
          <div style={{
            marginLeft:'auto', marginRight:'auto',
            background:'rgba(255,255,255,.06)', borderRadius:6, padding:'3px 18px',
            fontSize:10, color:'rgba(255,255,255,.30)', letterSpacing:1,
          }}>kpi.thaisummit.co.th</div>
        </div>
        {/* Body */}
        <div style={{ display:'flex', height:320 }}>
          {/* Sidebar */}
          <div style={{ width:160, borderRight:'1px solid rgba(255,255,255,.07)', padding:'16px 12px', display:'flex', flexDirection:'column', gap:4 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, background:'rgba(61,214,92,.10)', marginBottom:8 }}>
              <div style={{ width:22, height:22, borderRadius:6, overflow:'hidden' }}>
                <img src={tsLogo} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
              </div>
              <span style={{ fontSize:9, fontWeight:800, color:'#3dd65c', letterSpacing:.5 }}>TSG KPI</span>
            </div>
            {['Dashboard','Category','Entry','Targets','Trends'].map((t,i)=>(
              <div key={i} style={{
                padding:'7px 10px', borderRadius:7, fontSize:10, color: i===0 ? '#3dd65c' : 'rgba(255,255,255,.28)',
                background: i===0 ? 'rgba(61,214,92,.10)' : 'transparent', cursor:'default',
              }}>{t}</div>
            ))}
          </div>
          {/* Content */}
          <div style={{ flex:1, padding:18, display:'flex', flexDirection:'column', gap:14, overflow:'hidden' }}>
            {/* KPI chips */}
            <div style={{ display:'flex', gap:8 }}>
              {KPIS.map(({l,v,c},i)=>(
                <div key={i} style={{
                  flex:1, padding:'10px 8px', borderRadius:10, textAlign:'center',
                  background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)',
                }}>
                  <div style={{ fontSize:14, fontWeight:800, color:c, letterSpacing:'-0.5px' }}>{v}</div>
                  <div style={{ fontSize:8.5, color:'rgba(255,255,255,.28)', marginTop:3, letterSpacing:.5 }}>{l}</div>
                </div>
              ))}
            </div>
            {/* Bar chart */}
            <div style={{
              flex:1, background:'rgba(255,255,255,.025)', borderRadius:12, padding:'14px 16px',
              border:'1px solid rgba(255,255,255,.06)',
            }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.30)', letterSpacing:2, marginBottom:14, fontWeight:600 }}>MONTHLY TREND — PD3 OEE</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {BARS.map(({label,pct,color},i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:62, fontSize:9, color:'rgba(255,255,255,.28)', textAlign:'right', flexShrink:0 }}>{label}</div>
                    <div style={{ flex:1, height:8, borderRadius:4, background:'rgba(255,255,255,.06)', overflow:'hidden' }}>
                      <div className="lp-mock-bar" style={{
                        height:'100%', borderRadius:4, background:color,
                        '--w':`${pct}%`,
                        width: visible ? `${pct}%` : '0',
                        transition:`width .9s cubic-bezier(.22,1,.36,1) ${i*.12+.3}s`,
                      }}/>
                    </div>
                    <div style={{ width:32, fontSize:9, color:'rgba(255,255,255,.35)', flexShrink:0 }}>{pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Glow underneath */}
      <div style={{
        position:'absolute', bottom:-40, left:'10%', right:'10%', height:80,
        background:'radial-gradient(ellipse, rgba(61,214,92,.22), transparent 70%)',
        filter:'blur(20px)', pointerEvents:'none',
      }}/>
    </div>
  );
}

// ─── 3-D floating logo ────────────────────────────────────────────────────────
const EXTRUDE = 18;
function Logo3D({ mouseX=0, mouseY=0 }) {
  return (
    <div style={{ position:'relative', width:'100%', height:'100%' }}>
      <div style={{
        position:'absolute', inset:-40, borderRadius:'20%', zIndex:0,
        background:'radial-gradient(circle, rgba(230,100,20,.30) 0%, transparent 65%)',
        animation:'lp-glow 8s ease-in-out infinite', pointerEvents:'none',
      }}/>
      <div style={{ width:'100%', height:'100%', position:'relative', zIndex:1, animation:'lp-float 6.5s ease-in-out infinite' }}>
        <div style={{ width:'100%', height:'100%', perspective:900, perspectiveOrigin:'50% 46%' }}>
          <div style={{
            width:'100%', height:'100%', transformStyle:'preserve-3d',
            transform:`rotateY(${mouseX*14}deg) rotateX(${-mouseY*8}deg)`,
            transition:'transform .12s ease-out',
            animation: mouseX === 0 ? 'lp-sway 9s ease-in-out infinite' : 'none',
            position:'relative',
          }}>
            {Array.from({ length: EXTRUDE }, (_,i) => (
              <div key={i} style={{
                position:'absolute', inset:0,
                transform:`translateZ(${-(EXTRUDE-i)*1.4}px)`,
                opacity:.08+(i/EXTRUDE)*.58,
                borderRadius:'14%', overflow:'hidden',
                filter:'brightness(.18) saturate(.4)',
              }}>
                <img src={tsLogo} alt="" draggable={false} style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}/>
              </div>
            ))}
            <div style={{ position:'absolute', inset:0, transform:'translateZ(.5px)', borderRadius:'14%', overflow:'hidden' }}>
              <img src={tsLogo} alt="" draggable={false} style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}/>
            </div>
            {/* Specular */}
            <div style={{ position:'absolute', inset:0, transform:'translateZ(1.5px)', borderRadius:'14%', overflow:'hidden', pointerEvents:'none' }}>
              <div style={{
                position:'absolute', inset:0,
                background:'linear-gradient(135deg, rgba(255,255,255,.12) 0%, transparent 44%)',
              }}/>
              <div style={{
                position:'absolute', top:0, bottom:0, left:0, width:'40%',
                background:'linear-gradient(90deg, transparent, rgba(255,255,255,.13), transparent)',
                animation:'lp-shine 5.5s ease-in-out 2.5s infinite',
              }}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ticker strip ─────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { l:'OEE PD3',  v:'87.4%', c:'#4ade80' },
  { l:'OEE PD4',  v:'79.2%', c:'#f59a3f' },
  { l:'Defect',   v:'142 PPM', c:'#f87171' },
  { l:'DL Cost',  v:'ON TRACK', c:'#4ade80' },
  { l:'OH Cost',  v:'MONITOR', c:'#fbbf24' },
  { l:'Sales',    v:'ON TRACK', c:'#4ade80' },
  { l:'Training', v:'96%', c:'#60a5fa' },
  { l:'PM Rate',  v:'100%', c:'#4ade80' },
];
function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{
      height:44, borderTop:'1px solid rgba(61,214,92,.09)', borderBottom:'1px solid rgba(61,214,92,.09)',
      background:'rgba(61,214,92,.03)', overflow:'hidden', display:'flex', alignItems:'center',
    }}>
      <div style={{
        flexShrink:0, padding:'0 18px', height:'100%', display:'flex', alignItems:'center',
        borderRight:'1px solid rgba(61,214,92,.12)',
        fontSize:8.5, fontWeight:800, letterSpacing:3, color:'#3dd65c', whiteSpace:'nowrap',
      }}>LIVE KPI</div>
      <div className="lp-ticker-wrap">
        <div className="lp-ticker-track">
          {items.map(({l,v,c},i)=>(
            <div key={i} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0 32px', borderRight:'1px solid rgba(255,255,255,.06)' }}>
              <span style={{ fontSize:9, color:'rgba(232,245,234,.30)', letterSpacing:2, textTransform:'uppercase' }}>{l}</span>
              <span style={{ fontSize:11, fontWeight:700, color:c, letterSpacing:.5 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const STATS = [
  { num:'35',  suffix:'ปี+',    label:'ประสบการณ์ผลิตชิ้นส่วน',  sublabel:'Years of Excellence', icon:'🏆' },
  { num:'3',   suffix:'Plants', label:'โรงงานผลิต',               sublabel:'PD3 · PD4 · JIG',    icon:'🏭' },
  { num:'100', suffix:'KPI+',   label:'ตัวชี้วัดหลัก',             sublabel:'Balanced Scorecard',  icon:'📊' },
  { num:'12',  suffix:'Month',  label:'ติดตามรายเดือนตลอดปี',     sublabel:'Auto-aggregated',     icon:'📅' },
];

const FEATURES = [
  {
    icon:'📊', title:'Real-time Dashboard', titleTH:'ติดตามผลแบบเรียลไทม์', accent:'#3dd65c',
    desc:'ภาพรวม KPI ทุกแผนก — PD3, PD4, JIG — บนหน้าจอเดียว พร้อมสถานะ ON TRACK / MONITOR / AT RISK และ Gauge Ring แสดงผล Achievement',
  },
  {
    icon:'🎯', title:'Target Management', titleTH:'บริหารจัดการเป้าหมาย', accent:'#f59a3f',
    desc:'กำหนด Target รายปีหรือรายเดือนสำหรับทุก KPI เปรียบเทียบ Actual vs Commitment แบบ Balanced Scorecard ครบ 4 มิติ',
  },
  {
    icon:'📈', title:'Trend Analysis', titleTH:'วิเคราะห์แนวโน้ม 12 เดือน', accent:'#60a5fa',
    desc:'กราฟแนวโน้มรายเดือน พร้อม Mini Spark Bar ทุก KPI ระบุ Pattern และสัญญาณเตือนก่อนเกิดปัญหา',
  },
  {
    icon:'⚙️', title:'OEE Monitoring', titleTH:'ติดตาม OEE แบบ Real-time', accent:'#c084fc',
    desc:'ดึงข้อมูล OEE จากชีทผลิตงานของ PD3 และ PD4 โดยตรง คำนวณ Availability, Performance, Quality อัตโนมัติ',
  },
  {
    icon:'📝', title:'Smart Data Entry', titleTH:'กรอกข้อมูลง่าย มีระบบตรวจสอบ', accent:'#f87171',
    desc:'ฟอร์มกรอกข้อมูล KPI รายเดือน แบ่งตาม Section · Category · Field พร้อม Validation และ Auto-save',
  },
  {
    icon:'🔐', title:'Role-based Access', titleTH:'ระบบสิทธิ์และความปลอดภัย', accent:'#fbbf24',
    desc:'Authentication ผ่าน Supabase, แยกสิทธิ์ผู้ใช้ต่อแผนก, Session Management และ Audit Trail ครบ',
  },
];

const TYPEWRITER_WORDS = ['KPI Dashboard', 'Performance Intelligence', 'Data-Driven Decisions'];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef  = useRef(null);
  const [mouse, setMouse] = useState({ x:0, y:0 });

  const handleMouse = useCallback((e) => {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - r.left) / r.width  - .5) * 2,
      y: ((e.clientY - r.top)  / r.height - .5) * 2,
    });
  }, []);

  // reveal on scroll
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('lp-visible'); });
    }, { threshold: 0.12 });
    document.querySelectorAll('.lp-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="lp-root" style={{
      minHeight:'100vh', background:'#040c05',
      color:'#e8f5ea', overflowX:'hidden',
    }}>
      <style>{CSS}</style>

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        onMouseMove={handleMouse}
        onMouseLeave={() => setMouse({ x:0, y:0 })}
        style={{
          position:'relative', minHeight:'100vh',
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          padding:'80px 24px 130px', overflow:'hidden',
        }}
      >
        {/* Aurora orbs */}
        <div className="lp-orb" style={{
          width:700, height:700, top:'-20%', left:'-18%',
          background:'radial-gradient(circle, rgba(13,61,20,.55), transparent 65%)',
          animation:'lp-aurora-1 18s ease-in-out infinite',
        }}/>
        <div className="lp-orb" style={{
          width:600, height:600, bottom:'-15%', right:'-14%',
          background:'radial-gradient(circle, rgba(232,124,30,.18), transparent 65%)',
          animation:'lp-aurora-2 22s ease-in-out infinite',
        }}/>
        <div className="lp-orb" style={{
          width:500, height:500, top:'30%', right:'5%',
          background:'radial-gradient(circle, rgba(61,214,92,.10), transparent 65%)',
          animation:'lp-aurora-3 14s ease-in-out infinite',
        }}/>

        {/* Grid */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
          backgroundImage:`
            linear-gradient(rgba(61,214,92,.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(61,214,92,.03) 1px, transparent 1px)`,
          backgroundSize:'60px 60px',
        }}/>
        {/* Radial fade */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
          background:'radial-gradient(ellipse 75% 60% at 50% 48%, rgba(13,61,20,.25), transparent 72%)',
        }}/>

        <Particles />

        {/* Hero two-column */}
        <div className="lp-hero-cols" style={{
          position:'relative', zIndex:2,
          display:'flex', alignItems:'center',
          gap:80, maxWidth:1180, width:'100%',
          animation:'lp-fade-in 1s ease .1s both',
        }}>
          {/* Left — copy */}
          <div style={{ flex:'0 0 auto', maxWidth:540 }}>
            {/* Eyebrow */}
            <div style={{ marginBottom:26, animation:'lp-fade-up .9s ease .2s both' }}>
              <span style={{
                display:'inline-flex', alignItems:'center', gap:9,
                padding:'5px 18px', borderRadius:100,
                border:'1px solid rgba(212,175,55,.40)',
                background:'rgba(212,175,55,.07)',
                fontSize:9.5, fontWeight:700, letterSpacing:3.5, color:'#d4af37',
              }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#d4af37' }}/>
                PERFORMANCE INTELLIGENCE PLATFORM
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize:'clamp(32px,5.5vw,60px)',
              fontWeight:900, lineHeight:1.07, letterSpacing:'-0.03em',
              color:'#fff', marginBottom:8,
              animation:'lp-fade-up 1s ease .35s both',
            }}>
              Thai Summit Group
            </h1>
            <h1 style={{
              fontSize:'clamp(32px,5.5vw,60px)',
              fontWeight:900, lineHeight:1.07, letterSpacing:'-0.03em',
              marginBottom:28,
              animation:'lp-fade-up 1s ease .45s both',
              minHeight:'1.2em',
            }}>
              <Typewriter words={TYPEWRITER_WORDS} speed={72} pause={2200}/>
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize:'clamp(14px,1.8vw,17px)',
              color:'rgba(232,245,234,.52)', maxWidth:460, lineHeight:1.84,
              marginBottom:44, animation:'lp-fade-up 1s ease .6s both',
            }}>
              ระบบบริหารจัดการ KPI สำหรับโรงงานผลิตชิ้นส่วนยานยนต์<br/>
              ครอบคลุมทุกแผนก · Balanced Scorecard · OEE · ตรวจสอบแบบเรียลไทม์
            </p>

            {/* CTAs */}
            <div style={{
              display:'flex', gap:14, flexWrap:'wrap',
              animation:'lp-fade-up 1s ease .75s both',
            }}>
              <button className="lp-btn" onClick={() => navigate('/login')} style={{
                padding:'15px 46px', borderRadius:14,
                background:'linear-gradient(138deg,#1a7a35,#3dd65c)',
                color:'#fff', fontSize:15, fontWeight:700, letterSpacing:'.04em',
                boxShadow:'0 8px 38px rgba(61,214,92,.30), 0 2px 8px rgba(0,0,0,.38)',
              }}>
                เข้าสู่ระบบ →
              </button>
              <button
                className="lp-btn-ghost"
                onClick={() => document.getElementById('lp-features')?.scrollIntoView({ behavior:'smooth' })}
                style={{
                  padding:'15px 36px', borderRadius:14,
                  border:'1px solid rgba(61,214,92,.22)',
                  background:'rgba(61,214,92,.04)',
                  color:'rgba(232,245,234,.66)', fontSize:15, fontWeight:600,
                }}
              >
                ดูฟีเจอร์ ↓
              </button>
            </div>

            {/* Trust strip */}
            <div style={{
              display:'flex', gap:22, marginTop:40, flexWrap:'wrap',
              animation:'lp-fade-up 1s ease .95s both',
            }}>
              {['🔒 Secure', '⚡ Real-time', '🏭 3 Plants', '📊 Balanced Scorecard'].map((t,i)=>(
                <span key={i} style={{
                  fontSize:11, color:'rgba(232,245,234,.30)',
                  fontWeight:500, letterSpacing:'.02em',
                }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Right — 3D logo */}
          <div style={{
            flex:'1 1 auto', display:'flex', justifyContent:'center',
            animation:'lp-scale-in 1.4s cubic-bezier(.22,1,.36,1) .15s both',
          }}>
            <div className="lp-logo-wrap" style={{ position:'relative', width:300, height:300 }}>
              {/* Orbit ring */}
              <div style={{
                position:'absolute', inset:-30, borderRadius:'50%',
                border:'1px solid rgba(61,214,92,.09)',
              }}>
                <div style={{
                  position:'absolute', width:10, height:10,
                  top:'50%', left:'50%', marginTop:-5, marginLeft:-5,
                  animation:'lp-orbit 12s linear infinite',
                }}>
                  <div style={{
                    width:10, height:10, borderRadius:'50%',
                    background:'#3dd65c', opacity:.65,
                    boxShadow:'0 0 8px rgba(61,214,92,.8)',
                  }}/>
                </div>
              </div>
              {/* Second orbit */}
              <div style={{
                position:'absolute', inset:-58, borderRadius:'50%',
                border:'1px solid rgba(230,100,20,.07)',
              }}>
                <div style={{
                  position:'absolute', width:7, height:7,
                  top:'50%', left:'50%', marginTop:-3.5, marginLeft:-3.5,
                  animation:'lp-orbit 20s linear reverse infinite',
                }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:'#e87c1e', opacity:.55 }}/>
                </div>
              </div>
              <Logo3D mouseX={mouse.x} mouseY={mouse.y}/>
              {/* Brand label */}
              <div style={{
                position:'absolute', bottom:-52, left:'50%', transform:'translateX(-50%)',
                textAlign:'center', whiteSpace:'nowrap',
              }}>
                <div style={{ fontSize:14, fontWeight:900, letterSpacing:'.22em', color:'#fff', textShadow:'0 0 24px rgba(230,100,20,.5)' }}>
                  THAI SUMMIT GROUP
                </div>
                <div style={{ fontSize:8.5, fontWeight:600, letterSpacing:'.32em', color:'rgba(255,255,255,.34)', marginTop:3 }}>
                  Excellence in Manufacturing
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div style={{
          position:'absolute', bottom:30, left:'50%', transform:'translateX(-50%)',
          display:'flex', flexDirection:'column', alignItems:'center', gap:7,
          animation:'lp-fade-up 1s ease 2s both', pointerEvents:'none',
          color:'rgba(232,245,234,.18)', fontSize:9, letterSpacing:3,
        }}>
          <span>SCROLL</span>
          <div style={{
            width:1, height:44,
            background:'linear-gradient(to bottom, rgba(61,214,92,.38), transparent)',
          }}/>
        </div>
      </section>

      {/* ══ TICKER ══════════════════════════════════════════════════════════ */}
      <Ticker/>

      {/* ══ STATS ═══════════════════════════════════════════════════════════ */}
      <section style={{ padding:'90px 24px', background:'linear-gradient(180deg,#040c05,#071409)' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <div className="lp-reveal" style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ fontSize:9.5, fontWeight:800, letterSpacing:4.5, color:'#3dd65c', marginBottom:14, textTransform:'uppercase' }}>
              Thai Summit at a Glance
            </div>
            <h2 style={{
              fontSize:'clamp(22px,3.5vw,40px)', fontWeight:800,
              background:'linear-gradient(135deg,#e8f5ea,#3dd65c)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>
              ตัวเลขที่บอกทุกอย่าง
            </h2>
          </div>
          <div className="lp-stat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18 }}>
            {STATS.map((s,i) => <StatCard key={i} {...s} delay={i*80}/>)}
          </div>
        </div>
      </section>

      {/* ══ DASHBOARD MOCKUP ════════════════════════════════════════════════ */}
      <section className="lp-mock-section" style={{ padding:'80px 24px 40px', background:'#071409', borderTop:'1px solid rgba(255,255,255,.04)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div className="lp-reveal" style={{ textAlign:'center', marginBottom:50 }}>
            <div style={{
              display:'inline-block', padding:'4px 18px', borderRadius:100,
              border:'1px solid rgba(61,214,92,.22)', background:'rgba(61,214,92,.07)',
              fontSize:9.5, fontWeight:800, letterSpacing:4, color:'#3dd65c', marginBottom:18,
            }}>PLATFORM PREVIEW</div>
            <h2 style={{
              fontSize:'clamp(22px,3.5vw,40px)', fontWeight:800,
              background:'linear-gradient(135deg,#e8f5ea,#3dd65c)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>
              ออกแบบเพื่อโรงงานอุตสาหกรรม
            </h2>
            <p style={{ color:'rgba(232,245,234,.40)', marginTop:14, fontSize:14, lineHeight:1.8, maxWidth:420, margin:'14px auto 0' }}>
              Interface เรียบง่าย ข้อมูลชัดเจน ตัดสินใจได้ทันที
            </p>
          </div>
          <DashMockup/>
        </div>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════════════════════ */}
      <section id="lp-features" style={{ padding:'90px 24px', background:'#071409', borderTop:'1px solid rgba(255,255,255,.04)' }}>
        <div style={{ maxWidth:1060, margin:'0 auto' }}>
          <div className="lp-reveal" style={{ textAlign:'center', marginBottom:60 }}>
            <div style={{
              display:'inline-block', padding:'4px 18px', borderRadius:100,
              border:'1px solid rgba(61,214,92,.22)', background:'rgba(61,214,92,.07)',
              fontSize:9.5, fontWeight:800, letterSpacing:4, color:'#3dd65c', marginBottom:18,
            }}>PLATFORM FEATURES</div>
            <h2 style={{
              fontSize:'clamp(24px,4vw,46px)', fontWeight:800,
              background:'linear-gradient(135deg,#e8f5ea,#3dd65c)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>
              ครบทุกมิติของ KPI
            </h2>
            <p style={{ color:'rgba(232,245,234,.40)', marginTop:16, fontSize:14, lineHeight:1.84, maxWidth:480, margin:'16px auto 0' }}>
              ออกแบบมาเพื่อการบริหารจัดการผลการดำเนินงาน<br/>
              ระดับโรงงานอุตสาหกรรมยานยนต์ครบวงจร
            </p>
          </div>

          <div className="lp-feat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:22 }}>
            {FEATURES.map((f,i) => <FeatureCard key={i} {...f} delay={i*70}/>)}
          </div>
        </div>
      </section>

      {/* ══ CTA ═════════════════════════════════════════════════════════════ */}
      <section style={{
        padding:'100px 24px', textAlign:'center',
        background:'linear-gradient(180deg,#071409,#040c05)',
        borderTop:'1px solid rgba(255,255,255,.04)',
        position:'relative', overflow:'hidden',
      }}>
        {/* Aurora accent */}
        <div className="lp-orb" style={{
          width:600, height:300, top:'10%', left:'50%', transform:'translateX(-50%)',
          background:'radial-gradient(ellipse, rgba(13,61,20,.35), transparent 70%)',
          animation:'lp-aurora-1 16s ease-in-out infinite',
        }}/>
        <div style={{ maxWidth:560, margin:'0 auto', position:'relative', zIndex:1 }}>
          {/* Logo emblem */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:36 }}>
            <div style={{
              width:80, height:80, borderRadius:18, overflow:'hidden',
              boxShadow:'0 0 52px rgba(230,100,20,.28), 0 0 0 1px rgba(230,100,20,.15), 0 0 0 12px rgba(230,100,20,.05)',
            }}>
              <img src={tsLogo} alt="Thai Summit Group" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
            </div>
          </div>
          {/* Ping dot */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:24 }}>
            <div style={{ position:'relative', width:8, height:8 }}>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#4ade80', animation:'lp-ping 1.8s ease-out infinite' }}/>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80' }}/>
            </div>
            <span style={{ fontSize:10.5, color:'rgba(74,222,128,.70)', fontWeight:600, letterSpacing:2 }}>SYSTEM ONLINE</span>
          </div>

          <h2 style={{
            fontSize:'clamp(24px,4.5vw,46px)', fontWeight:900, marginBottom:18,
            background:'linear-gradient(135deg,#ffffff,#4ade80)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            lineHeight:1.1,
          }}>
            พร้อมเริ่มต้นแล้วหรือยัง?
          </h2>
          <p style={{ color:'rgba(232,245,234,.44)', fontSize:15, lineHeight:1.9, marginBottom:44 }}>
            เข้าสู่ระบบเพื่อดูภาพรวม KPI ล่าสุด<br/>
            พร้อมข้อมูลเชิงลึกสำหรับการตัดสินใจอย่างแม่นยำ
          </p>
          <button className="lp-btn" onClick={() => navigate('/login')} style={{
            padding:'17px 60px', borderRadius:16,
            background:'linear-gradient(138deg,#1a7a35,#3dd65c)',
            color:'#fff', fontSize:16.5, fontWeight:700, letterSpacing:'.04em',
            boxShadow:'0 12px 56px rgba(61,214,92,.38), 0 2px 8px rgba(0,0,0,.42)',
          }}>
            เข้าสู่ระบบ →
          </button>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer style={{
        padding:'22px 32px',
        background:'#030a04',
        borderTop:'1px solid rgba(255,255,255,.055)',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        flexWrap:'wrap', gap:14,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:7, overflow:'hidden' }}>
            <img src={tsLogo} alt="TSG" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
          </div>
          <span style={{ fontSize:12, fontWeight:800, color:'#3dd65c', letterSpacing:'.10em' }}>THAI SUMMIT GROUP</span>
        </div>
        <span style={{ fontSize:10.5, color:'rgba(232,245,234,.22)', letterSpacing:'.04em' }}>
          KPI Performance Intelligence Platform
        </span>
        <div style={{ display:'flex', gap:20 }}>
          {['PD3','PD4','JIG','ALL'].map(t=>(
            <span key={t} style={{ fontSize:10, color:'rgba(232,245,234,.18)', fontWeight:600, letterSpacing:2 }}>{t}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
