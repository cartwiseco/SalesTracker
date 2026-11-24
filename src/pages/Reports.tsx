import React, { useEffect, useState } from 'react';
import { useLeads } from '../data/firestore';
import { monthBounds, now, inr } from '../lib/dates';

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

const STAGES = ['New Lead','Message Sent','Replied','Call Booked','Quote Sent','Won','Lost'];

const Reports: React.FC = () => {
  const { leads, settings, saveSettings } = useLeads();
  const [funnel, setFunnel] = useState<Record<string, number>>({});
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [bySource, setBySource] = useState<Record<string, number>>({});
  const [repliesByFu, setRepliesByFu] = useState<Record<string, number>>({});

  useEffect(() => {
    const allLeads = Object.values(leads);
    // Funnel counts per stage
    const f: Record<string, number> = {};
    STAGES.forEach(s => f[s] = 0);
    allLeads.forEach(l => { f[l.stage] = (f[l.stage]||0)+1; });
    setFunnel(f);

    // By category
    const cat: Record<string, number> = {};
    allLeads.forEach(l => {
      const c = l.category || 'Other';
      cat[c] = (cat[c]||0)+1;
    });
    setByCategory(cat);

    // By source
    const src: Record<string, number> = {};
    allLeads.forEach(l => {
      const s = l.source || 'Other';
      src[s] = (src[s]||0)+1;
    });
    setBySource(src);

    // Replies by follow‑up number (fu)
    const rb: Record<string, number> = {};
    allLeads.forEach(l => {
      if (l.replyDate) {
        const fu = (l.fu||0).toString();
        rb[fu] = (rb[fu]||0)+1;
      }
    });
    setRepliesByFu(rb);
  }, [leads]);

  // Helper to compute win rate
  const totalLeads = Object.values(leads).length;
  const wonLeads = funnel['Won'] || 0;
  const winRate = totalLeads ? Math.round((wonLeads/totalLeads)*100) : 0;

  // Revenue stats (same as Home)
  const currentDate = now();
  const month = monthBounds(currentDate);
  const monthStart = month.start;
  const monthEnd = month.end;
  const wonArray = Object.values(leads).filter(l=>l.stage==='Won');
  const monthRevenue = wonArray.filter(l=> l.wonDate && l.wonDate>=monthStart && l.wonDate<monthEnd).reduce((s,l:any)=>s+(l.value||0),0);

  // Targets display (same as Home but read‑only here)
  const targetLeadsPerDay = settings?.perDay || 0;
  const targetRevenueGoal = settings?.goal || 0;
  const gaps = settings?.gaps?.join(', ') || '1,3,7,14,21';

  const funnelBars = STAGES.map(stage => ({ label: stage, count: funnel[stage] || 0, color: SC[stage] }));
  const maxFunnel = Math.max(1, ...funnelBars.map(item => item.count));
  const categoryMax = Math.max(1, ...Object.values(byCategory));
  const sourceMax = Math.max(1, ...Object.values(bySource));
  const replyMax = Math.max(1, ...Object.values(repliesByFu));

  return (
    <div id="view">
      <h1>Reports</h1>
      <p className="sub">How your outreach is converting.</p>

      <div className="g">
        <section className="card">
          <h2>Funnel</h2>
          {funnelBars.map(item => (
            <div className="br" style={{'--c':item.color} as React.CSSProperties} key={item.label}><span>{item.label}</span><i><s style={{width:`${item.count/maxFunnel*100}%`}} /></i><b>{item.count}</b></div>
          ))}
          <p className="sub">Win rate: {winRate}%</p>
          <p className="sub">Revenue this month: {inr(monthRevenue)}</p>
        </section>

        <section className="card">
          <h2>Leads by Category</h2>
          {Object.entries(byCategory).map(([category,count]) => (
            <div className="br" style={{'--c':'var(--brand)'} as React.CSSProperties} key={category}><span>{category}</span><i><s style={{width:`${count/categoryMax*100}%`}} /></i><b>{count}</b></div>
          ))}
        </section>

        <section className="card">
          <h2>Leads by Source</h2>
          {Object.entries(bySource).map(([source,count]) => (
            <div className="br" style={{'--c':'var(--brand)'} as React.CSSProperties} key={source}><span>{source}</span><i><s style={{width:`${count/sourceMax*100}%`}} /></i><b>{count}</b></div>
          ))}
        </section>

        <section className="card t-blue">
          <h2>Replies by Follow-up</h2>
          {Object.entries(repliesByFu).sort((a,b)=>+a[0]-+b[0]).map(([fu,count]) => (
            <div className="br" style={{'--c':'var(--brand)'} as React.CSSProperties} key={fu}><span>{+fu === 0 ? 'After first message' : `After follow-up ${fu}`}</span><i><s style={{width:`${count/replyMax*100}%`}} /></i><b>{count}</b></div>
          ))}
          {Object.keys(repliesByFu).length === 0 && <div className="sub">No replies yet.</div>}
        </section>
      </div>

      <section className="card t-grey">
        <h2>Targets</h2>
        <div className="set">
          <div><label>Leads per day</label><input type="number" value={settings?.perDay || 0} onChange={e=>saveSettings({...(settings || {}), perDay:+e.target.value || 0} as any)} /></div>
          <div><label>Monthly goal (₹)</label><input type="number" value={settings?.goal || 0} onChange={e=>saveSettings({...(settings || {}), goal:+e.target.value || 0} as any)} /></div>
          <div><label>Assumed quote win rate (%)</label><input type="number" value={settings?.win || 30} onChange={e=>saveSettings({...(settings || {}), win:+e.target.value || 0} as any)} /></div>
          <div><label>Working days a week</label><input type="number" value={settings?.days || 5} onChange={e=>saveSettings({...(settings || {}), days:+e.target.value || 0} as any)} /></div>
        </div>
        <div style={{marginTop:'12px',maxWidth:'380px'}}><label>Follow-up gaps in days</label><input value={gaps} onChange={e=>{
          const clean = e.target.value.split(/[ ,]+/).map(Number).filter(n=>n>0).filter((n,i,a)=>i===0 || n>a[i-1]).slice(0,5);
          if(clean.length) saveSettings({...(settings || {}), gaps:clean} as any);
        }} /></div>
      </section>
    </div>
  );
};

export default Reports;
