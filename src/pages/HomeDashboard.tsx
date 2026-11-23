import React, { useEffect, useState } from 'react';
import { useLeads } from '../data/firestore';
import { iso, today, gap, inr } from '../lib/dates';
import { checks } from '../lib/checks';
import { buildQueue, QueueItem } from '../lib/queue';

// Stage colors (same as reference)
const SC: Record<string, string> = {
  'New Lead': '#6b7a90',
  'Message Sent': '#0176d3',
  'Replied': '#06a59a',
  'Call Booked': '#7f5bd6',
  'Quote Sent': '#fe9339',
  Won: '#2e844a',
  Lost: '#ba0517',
};

// Simple SVG gauge (same as reference) – percent 0‑100
function Gauge({percent}:{percent:number}){
  const len=219.9;
  const dash = `${(len*percent/100).toFixed(1)} ${len}`;
  return (
    <svg viewBox="0 0 160 96" style={{width:'100%',maxWidth:'260px'}}>
      <path d="M10 84A70 70 0 0 1 150 84" fill="none" stroke="var(--chip)" strokeWidth="14" strokeLinecap="round" />
      <path d="M10 84A70 70 0 0 1 150 84" fill="none" stroke="#2e844a" strokeWidth="14" strokeLinecap="round" strokeDasharray={dash} />
      <text x="80" y="76" textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--ink)">{Math.round(percent)}%</text>
    </svg>
  );
}

const HomeDashboard: React.FC = () => {
  const { leads, settings } = useLeads();
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(()=>{
    setQueue(buildQueue(leads, settings));
  },[leads,settings]);

  // ----- Stats calculations (mirrors reference.stats()) -----
  const now = new Date();
  const monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = iso(new Date(now.getFullYear(), now.getMonth()+1, 1));
  const leadArray = Object.values(leads);
  const won = leadArray.filter(l=>l.stage==='Won');
  const sum = (arr:any[])=>arr.reduce((s,l:any)=>s+ (l.value||0),0);
  const monthRevenue = sum(won.filter(l=>l.wonDate && l.wonDate>=monthStart && l.wonDate<monthEnd));
  const goal = settings?.goal||300000;
  const pct = Math.min(100, monthRevenue/goal*100);

  // ----- Plan calculations -----
  const addedThisWeek = leadArray.filter(l=>{
    const added = l.added;
    if(!added) return false;
    const diff = gap(added, today());
    return diff<=6;
  }).length;
  const firstMsgs = leadArray.filter(l=> l.stage!=='New Lead').length;
  const followUpsDue = queue.filter(q=> q.key==='fu').length;
  const planTargets = {
    followUps: settings?.perDay || 15, // using perDay as target for follow‑ups for demo
    find: settings?.perDay || 15,
    firstMsg: settings?.perDay || 15,
  };

  // Update document title with queue count
  useEffect(()=>{
    const count = queue.length;
    document.title = (count?`(${count}) `:'')+'Cart Wise Co: Lead Tracker';
  },[queue]);

  const readyForFirstMessage = leadArray.filter(l => l.stage === 'New Lead').slice(0, 50);
  const needsFixing = leadArray.filter(l => checks(l).length).slice(0, 5);

  return (
    <div id="view">
      <h1>Home</h1>
      <p className="sub">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      <div className="card plan" style={{marginBottom:'16px'}}>
        <h2>Your plan for today</h2>
        <div style={{margin:'12px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px'}}><b>1. Follow up</b><span>{followUpsDue} of {planTargets.followUps + followUpsDue}</span></div>
          <div className="pt"><div className={`pf${followUpsDue >= planTargets.followUps ? ' done' : ''}`} style={{width:`${Math.min(100, planTargets.followUps + followUpsDue ? followUpsDue / (planTargets.followUps + followUpsDue) * 100 : 0)}%`}} /></div>
          <div className="sub" style={{margin:'0'}}>{followUpsDue ? `${followUpsDue} still due. Do these first, they close the most deals.` : 'All follow-ups are done for today.'}</div>
        </div>
        <div style={{margin:'12px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px'}}><b>2. Find new leads</b><span>{addedThisWeek} of {planTargets.find}</span></div>
          <div className="pt"><div className={`pf${addedThisWeek >= planTargets.find ? ' done' : ''}`} style={{width:`${Math.min(100, planTargets.find ? addedThisWeek / planTargets.find * 100 : 0)}%`}} /></div>
          <div className="sub" style={{margin:'0'}}>Use Find leads. Goal: {planTargets.find} well-checked leads (change it under Reports, Targets).</div>
        </div>
        <div style={{margin:'12px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px'}}><b>3. Send first messages</b><span>{firstMsgs} of {planTargets.firstMsg}</span></div>
          <div className="pt"><div className={`pf${firstMsgs >= planTargets.firstMsg ? ' done' : ''}`} style={{width:`${Math.min(100, planTargets.firstMsg ? firstMsgs / planTargets.firstMsg * 100 : 0)}%`}} /></div>
          <div className="sub" style={{margin:'0'}}>Start review sends new leads after your overdue follow-ups.</div>
        </div>
        <button className="btn pri" onClick={()=>alert('Next step placeholder')}>Next</button>
      </div>

      <div className="g">
        <div className="card t-purple" style={{textAlign:'center'}}>
          <h2 style={{textAlign:'left'}}>Monthly revenue goal</h2>
          <Gauge percent={pct} />
          <b style={{fontSize:'22px',display:'block'}}>{inr(monthRevenue)}</b>
          <span className="sub">of {inr(goal)}</span>
        </div>
        <div className="kpis">
          <div className="card kpi t-teal"><small>Open quotes</small><b>{inr(leadArray.filter(l=>l.stage==='Quote Sent').reduce((s,l:any)=>s+(l.value||0),0))}</b></div>
          <div className="card kpi t-teal"><small>Expected at {settings?.win||30}%</small><b>{inr(Math.round(leadArray.filter(l=>l.stage==='Quote Sent').reduce((s,l:any)=>s+(l.value||0),0)*(settings?.win||30)/100))}</b></div>
          <div className="card kpi t-amber"><small>Needs action</small><b>{queue.length}</b></div>
          <div className="card kpi t-green"><small>Added this week</small><b>{addedThisWeek} / {(settings?.perDay||15)*(settings?.days||5)}</b></div>
        </div>
      </div>

      <div className="g">
        <div className="card t-amber">
          <h2>Tasks for today ({queue.length})</h2>
          {queue.length === 0 ? <div className="empty">Nothing is due. Add leads or send first messages.</div> : queue.slice(0,50).map(q => {
            const l = q.lead;
            const action = q.key==='fu' ? <><button className="btn sm">Draft</button><button className="btn sm pri">Sent</button></> : q.key==='close' ? <button className="btn sm">Close lead</button> : <><button className="btn sm">Push 2 days</button><button className="btn sm pri">Open</button></>;
            return <div className="t" style={{'--c':SC[l.stage]} as React.CSSProperties} key={l.id}><div className="ic">{(l.brand||'?').charAt(0).toUpperCase()}</div><div className="x"><b>{l.brand}</b>{q.tag && <span className={`tag ${q.tag==='Overdue'||q.tag==='Set date'?'bad':q.tag==='Due today'?'warn':'ok'}`}> {q.tag}</span>}<span /></div><div className="a">{action}</div></div>;
          })}
        </div>
        <div className="card t-green">
          <h2>Ready for a first message ({readyForFirstMessage.length})</h2>
          {readyForFirstMessage.length === 0 ? <div className="empty">No new leads waiting.</div> : readyForFirstMessage.map(l => (
            <div className="t" style={{'--c':SC[l.stage]} as React.CSSProperties} key={l.id}><div className="ic">{(l.brand||'?').charAt(0).toUpperCase()}</div><div className="x"><b>{l.brand}</b><span>{l.observation || 'No observation yet'}</span></div><div className="a"><button className="btn sm">Draft</button><button className="btn sm pri">Sent</button></div></div>
          ))}
        </div>
      </div>

      {needsFixing.length > 0 && <div className="card t-red"><h2>Needs fixing ({needsFixing.length})</h2>{needsFixing.map(l => <div className="t" key={l.id}><div className="x"><b>{l.brand}</b><span>{checks(l).join(', ')}</span></div><button className="btn sm">Fix</button></div>)}</div>}
    </div>
  );
};

export default HomeDashboard;
