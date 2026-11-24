import React, { useEffect, useState } from 'react';
import { useLeads } from '../data/firestore';
import { iso, today, gap, addDays, inr } from '../lib/dates';
import { checks } from '../lib/checks';
import { buildQueue, QueueItem, startReviewList } from '../lib/queue';
import { due, fuStatus, gapList } from '../lib/followUps';
import { fillTemplate, DEFAULT_TEMPLATES } from '../lib/templates';
import { planRows, nextAction } from '../lib/plan';

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
  const { leads, settings, saveLead } = useLeads();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [draftText, setDraftText] = useState('');

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
  const todayString = today();
  const plan = planRows(leads, settings, todayString);
  const next = nextAction(leads, settings, todayString);
  const addedThisWeek = leadArray.filter(l=>{
    const added = l.added;
    if(!added) return false;
    const diff = gap(added, today());
    return diff<=6;
  }).length;
  const firstMsgs = plan.counts.firstMessagesSent;
  const followUpsDue = plan.stillDue;
  const planTargets = {
    followUps: settings?.perDay || 15, // using perDay as target for follow‑ups for demo
    find: settings?.perDay || 15,
    firstMsg: settings?.perDay || 15,
  };

  // Update document title with queue count
  useEffect(()=>{
    const count = queue.filter(item => item.key === 'fu').length;
    document.title = (count?`(${count}) `:'')+'Cart Wise Co: Lead Tracker';
  },[queue]);

  const readyForFirstMessage = leadArray.filter(l => l.stage === 'New Lead').slice(0, 50);

  const openDraft = (leadId: string, ids?: string[]) => {
    const list = ids || [leadId];
    const index = list.indexOf(leadId);
    setReviewIds(list);
    setReviewIndex(Math.max(0, index));
    const lead = leads[leadId];
    if (!lead) return;
    const templateIndex = lead.stage === 'New Lead'
      ? 0
      : gapList(settings).length === 0
        ? 0
        : Math.min(gapList(settings).length - 1, (lead.fu || 0) + 1);
    const template = settings?.tpl?.[templateIndex] || DEFAULT_TEMPLATES[templateIndex];
    setDraftText(fillTemplate(template, lead));
  };

  const openReview = () => {
    const ids = startReviewList(leads, settings);
    if (!ids.length) return;
    openDraft(ids[0], ids);
  };

  const closeReview = () => {
    setReviewIds([]);
    setReviewIndex(0);
    setDraftText('');
  };

  const sentLead = async (leadId: string) => {
    const lead = leads[leadId];
    if (!lead) return;
    const firstMessage = lead.stage === 'New Lead';
    const gaps = gapList(settings);
    const nextFu = firstMessage ? 0 : Math.min(gaps.length, (lead.fu || 0) + 1);
    const updated = {
      ...lead,
      stage: firstMessage ? 'Message Sent' : lead.stage,
      firstMsg: firstMessage ? todayString : lead.firstMsg,
      fu: nextFu,
      lastContacted: todayString,
      log: [...(lead.log || []), { t: todayString, x: firstMessage ? 'First message sent' : `Follow-up ${nextFu} sent` }],
    };
    await saveLead(updated);
  };

  const doneSend = async () => {
    const leadId = reviewIds[reviewIndex];
    if (!leadId) return;
    await sentLead(leadId);
    if (reviewIndex + 1 < reviewIds.length) {
      const nextIndex = reviewIndex + 1;
      setReviewIndex(nextIndex);
      const lead = leads[reviewIds[nextIndex]];
      if (lead) {
        const gaps = gapList(settings);
        const templateIndex = lead.stage === 'New Lead' ? 0 : Math.min(gaps.length - 1, (lead.fu || 0) + 1);
        setDraftText(fillTemplate(settings?.tpl?.[templateIndex] || DEFAULT_TEMPLATES[templateIndex], lead));
      }
    } else {
      closeReview();
    }
  };

  const skipReview = () => {
    if (reviewIndex + 1 < reviewIds.length) {
      const nextIndex = reviewIndex + 1;
      setReviewIndex(nextIndex);
      const lead = leads[reviewIds[nextIndex]];
      if (lead) {
        const gaps = gapList(settings);
        const templateIndex = lead.stage === 'New Lead' ? 0 : Math.min(gaps.length - 1, (lead.fu || 0) + 1);
        setDraftText(fillTemplate(settings?.tpl?.[templateIndex] || DEFAULT_TEMPLATES[templateIndex], lead));
      }
    } else {
      closeReview();
    }
  };

  const reviewLead = reviewIds.length ? leads[reviewIds[reviewIndex]] : null;
  const needsFixing = leadArray.filter(l => checks(l).length).slice(0, 5);

  const copyDraft = async () => {
    try { await navigator.clipboard.writeText(draftText); } catch { /* fallback: leave text selected by the browser */ }
  };

  const openChannel = () => {
    if (!reviewLead) return;
    const handle = (reviewLead.handle || '').trim();
    const digits = handle.replace(/\D/g, '');
    if (reviewLead.route === 'WhatsApp') {
      const phone = digits.length === 10 ? `91${digits}` : digits;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(draftText)}`, '_blank');
    } else if (reviewLead.route === 'Email') {
      const subject = `Quick idea for ${reviewLead.brand}`;
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(handle)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(draftText)}`, '_blank', 'noopener,noreferrer');
    } else {
      navigator.clipboard.writeText(draftText).catch(() => undefined);
      const link = reviewLead.link || (handle ? `https://instagram.com/${handle.replace(/^@/, '')}` : '');
      if (link) window.open(/^https?:/.test(link) ? link : `https://${link}`, '_blank', 'noopener,noreferrer');
    }
  };

  const reviewWhy = reviewLead
    ? (() => {
        if (reviewLead.stage === 'New Lead') return 'Ready for a first message';
        const status = fuStatus(reviewLead, settings);
        if (status === 'Overdue') {
          const dueDate = due(reviewLead, settings);
          return `Follow-up ${(reviewLead.fu || 0) + 1} of ${gapList(settings).length}, ${gap(dueDate, todayString)} days late`;
        }
        if (status === 'Due today') return `Follow-up ${(reviewLead.fu || 0) + 1} of ${gapList(settings).length}, due today`;
        return status;
      })()
    : '';

  const handleNext = () => {
    if (next.action === 'review') openReview();
    if (next.action === 'find') {
      window.dispatchEvent(new CustomEvent('cartwise-go', { detail: 'find' }));
    }
  };

  return (
    <div id="view">
      <h1>Home</h1>
      <p className="sub">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      <div className="card plan" style={{marginBottom:'16px'}}>
        <h2>Your plan for today</h2>
        <div style={{margin:'12px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px'}}><b>1. Follow up</b><span>{plan.followUp.done} of {plan.followUp.total}</span></div>
          <div className="pt"><div className={`pf${plan.followUp.doneStyle ? ' done' : ''}`} style={{width:`${plan.followUp.percent}%`}} /></div>
          <div className="sub" style={{margin:'0'}}>{plan.stillDue > 0 ? `${plan.stillDue} still due. Do these first, they close the most deals.` : 'All follow-ups are done for today.'}</div>
        </div>
        <div style={{margin:'12px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px'}}><b>2. Find new leads</b><span>{plan.find.done} of {plan.find.total}</span></div>
          <div className="pt"><div className={`pf${plan.find.doneStyle ? ' done' : ''}`} style={{width:`${plan.find.percent}%`}} /></div>
          <div className="sub" style={{margin:'0'}}>Use Find leads. Goal: {plan.find.total} well-checked leads (change it under Reports, Targets).</div>
        </div>
        <div style={{margin:'12px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px'}}><b>3. Send first messages</b><span>{plan.firstMessage.done} of {plan.firstMessage.total}</span></div>
          <div className="pt"><div className={`pf${plan.firstMessage.doneStyle ? ' done' : ''}`} style={{width:`${plan.firstMessage.percent}%`}} /></div>
          <div className="sub" style={{margin:'0'}}>Start review sends new leads after your overdue follow-ups.</div>
        </div>
        {next.action ? <button className="btn pri" onClick={handleNext}>Next: {next.label}</button> : <b style={{color:'#7ce0a8'}}>{next.label}</b>}
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
            const action = q.key==='fu' ? <><button className="btn sm" onClick={()=>openDraft(l.id,[l.id])}>Draft</button><button className="btn sm pri" onClick={()=>sentLead(l.id)}>Sent</button></> : q.key==='close' ? <button className="btn sm">Close lead</button> : <><button className="btn sm" onClick={()=>void saveLead({...l,nextAction:addDays(todayString,2)})}>Push 2 days</button><button className="btn sm pri" onClick={()=>openDraft(l.id,[l.id])}>Open</button></>;
            return <div className="t" style={{'--c':SC[l.stage]} as React.CSSProperties} key={l.id}><div className="ic">{(l.brand||'?').charAt(0).toUpperCase()}</div><div className="x"><b>{l.brand}</b>{q.tag && <span className={`tag ${q.tag==='Overdue'||q.tag==='Set date'?'bad':q.tag==='Due today'?'warn':'ok'}`}> {q.tag}</span>}<span /></div><div className="a">{action}</div></div>;
          })}
        </div>
        <div className="card t-green">
          <h2>Ready for a first message ({readyForFirstMessage.length})</h2>
          {readyForFirstMessage.length === 0 ? <div className="empty">No new leads waiting.</div> : readyForFirstMessage.map(l => (
            <div className="t" style={{'--c':SC[l.stage]} as React.CSSProperties} key={l.id}><div className="ic">{(l.brand||'?').charAt(0).toUpperCase()}</div><div className="x"><b>{l.brand}</b><span>{l.observation || 'No observation yet'}</span></div><div className="a"><button className="btn sm" onClick={()=>openDraft(l.id,[l.id])}>Draft</button><button className="btn sm pri" onClick={()=>sentLead(l.id)}>Sent</button></div></div>
          ))}
        </div>
      </div>

      {needsFixing.length > 0 && <div className="card t-red"><h2>Needs fixing ({needsFixing.length})</h2>{needsFixing.map(l => <div className="t" key={l.id}><div className="x"><b>{l.brand}</b><span>{checks(l).join(', ')}</span></div><button className="btn sm">Fix</button></div>)}</div>}

      {reviewLead && (
        <div id="modal" style={{display:'block'}}>
          <div className="rec">
            <div className="rh">
              <div>
                <small>Item {reviewIndex + 1} of {reviewIds.length}</small>
                <h1>{reviewLead.brand}</h1>
              </div>
              <span className="sp" />
              <button className="btn" onClick={closeReview} aria-label="Close draft">×</button>
            </div>
            <div className="rb">
              <p className="sub">{reviewWhy}</p>
              <textarea className="draft" rows={7} value={draftText} onChange={event => setDraftText(event.target.value)} />
              <div style={{display:'flex',gap:'8px',marginTop:'12px',flexWrap:'wrap'}}>
                <button className="btn" onClick={copyDraft}>Copy</button>
                <button className="btn pri" onClick={openChannel}>{reviewLead.route === 'WhatsApp' ? 'Open WhatsApp' : reviewLead.route === 'Email' ? 'Open email' : 'Copy and open profile'}</button>
              </div>
            </div>
            <div className="rf">
              <button className="btn" onClick={skipReview}>Skip</button>
              <button className="btn pri" onClick={doneSend}>{reviewIndex + 1 === reviewIds.length ? 'I sent it' : 'I sent it, next'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeDashboard;
