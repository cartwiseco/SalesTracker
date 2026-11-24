import React, { useEffect, useState } from 'react';
import { useLeads } from '../data/firestore';
import { Lead } from '../models/Lead';
import { OPT } from './FindLeads';
import { STAGES } from '../lib/csv';
import { applySavedView, filterLeads, LeadListState, sortLeads } from '../lib/leadsList';
import { fmt, inr, today } from '../lib/dates';
import { fuStatus, naStatus } from '../lib/followUps';
import LeadRecordModal, { EMPTY_LEAD } from '../components/LeadRecordModal';

const STAGE_COLORS: Record<string, string> = {
  'New Lead':'#6b7a90', 'Message Sent':'#0176d3', Replied:'#06a59a',
  'Call Booked':'#7f5bd6', 'Quote Sent':'#fe9339', Won:'#2e844a', Lost:'#ba0517',
};
const FILTERS = [
  ['category', 'Category'], ['source', 'Source'], ['leadType', 'Lead type'],
  ['platform', 'Platform'], ['route', 'Route'],
] as const;
const emptyState = (): LeadListState => ({ stage:'', filters:{}, sort:'n', direction:1 });

const Leads: React.FC<{ search?: string; selectedLeadId?: string | null; onCloseLead?: () => void }> = ({ search = '', selectedLeadId = null, onCloseLead }) => {
  const { leads, settings, saveSettings, saveLead, deleteLead } = useLeads();
  const [listState, setListState] = useState<LeadListState>(emptyState);
  const [viewName, setViewName] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [record, setRecord] = useState<Lead | null>(null);

  useEffect(() => {
    if (selectedLeadId === null) {
      setRecord(null);
    } else if (selectedLeadId === '') {
      setRecord(EMPTY_LEAD(Math.max(0, ...Object.values(leads).map(lead => lead.n || 0)) + 1));
    } else {
      setRecord(leads[selectedLeadId] || null);
    }
  }, [selectedLeadId, leads]);

  const allLeads = Object.values(leads);
  const filtered = filterLeads(leads, search, listState);
  const ordered = sortLeads(filtered, listState.sort, listState.direction, settings, today());
  const displayed = showAll ? ordered : ordered.slice(0, 100);
  const updateFilter = (key: string, value: string) => {
    setListState((current) => ({ ...current, filters:{ ...current.filters, [key]:value } }));
    setShowAll(false);
  };
  const sortBy = (key: string) => setListState((current) => ({
    ...current,
    sort:key,
    direction:current.sort === key ? -current.direction : 1,
  }));
  const clearFilters = () => {
    setListState((current) => ({ ...current, stage:'', filters:{} }));
    setShowAll(false);
  };
  const saveView = async () => {
    const name = viewName.trim();
    if (!name) return;
    const views = settings?.views || [];
    await saveSettings({ ...(settings || { goal:300000, win:30, perDay:15, days:5 }), views:[...views, {
      n:name, sf:listState.stage, f:{ ...listState.filters } as Record<string,string>, sort:listState.sort, dir:listState.direction,
    }] });
    setViewName('');
  };
  const deleteView = async (index: number) => {
    const views = [...(settings?.views || [])];
    views.splice(index, 1);
    await saveSettings({ ...(settings || { goal:300000, win:30, perDay:15, days:5 }), views });
  };
  const selectView = (index: number) => {
    const view = settings?.views?.[index];
    if (view) {
      setListState(applySavedView(view));
      setShowAll(false);
    }
  };
  const nextStatus = (lead: Lead) => fuStatus(lead, settings) || naStatus(lead);
  const clickLead = (id: string) => window.dispatchEvent(new CustomEvent('cartwise-open-lead', { detail:id }));
  const header = (key: string, text: string) => (
    <th key={key} aria-sort={listState.sort === key ? (listState.direction > 0 ? 'ascending' : 'descending') : 'none'}>
      <button className="table-sort" onClick={() => sortBy(key)}>{text}{listState.sort === key ? (listState.direction > 0 ? ' ▲' : ' ▼') : ''}</button>
    </th>
  );

  return (
    <div id="view">
      <h1>Leads</h1>
      <p className="sub">{ordered.length} item(s). Click a column heading to sort. Click a lead to open it.</p>

      <div className="legend lead-stage-chips">
        <button className={!listState.stage ? 'on' : ''} onClick={() => setListState(current => ({...current,stage:''}))}>All {allLeads.length}</button>
        {STAGES.map(stage => (
          <button key={stage} className={listState.stage === stage ? 'on' : ''} onClick={() => setListState(current => ({...current,stage}))}>
            <i className="dot" style={{'--c':STAGE_COLORS[stage]} as React.CSSProperties} />{stage} {allLeads.filter(lead => lead.stage === stage).length}
          </button>
        ))}
      </div>

      <div className="legend lead-filters">
        {FILTERS.map(([field, label]) => (
          <select key={field} aria-label={`${label} filter`} value={listState.filters[field] || ''} onChange={event => updateFilter(field, event.target.value)}>
            <option value="">{label}: all</option>
            {OPT[field].map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        ))}
        <button className="btn sm" onClick={clearFilters}>Clear</button>
      </div>

      <div className="legend lead-saved-views">
        <small>Saved views</small>
        {(settings?.views || []).map((view, index) => (
          <span className="saved-view" key={`${view.n}-${index}`}>
            <button className="btn sm" onClick={() => selectView(index)}>{view.n}</button>
            <button className="btn sm neg" onClick={() => void deleteView(index)} aria-label={`Delete ${view.n}`}>×</button>
          </span>
        ))}
        <input aria-label="Saved view name" value={viewName} onChange={event => setViewName(event.target.value)} placeholder="Name this view" />
        <button className="btn sm" onClick={() => void saveView()}>Save view</button>
      </div>

      {displayed.length === 0 ? <div className="card empty">No leads match. Click New lead to add one.</div> : (
        <div className="card lead-table-card">
          <div className="tw">
            <table className="leads-table">
              <thead><tr>
                {header('n','#')}{header('brand','Lead')}{header('category','Category')}{header('source','Source')}
                {header('stage','Stage')}{header('next','Next step')}{header('value','Deal value')}{header('added','Added')}
              </tr></thead>
              <tbody>{displayed.map(lead => (
                <tr className="r" key={lead.id} onClick={() => clickLead(lead.id)}>
                  <td>{lead.n}</td>
                  <td><a>{lead.brand}</a>{lead.contact && <div className="sub lead-contact">{lead.contact}</div>}</td>
                  <td>{lead.category}</td><td>{lead.source}</td>
                  <td><span className="badge" style={{'--c':STAGE_COLORS[lead.stage]} as React.CSSProperties}>{lead.stage}</span></td>
                  <td>{nextStatus(lead) && <span className={`tag ${nextStatus(lead)==='Overdue'||nextStatus(lead)==='Set date'?'bad':nextStatus(lead)==='Due today'?'warn':'ok'}`}>{nextStatus(lead)}</span>}</td>
                  <td>{lead.value ? inr(lead.value) : ''}</td><td>{fmt(lead.added)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      {ordered.length > 100 && !showAll && <p><button className="btn" onClick={() => setShowAll(true)}>Show all {ordered.length}</button></p>}
      {record && selectedLeadId !== null && <LeadRecordModal
        key={record.id}
        lead={record}
        isNew={selectedLeadId === ''}
        allLeads={leads}
        settings={settings}
        onSave={saveLead}
        onDelete={deleteLead}
        onClose={() => onCloseLead?.()}
      />}
    </div>
  );
};

export default Leads;
