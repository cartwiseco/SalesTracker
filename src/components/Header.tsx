import React, { useContext, useState } from 'react';
import { UserContext } from '../App';
import { useLeads } from '../data/firestore';

interface HeaderProps {
  onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSignOut }) => {
  const user = useContext(UserContext);
  const [search, setSearch] = useState('');
  const { addTestLead } = useLeads(); // expose helper for demo

  const handleNewLead = () => {
    addTestLead();
  };

  return (
    <div className="gh">
      <input
        id="gs"
        placeholder="Search leads by brand, contact, handle or link"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <span className="sp" />
      <button className="btn" onClick={handleNewLead}>New lead</button>
      <button className="btn" onClick={onSignOut}>Sign out</button>
    </div>
  );
};

export default Header;
