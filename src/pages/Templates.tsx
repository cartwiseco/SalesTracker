import { useContext, useState, useEffect } from 'react';
import { UserContext } from '../App';
import { useLeads } from '../data/firestore';
import { iso, today } from '../utils/date';
import { inr } from '../utils/format';

// Default templates (same as reference TPLD)
const DEFAULT_TPL = [
  "{hi} I was looking at {brand} and noticed {obs}. I help online brands fix issues like this so more visitors check out. Could I send you a free 10-point audit of your store?",
  "{hi} just checking you saw my last message about {brand}. Happy to share what I found, no strings attached.",
  "{hi} I put together a free 10-point audit for {brand}, starting with {obs}. Want me to send it over?",
  "{hi} here is a live store in your space that we improved. I can show you what changed and what it did for their orders.",
  "{hi} one quick tip for {brand}: fast pages and a simple checkout lift orders more than most design changes. Glad to point out where yours can improve.",
  "{hi} I will stop pinging you here. If store improvements come up later, I am a message away. Wishing {brand} a great season."
];

const Templates: React.FC = () => {
  const { settings, saveSettings } = useLeads();
  const [templates, setTemplates] = useState<string[]>(DEFAULT_TPL);

  useEffect(() => {
    if (settings?.tpl && settings.tpl.length === 6) {
      setTemplates(settings.tpl);
    }
  }, [settings]);

  const handleChange = (i: number, val: string) => {
    const newT = [...templates];
    newT[i] = val;
    setTemplates(newT);
    saveSettings({ ...(settings || {}), tpl: newT } as any);
  };

  const reset = () => {
    setTemplates(DEFAULT_TPL);
    saveSettings({ ...(settings || {}), tpl: null } as any);
  };

  return (
    <div id="view" className="card" style={{padding:'20px'}}>
      <h1>Templates</h1>
      <p className="sub">Use {"{hi}"}, {"{brand}"} and {"{obs}"} (your "what I noticed" line). Changes save as you leave each box.</p>
      {templates.map((t, i) => (
        <div key={i} style={{marginBottom:'12px'}}>
          <label>{['First message','Follow-up 1','Follow-up 2','Follow-up 3','Follow-up 4','Follow-up 5 (last)'][i]}</label>
          <textarea rows={3} value={t} onChange={e=>handleChange(i, e.target.value)} />
        </div>
      ))}
      <button className="btn" onClick={reset}>Reset to defaults</button>
    </div>
  );
};

export default Templates;
