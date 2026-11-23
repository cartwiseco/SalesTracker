import React, { useContext } from 'react';
import { UserContext } from '../App';

interface NotAllowedProps {
  email: string;
  allowedEmail: string;
  onSignOut: () => void;
}

const NotAllowed: React.FC<NotAllowedProps> = ({ email, allowedEmail, onSignOut }) => {
  return (
    <div className="center-screen">
      <h2>Access denied</h2>
      <p>
        The signed‑in account <strong>{email}</strong> is not authorized to use this app.
      </p>
      <p>Only <strong>{allowedEmail}</strong> may access the CRM.</p>
      <button className="btn pri" onClick={onSignOut}>Sign out</button>
    </div>
  );
};

export default NotAllowed;
