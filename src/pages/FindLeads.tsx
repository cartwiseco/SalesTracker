import React, { useState, useEffect } from 'react';
import { useLeads } from '../data/firestore';
import { iso, today } from '../utils/date';
import { inr } from '../utils/format';

// Option lists (same as reference)
export const OPT = {
  category:['Kids & Toys','Home & Lifestyle','Fashion & Accessories','Beauty & Wellness','Food & D2C','Other'],
  source:['Meta Ad Library','Instagram','Google','Directory','Referral','LinkedIn','Other'],
  leadType:['Running ads','Weak existing store','No store yet'],
  platform:['Shopify','WooCommerce','Custom','Wix / Other','None (no store)','Unknown'],
  route:['WhatsApp','Instagram DM','Email','LinkedIn','Phone call'],
  budget:['Unknown','Under ₹40,000','₹40,000 to ₹70,000','₹70,000 to ₹1,50,000','Above ₹1,50,000'],
  service:['New store build','Store redesign','Fixes and speed work','Ongoing store management','Other'],
  dealType:['One-time project','Monthly retainer'],
  lostReason:['No reply after follow-ups','Price too high','Chose someone else','Already has a good store','Bad timing','Not a fit','Other'],
  yn:['No','Yes']
};

// Quick‑check items for Ads / Google (FS) and Instagram (FN)
const FS = [
  ['Slow to load on mobile','slow mobile loading'],
  ['Cluttered or confusing homepage','a cluttered homepage'],
  ['Weak product photos or pages','weak product photos'],
  ['Long or confusing checkout','a long checkout'],
  ['No reviews, returns policy or contact details','missing trust signals like reviews or a returns policy'],
  ['Hard to use on a phone','a layout that is hard to use on a phone'],
  ['No clear offer or call to action','no clear call to action'],
  ['Looks outdated','an outdated design']
];
const FN = [
  ['Takes orders only by DM','orders being taken only by DM'],
  ['No website link in bio','no website link in the bio'],
  ['Customers cannot browse the full range online','no way to browse the full range online'],
  ['Prices only shown in posts','prices only shown in posts']
];

function fkHtml(t: string) {
  const list = t === 'No store yet' ? FN : FS;
  return list.map((x, i) => (
    <label key={i} style={{display:'flex',gap:'8px',alignItems:'center',margin:'4px 0',fontSize:'14px'}}>
      <input type="checkbox" className="fkc" value={i} onChange={() => {}} style={{width:'auto'}} />
      {x[0]}
    </label>
  ));
}

const FindLeads: React.FC = () => {
  const { leads, saveLead, addTestLead } = useLeads(); // saveLead will be used for new leads
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('Fashion & Accessories');
  const [leadType, setLeadType] = useState('Running ads'); // default card is Ads
  const [quickChecks, setQuickChecks] = useState<string[]>([]);
  const [observation, setObservation] = useState('');
  const [brand, setBrand] = useState('');
  const [link, setLink] = useState('');
  const [message, setMessage] = useState('');
  const [addedToday, setAddedToday] = useState(0);

  // count leads added today (same logic as reference: added today)
  useEffect(() => {
    const todayStr = today();
    const count = Object.values(leads).filter(l => l.added === todayStr).length;
    setAddedToday(count);
  }, [leads]);

  // Update observation when quick checks change
  useEffect(() => {
    const list = leadType === 'No store yet' ? FN : FS;
    const selected = quickChecks.map(i => list[+i][1]);
    const txt = selected.length > 1 ? `${selected.slice(0, -1).join(', ')} and ${selected[selected.length - 1]}` : selected[0] || '';
    setObservation(txt);
  }, [quickChecks, leadType]);

  const handleCheckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuickChecks(prev => {
      const set = new Set(prev);
      if (e.target.checked) set.add(val);
      else set.delete(val);
      return Array.from(set);
    });
  };

  const duplicateExists = (b: string) => {
    return Object.values(leads).some(l => (l.brand || '').toLowerCase() === b.toLowerCase());
  };

  const saveFoundLead = async () => {
    if (!brand.trim()) { alert('Enter the brand name.'); return; }
    if (duplicateExists(brand)) { alert('That brand is already in your leads.'); return; }
    const maxN = Object.values(leads).reduce((m, l) => Math.max(m, l.n || 0), 0);
    const id = 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
    const newLead = {
      id,
      n: maxN + 1,
      stage: 'New Lead',
      added: today(),
      fu: 0,
      audit: 'No',
      founding: 'No',
      budget: 'Unknown',
      service: 'Other',
      leadType,
      source: { 'Running ads':'Meta Ad Library','Weak existing store':'Google','No store yet':'Instagram' }[leadType] as string,
      category,
      platform: leadType === 'No store yet' ? 'None (no store)' : 'Unknown',
      route: 'WhatsApp', // default, can be edited later
      brand: brand.trim(),
      link: link.trim(),
      observation,
      contact: '',
      handle: '',
      value: 0,
      dealType: 'One-time project',
      lostReason: '',
      notes: '',
      log: [{ t: today(), x: 'Found via lead finder' }]
    } as any;
    await saveLead(newLead);
    setMessage(`Saved ${brand}. Add its contact details from the Leads list.`);
    // Reset form fields
    setBrand('');
    setLink('');
    setQuickChecks([]);
    setObservation('');
  };

  const openFind = (type: string) => {
    const kw = encodeURIComponent(keyword.trim());
    let url = '';
    if (type === 'ads') {
      url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IN&media_type=all&search_type=keyword_unordered&q=${kw}`;
    } else if (type === 'google') {
      url = `https://www.google.com/search?start=10&q=${kw}+buy+online+India`;
    } else if (type === 'insta') {
      url = `https://www.google.com/search?q=site:instagram.com+"DM to order"+${kw}`;
    }
    window.open(url, '_blank');
    setLeadType(type === 'ads' ? 'Running ads' : type === 'google' ? 'Weak existing store' : 'No store yet');
  };

  return (
    <div id="view" className="card" style={{padding:'20px'}}>
      <h1>Find leads</h1>
      <p className="sub">Type a product keyword, run one of the three searches, and save good brands straight into your leads.</p>

      {/* Keyword & category */}
      <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginBottom:'16px'}}>
        <div>
          <label>Product keyword</label>
          <input id="fk" value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="e.g. handloom sarees" style={{width:'240px'}} />
        </div>
        <div>
          <label>Category for saved leads</label>
          <select id="fc" value={category} onChange={e=>setCategory(e.target.value)}>
            {OPT.category.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Three finder cards */}
      <div className="g" style={{marginBottom:'24px'}}>
        <div className="card t-grey" style={{marginBottom:'12px'}}>
          <h2>Running ads</h2>
          <p>Brands paying for traffic, so they have a budget.</p>
          <button className="btn pri" onClick={() => openFind('ads')}>Open Meta Ad Library (India)</button>
          <ul style={{marginTop:'8px'}}>
            <li>Open an ad and click through to the store.</li>
            <li>Check mobile speed, product pages and checkout.</li>
            <li>Note one specific problem you could fix.</li>
          </ul>
        </div>
        <div className="card t-grey" style={{marginBottom:'12px'}}>
          <h2>Weak existing store</h2>
          <p>Real stores that rank on later Google pages.</p>
          <button className="btn pri" onClick={() => openFind('google')}>Search Google, pages 2‑4</button>
          <ul style={{marginTop:'8px'}}>
            <li>Open a few stores from the results.</li>
            <li>Look for slow pages, dated design or a confusing checkout.</li>
            <li>Save the ones with a clear, fixable problem.</li>
          </ul>
        </div>
        <div className="card t-grey" style={{marginBottom:'12px'}}>
          <h2>No store yet</h2>
          <p>Instagram sellers who take orders by DM.</p>
          <button className="btn pri" onClick={() => openFind('insta')}>Find Instagram sellers</button>
          <ul style={{marginTop:'8px'}}>
            <li>Open the profile and check the link in bio.</li>
            <li>No proper website, but steady posts and products? Good lead.</li>
            <li>Note what they sell and how they take orders.</li>
          </ul>
        </div>
      </div>

      {/* Quick‑check form (shown after selecting a lead type) */}
      <div style={{marginTop:'20px',borderTop:'1px solid var(--line)',paddingTop:'16px'}}>
        <h2>Save a lead</h2>
        <div style={{marginBottom:'8px'}}>
          <label>Brand</label>
          <input id="fb" value={brand} onChange={e=>setBrand(e.target.value)} style={{width:'200px'}} />
        </div>
        <div style={{marginBottom:'8px'}}>
          <label>Store or Instagram link</label>
          <input id="fl" value={link} onChange={e=>setLink(e.target.value)} style={{width:'260px'}} />
        </div>
        <div style={{marginBottom:'8px'}}>
          <label>Type</label>
          <select id="ft" value={leadType} onChange={e=>setLeadType(e.target.value)}>
            {OPT.leadType.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        {/* Quick‑check checkboxes */}
        <div style={{marginTop:'10px'}}>
          <label>Quick check (tick what you see)</label>
          <div id="fcl">
            {leadType === 'No store yet' ? FN.map((x,i)=>(
              <label key={i} style={{display:'flex',gap:'8px',alignItems:'center',margin:'4px 0',fontSize:'14px'}}>
                <input type="checkbox" className="fkc" value={i.toString()} onChange={handleCheckChange} />
                {x[0]}
              </label>
            )) : FS.map((x,i)=>(
              <label key={i} style={{display:'flex',gap:'8px',alignItems:'center',margin:'4px 0',fontSize:'14px'}}>
                <input type="checkbox" className="fkc" value={i.toString()} onChange={handleCheckChange} />
                {x[0]}
              </label>
            ))}
          </div>
          <div className="sub" id="fks" style={{margin:'6px 0 0'}}>
            Problems found: {quickChecks.length} of {leadType === 'No store yet' ? FN.length : FS.length}{quickChecks.length>=3?'. Strong lead.':quickChecks.length?'. Weak lead unless you find more.':''}
          </div>
        </div>
        <div style={{marginTop:'10px'}}>
          <label>What you noticed</label>
          <input id="fo" placeholder="Filled in from your ticks, or type your own" value={observation} onChange={e=>setObservation(e.target.value)} />
        </div>
        <div style={{marginTop:'12px'}}>
          <button className="btn pri" onClick={saveFoundLead}>Save lead</button>
          <span className="sub" id="fm" style={{marginLeft:'8px'}}>{message}</span>
        </div>
        <p className="sub" style={{marginTop:'8px'}}>Added today: {addedToday}</p>
      </div>
    </div>
  );
};

export default FindLeads;
