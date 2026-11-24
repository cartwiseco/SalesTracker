import React, { useState } from 'react';
import { useLeads } from '../data/firestore';
import { exportCsv } from '../lib/csv';

interface HeaderProps {
  onSignOut: () => void;
  onSearch: (query: string) => void;
  onNewLead: () => void;
  onImport: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSignOut, onSearch, onNewLead, onImport }) => {
  const [search, setSearch] = useState('');
  const { leads } = useLeads();

  const handleExport = () => {
    const csv = exportCsv(Object.values(leads));
    const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'cart-wise-leads.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gh">
      <input
        id="gs"
        placeholder="Search leads by brand, contact, handle or link"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onSearch(e.target.value);
        }}
      />
      <span className="sp" />
      <button className="btn" onClick={onImport}>Import</button>
      <button className="btn" onClick={handleExport}>Export</button>
      <button className="btn" onClick={onNewLead}>New lead</button>
      <button className="btn" onClick={onSignOut}>Sign out</button>
    </div>
  );
};

export default Header;
