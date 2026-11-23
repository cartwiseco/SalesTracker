import { useState, useEffect } from 'react';
import { useLeads } from '../data/firestore';
import { Settings } from '../models/Settings';
import { DEFAULT_TEMPLATES } from '../lib/templates';

const DEFAULT_TPL = DEFAULT_TEMPLATES;
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
    saveSettings({ ...(settings || {}), tpl: null } as Settings);
  };

  return (
    <div id="view">
      <h1>Templates</h1>
      <p className="sub">Use {"{hi}"}, {"{brand}"} and {"{obs}"} (your "what I noticed" line). Changes save as you leave each box.</p>
      <div className="card t-purple">
        {templates.map((t, i) => (
          <div key={i} style={{marginBottom:'12px'}}>
            <label>{['First message','Follow-up 1','Follow-up 2','Follow-up 3','Follow-up 4','Follow-up 5 (last)'][i]}</label>
            <textarea rows={3} value={t} onChange={e=>handleChange(i, e.target.value)} />
          </div>
        ))}
        <button className="btn" onClick={reset}>Reset to defaults</button>
      </div>
    </div>
  );
};

export default Templates;
