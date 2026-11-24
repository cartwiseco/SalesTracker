import React, { useState } from 'react';

interface HeaderProps {
  onSignOut: () => void;
  onSearch: (query: string) => void;
  onNewLead: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSignOut, onSearch, onNewLead }) => {
  const [search, setSearch] = useState('');

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
      <button className="btn" onClick={onNewLead}>New lead</button>
      <button className="btn" onClick={onSignOut}>Sign out</button>
    </div>
  );
};

export default Header;
