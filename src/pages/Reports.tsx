import React, { useEffect, useState } from 'react';
import { useLeads } from '../data/firestore';
import { iso, inr } from '../lib/dates';

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
  const { leads, settings } = useLeads();
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
  const now = new Date();
  const monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = iso(new Date(now.getFullYear(), now.getMonth()+1, 1));
  const wonArray = Object.values(leads).filter(l=>l.stage==='Won');
  const monthRevenue = wonArray.filter(l=> l.wonDate && l.wonDate>=monthStart && l.wonDate<monthEnd).reduce((s,l:any)=>s+(l.value||0),0);

  // Targets display (same as Home but read‑only here)
  const targetLeadsPerDay = settings?.perDay || 0;
  const targetRevenueGoal = settings?.goal || 0;
  const gaps = settings?.gaps?.join(', ') || '1,3,7,14,21';

  return (
    <div id="view" className="card" style={{padding:'20px'}}>
      <h1>Reports</h1>
      <p className="sub">Analytics derived from your leads data.</p>

      {/* Funnel */}
      <section>
        <h2>Funnel (by stage)</h2>
        <table className="tw">
          <thead><tr>{STAGES.map(s=> <th key={s}>{s}</th>)}</tr></thead>
          <tbody><tr>{STAGES.map(s=> <td key={s}>{funnel[s]||0}</td>)}</tr></tbody>
        </table>
        <p className="sub">Win rate: {winRate}%</p>
        <p className="sub">Revenue this month: {inr(monthRevenue)}</p>
      </section>

      {/* By Category */}
      <section style={{marginTop:'24px'}}>
        <h2>Leads by Category</h2>
        <table className="tw">
          <thead><tr><th>Category</th><th>Count</th></tr></thead>
          <tbody>
            {Object.entries(byCategory).map(([cat,count])=> (
              <tr key={cat}><td>{cat}</td><td>{count}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* By Source */}
      <section style={{marginTop:'24px'}}>
        <h2>Leads by Source</h2>
        <table className="tw">
          <thead><tr><th>Source</th><th>Count</th></tr></thead>
          <tbody>
            {Object.entries(bySource).map(([src,count])=> (
              <tr key={src}><td>{src}</td><td>{count}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Replies by Follow‑up number */}
      <section style={{marginTop:'24px'}}>
        <h2>Replies by Follow‑up number</h2>
        <table className="tw">
          <thead><tr><th>Follow‑up #</th><th>Replies</th></tr></thead>
          <tbody>
            {Object.entries(repliesByFu).sort((a,b)=>+a[0]-+b[0]).map(([fu,count])=> (
              <tr key={fu}><td>{fu}</td><td>{count}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Targets */}
      <section style={{marginTop:'24px'}}>
        <h2>Targets</h2>
        <ul>
          <li>Leads per day: {targetLeadsPerDay}</li>
          <li>Revenue goal (monthly): {inr(targetRevenueGoal)}</li>
          <li>Follow‑up gaps (days): {gaps}</li>
        </ul>
      </section>
    </div>
  );
};

export default Reports;
