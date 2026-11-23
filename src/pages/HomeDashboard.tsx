import React, { useEffect, useState } from 'react';
import { useLeads } from '../data/firestore';
import { iso, today, gap, inr } from '../lib/dates';
import { DEFAULT_GAPS } from '../lib/followUps';
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
  const { leads, settings, saveSettings } = useLeads();
  const [gapsInput, setGapsInput] = useState('');
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

  const handleGapsSave = () => {
    const arr = gapsInput.split(/[ ,]+/).map(Number).filter(n=>n>0);
    // enforce ascending order and remove duplicates beyond first
    const clean = arr.filter((n,i)=> i===0 || n>arr[i-1]).slice(0,5);
    const newSettings = {...settings, gaps: clean.length?clean:DEFAULT_GAPS};
    saveSettings(newSettings as any);
  };

  // Update document title with queue count
  useEffect(()=>{
    const count = queue.length;
    document.title = (count?`(${count}) `:'')+'Cart Wise Co: Lead Tracker';
  },[queue]);

  return (
    <div id="view">
      {/* Plan card */}
      <div className="card plan" style={{marginBottom:'16px'}}>
        <h2>Your plan for today</h2>
        {/* Follow‑ups */}
        <div className="row" style={{marginBottom:'12px'}}>
          <b>1. Follow up</b> {followUpsDue} of {planTargets.followUps}
          <div className="pt"><div className={"pf"+(followUpsDue>=planTargets.followUps?" done":"")} style={{width:`${Math.min(100,followUpsDue/planTargets.followUps*100)}%`}}/></div>
          <div className="sub">{followUpsDue?`${followUpsDue} still due.`:'All follow‑ups done.'}</div>
        </div>
        {/* Find leads */}
        <div className="row" style={{marginBottom:'12px'}}>
          <b>2. Find new leads</b> {addedThisWeek} of {planTargets.find}
          <div className="pt"><div className={"pf"+(addedThisWeek>=planTargets.find?" done":"")} style={{width:`${Math.min(100,addedThisWeek/planTargets.find*100)}%`}}/></div>
          <div className="sub">Use Find leads. Goal: {planTargets.find} well‑checked leads.</div>
        </div>
        {/* First messages */}
        <div className="row" style={{marginBottom:'12px'}}>
          <b>3. Send first messages</b> {firstMsgs} of {planTargets.firstMsg}
          <div className="pt"><div className={"pf"+(firstMsgs>=planTargets.firstMsg?" done":"")} style={{width:`${Math.min(100,firstMsgs/planTargets.firstMsg*100)}%`}}/></div>
          <div className="sub">Start review sends new leads after overdue follow‑ups.</div>
        </div>
        {/* Next button placeholder */}
        <button className="btn pri" onClick={()=>alert('Next step placeholder')}>Next</button>
      </div>

      {/* KPI cards */}
      <div className="g">
        <div className="card kpi t-teal">
          <small>Monthly revenue goal</small>
          <Gauge percent={pct} />
          <b>{inr(monthRevenue)}</b>
          <span className="sub">of {inr(goal)}</span>
        </div>
        <div className="card kpi t-teal">
          <small>Open quotes</small>
          <b>{inr(leadArray.filter(l=>l.stage==='Quote Sent').reduce((s,l:any)=>s+(l.value||0),0))}</b>
        </div>
        <div className="card kpi t-teal">
          <small>Expected at {settings?.win||30}%</small>
          <b>{inr(Math.round(leadArray.filter(l=>l.stage==='Quote Sent').reduce((s,l:any)=>s+(l.value||0),0)* (settings?.win||30)/100))}</b>
        </div>
        <div className="card kpi t-amber">
          <small>Needs action</small>
          <b>{queue.length}</b>
        </div>
        <div className="card kpi t-green">
          <small>Added this week</small>
          <b>{addedThisWeek} / {(settings?.perDay||15)*(settings?.days||5)}</b>
        </div>
      </div>

      {/* Tasks for today */}
      <div className="card t-amber" style={{marginTop:'24px'}}>
        <h2>Tasks for today ({queue.length})</h2>
        {queue.length===0 ? (
          <div className="empty">Nothing is due. Add leads or send first messages.</div>
        ) : (
          <div className="tw">
            <table>
              <tbody>
                {queue.slice(0,50).map((q:any)=>{
                  const l = q.lead;
                  const actionBtn = q.key==='fu' ? (
                    <>
                      <button className="btn sm" onClick={()=>alert('Draft placeholder')}>Draft</button>
                      <button className="btn sm pri" onClick={()=>alert('Sent placeholder')}>Sent</button>
                    </>
                  ) : q.key==='close' ? (
                    <button className="btn sm" onClick={()=>alert('Close lead placeholder')}>Close lead</button>
                  ) : (
                    <>
                      <button className="btn sm" onClick={()=>alert('Push 2 days')}>Push 2 days</button>
                      <button className="btn sm pri" onClick={()=>alert('Open')}>Open</button>
                    </>
                  );
                  return (
                    <tr key={l.id} className="t" style={{ '--c': SC[l.stage] } as React.CSSProperties}>
                      <td className="ic">{(l.brand||'?').charAt(0).toUpperCase()}</td>
                      <td><b>{l.brand}</b> {q.tag && <span className="tag {q.tag==='Overdue'||q.tag==='Due today'?'bad':'warn'}">{q.tag}</span>}</td>
                      <td>{actionBtn}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editable gaps */}
      <div className="card" style={{marginTop:'24px'}}>
        <h2>Edit follow‑up gaps</h2>
        <input placeholder="e.g. 1,3,7,14,21" value={gapsInput} onChange={e=>setGapsInput(e.target.value)} />
        <button className="btn pri" onClick={handleGapsSave}>Save gaps</button>
        <div className="sub">Current gaps: { (settings?.gaps||DEFAULT_GAPS).join(', ') }</div>
      </div>
    </div>
  );
};

export default HomeDashboard;
