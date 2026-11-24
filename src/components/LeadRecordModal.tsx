import React, { useState } from 'react';
import { Lead } from '../models/Lead';
import { Settings } from '../models/Settings';
import { OPT } from '../pages/FindLeads';
import { STAGES } from '../lib/csv';
import { checks } from '../lib/checks';
import { today, now } from '../lib/dates';

const STAGE_COLORS: Record<string, string> = {
  'New Lead':'#6b7a90', 'Message Sent':'#0176d3', Replied:'#06a59a',
  'Call Booked':'#7f5bd6', 'Quote Sent':'#fe9339', Won:'#2e844a', Lost:'#ba0517',
};

const EMPTY_LEAD = (n: number): Lead => ({
  id:`l${now().getTime().toString(36)}${Math.random().toString(36).slice(2,6)}`,
  n,
  stage:'New Lead',
  added:today(),
  fu:0,
  audit:'No',
  founding:'No',
  budget:'Unknown',
  service:'Other',
  leadType:'Running ads',
  source:'Other',
  category:'Other',
  platform:'Unknown',
  route:'WhatsApp',
  brand:'',
  link:'',
  observation:'',
  contact:'',
  handle:'',
  value:0,
  dealType:'One-time project',
  lostReason:'',
  notes:'',
  log:[],
});

const optionSets: Record<string, string[]> = {
  route:OPT.route, category:OPT.category, source:OPT.source, leadType:OPT.leadType,
  platform:OPT.platform, budget:OPT.budget, service:OPT.service, dealType:OPT.dealType,
  lostReason:OPT.lostReason, audit:OPT.yn, founding:OPT.yn,
};

type Field = { key:keyof Lead; label:string; kind:'text'|'date'|'number'|'textarea'|'select'; required?:boolean };
const sections: Array<{title:string; fields:Field[]}> = [
  { title:'Lead information', fields:[
    {key:'brand',label:'Brand or store *',kind:'text',required:true},
    {key:'contact',label:'Contact person',kind:'text'},
    {key:'route',label:'Contact route',kind:'select'},
    {key:'handle',label:'Phone, handle or email',kind:'text'},
    {key:'link',label:'Store or Instagram link',kind:'text'},
    {key:'category',label:'Category',kind:'select'},
    {key:'source',label:'Source',kind:'select'},
    {key:'leadType',label:'Lead type',kind:'select'},
    {key:'platform',label:'Store platform',kind:'select'},
    {key:'added',label:'Date added',kind:'date'},
  ]},
  { title:'What you noticed', fields:[{key:'observation',label:'One specific thing you noticed about their store',kind:'textarea'}] },
  { title:'Outreach', fields:[
    {key:'firstMsg',label:'First message date',kind:'date'},
    {key:'fu',label:'Follow-ups done (0 to 5)',kind:'number'},
    {key:'audit',label:'Free audit sent?',kind:'select'},
    {key:'lastContacted',label:'Last contacted',kind:'date'},
    {key:'replyDate',label:'Reply date',kind:'date'},
    {key:'callDate',label:'Call date',kind:'date'},
    {key:'nextAction',label:'Next action date',kind:'date'},
  ]},
  { title:'Deal', fields:[
    {key:'budget',label:'Budget range',kind:'select'},
    {key:'service',label:'Service offered',kind:'select'},
    {key:'dealType',label:'Deal type',kind:'select'},
    {key:'value',label:'Deal value in ₹ (total for the deal)',kind:'number'},
    {key:'founding',label:'Founding client?',kind:'select'},
    {key:'wonDate',label:'Won date',kind:'date'},
    {key:'lostReason',label:'Lost reason',kind:'select'},
  ]},
  { title:'Notes', fields:[{key:'notes',label:'Notes and next action',kind:'textarea'}] },
];

interface LeadRecordModalProps {
  lead: Lead;
  isNew: boolean;
  allLeads: Record<string, Lead>;
  settings: Settings | null;
  onSave: (lead: Lead) => Promise<void>;
  onDelete: (leadId: string) => Promise<void>;
  onClose: () => void;
}

const LeadRecordModal: React.FC<LeadRecordModalProps> = ({ lead, isNew, allLeads, settings: _settings, onSave, onDelete, onClose }) => {
  const [draft, setDraft] = useState<Lead>({ ...lead, log:[...(lead.log || [])] });
  const [activityType, setActivityType] = useState<'Note'|'Reply received'|'Call'|'Message sent'>('Note');
  const [activityText, setActivityText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const warnings = checks(draft, allLeads);

  const change = (key:keyof Lead, value:string) => {
    setDraft(current => ({ ...current, [key]:key === 'fu' || key === 'value' ? (value === '' ? 0 : Number(value)) : value }));
  };
  const addActivity = () => {
    const note = activityText.trim();
    if (!note) return;
    const entry = { t:today(), x:`${activityType}: ${note}` };
    setDraft(current => ({
      ...current,
      replyDate:activityType === 'Reply received' && !current.replyDate ? today() : current.replyDate,
      log:[...(current.log || []), entry],
    }));
    setActivityText('');
  };
  const changeStage = (stage:string) => setDraft(current => ({ ...current, stage }));
  const save = async () => {
    if (!draft.brand.trim()) {
      setError('Enter the brand or store name before saving.');
      return;
    }
    let next = { ...draft, brand:draft.brand.trim(), fu:Math.max(0, Math.min(5, Number(draft.fu) || 0)) };
    if (next.stage !== lead.stage) {
      next.log = [...(next.log || []), { t:today(), x:`Stage: ${lead.stage} to ${next.stage}` }];
    }
    if (next.stage === 'Message Sent' && !next.firstMsg) next.firstMsg = today();
    if (['Replied','Call Booked','Quote Sent','Won'].includes(next.stage) && !next.replyDate) next.replyDate = today();
    if (next.stage === 'Won' && !next.wonDate) next.wonDate = today();
    setSaving(true);
    try {
      await onSave(next);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this lead.');
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (isNew || !window.confirm('Delete this lead for good?')) return;
    try {
      await onDelete(draft.id);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this lead.');
    }
  };

  const pathIndex = STAGES.indexOf(draft.stage);
  return (
    <div id="modal" className="lead-record-modal" style={{display:'block'}} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="rec" role="dialog" aria-modal="true" aria-labelledby="lead-record-title">
        <header className="rh">
          <div className="big" style={{'--c':STAGE_COLORS[draft.stage]} as React.CSSProperties}>{(draft.brand || 'N').charAt(0).toUpperCase()}</div>
          <div><small>{isNew ? 'New lead' : `Lead #${draft.n}`}</small><h1 id="lead-record-title">{draft.brand || 'New lead'}</h1></div>
          <span className="badge" style={{'--c':STAGE_COLORS[draft.stage]} as React.CSSProperties}>{draft.stage}</span>
          <span className="sp" />
          <button className="btn" onClick={onClose} aria-label="Close lead">×</button>
        </header>
        <div className="pathw">
          <ul className="path" style={{'--c':STAGE_COLORS[draft.stage]} as React.CSSProperties}>
            {STAGES.slice(0,6).map((stage,index) => <li key={stage} className={index <= pathIndex && draft.stage !== 'Lost' ? 'on' : ''} style={{'--c':STAGE_COLORS[stage]} as React.CSSProperties} onClick={() => changeStage(stage)}>{stage}</li>)}
            <li className={`lost${draft.stage === 'Lost' ? ' on' : ''}`} onClick={() => changeStage('Lost')}>Closed lost</li>
          </ul>
        </div>
        <div className="rb">
          {warnings.length > 0 && <div className="warnbox"><b>Check this lead:</b> {warnings.join('. ')}.</div>}
          {error && <div className="errbox" role="alert">{error}</div>}
          <div className="sec">Activity</div>
          <div className="activity-add">
            <select aria-label="Activity type" value={activityType} onChange={event => setActivityType(event.target.value as typeof activityType)}>
              <option>Note</option><option>Reply received</option><option>Call</option><option>Message sent</option>
            </select>
            <input aria-label="Activity note" value={activityText} onChange={event => setActivityText(event.target.value)} placeholder="What happened?" />
            <button className="btn pri" onClick={addActivity}>Add</button>
          </div>
          <div className="activity-timeline">
            {[...(draft.log || [])].reverse().map((entry,index) => <div className="kv" key={`${entry.t}-${index}`}><span>{entry.x}</span><span className="sub">{entry.t}</span></div>)}
            {(draft.log || []).length === 0 && <p className="sub">No activity yet. Messages and notes appear here.</p>}
          </div>
          {sections.map(section => <React.Fragment key={section.title}>
            <div className="sec">{section.title}</div>
            <div className="fg">{section.fields.map(field => <div className={field.kind === 'textarea' ? 'w' : ''} key={field.key}>
              <label htmlFor={`lead-${field.key}`}>{field.label}</label>
              {field.kind === 'textarea'
                ? <textarea id={`lead-${field.key}`} rows={3} value={String(draft[field.key] ?? '')} onChange={event => change(field.key,event.target.value)} />
                : field.kind === 'select'
                  ? <select id={`lead-${field.key}`} value={String(draft[field.key] ?? '')} onChange={event => change(field.key,event.target.value)}><option value="" />{(optionSets[field.key] || []).map(option => <option key={option} value={option}>{option}</option>)}</select>
                  : <input id={`lead-${field.key}`} type={field.kind} min={field.key === 'fu' ? 0 : undefined} max={field.key === 'fu' ? 5 : undefined} required={field.required} value={String(draft[field.key] ?? '')} onChange={event => change(field.key,event.target.value)} />}
            </div>)}</div>
          </React.Fragment>)}
        </div>
        <footer className="rf">
          {!isNew && <button className="btn neg" style={{marginRight:'auto'}} onClick={() => void remove()}>Delete</button>}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn pri" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save lead'}</button>
        </footer>
      </section>
    </div>
  );
};

export { EMPTY_LEAD };
export default LeadRecordModal;
