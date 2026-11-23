import React from 'react';
import { useContext } from 'react';
import { UserContext } from '../App';
import { Icon } from '../utils/icon';

const tabs = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'leads', label: 'Leads', icon: 'leads' },
  { key: 'pipe', label: 'Pipeline', icon: 'pipe' },
  { key: 'find', label: 'Find leads', icon: 'find' },
  { key: 'num', label: 'Reports', icon: 'num' },
  { key: 'tpl', label: 'Templates', icon: 'tpl' },
];

interface SidebarProps { activeTab: string; setActiveTab: (tab: string) => void; }
const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
// No internal state – activeTab is controlled by props
  const user = useContext(UserContext);
  // In a full app we would manage tab via router or context; here we just set state.
  return (
    <aside>
      <div className="logo">
        <svg viewBox="0 0 32 32" fill="none" width="34" height="34">
          <rect width="32" height="32" rx="10" fill="var(--brand)" />
          <path d="M7 9h3l2.4 10h9.2L24 12H11.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="13" cy="23" r="1.9" fill="#f0a81c" />
          <circle cx="21" cy="23" r="1.9" fill="#f0a81c" />
        </svg>
        Cart Wise Co
      </div>
      <div id="nav">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={activeTab === t.key ? 'on' : ''}
            onClick={() => setActiveTab(t.key)}
          >
            <svg className="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {Icon[t.icon]}
            </svg>
            {t.label}
          </button>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
