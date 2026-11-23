import React, { useEffect, useState, createContext, useContext } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from './firebase/init';
import { collection, doc, getDoc, setDoc, onSnapshot, query } from 'firebase/firestore';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import NotAllowed from './components/NotAllowed';
import './styles.css';

// Page imports
import HomeDashboard from './pages/HomeDashboard';
import Leads from './pages/Leads';
import PipelineBoard from './pages/PipelineBoard';
import FindLeads from './pages/FindLeads';
import Reports from './pages/Reports';
import Templates from './pages/Templates';

export const UserContext = createContext<null | { uid: string; email: string }>(null);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('home');
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);
  const openLead = (id:string)=> setSelectedLeadId(id);
  const closeLead = ()=> setSelectedLeadId(null);

  const [user, setUser] = useState<null | { uid: string; email: string }>(null);
  const [allowed, setAllowed] = useState<boolean>(false);
  const allowedEmail = import.meta.env.VITE_ALLOWED_EMAIL?.trim() ?? '';

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && u.email) {
        setUser({ uid: u.uid, email: u.email });
        setAllowed(u.email === allowedEmail);
      } else {
        setUser(null);
        setAllowed(false);
      }
    });
    return unsub;
  }, []);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err:any) {
      console.error('🔴 Google sign‑in failed:', err);
      alert(`Sign‑in failed: ${err.message}`);
    }
  };
  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (!user) {
    return (
      <div className="center-screen">
        <h1>Cart Wise CRM</h1>
        <button className="btn pri" onClick={handleSignIn}>Sign in with Google</button>
      </div>
    );
  }

  if (!allowed) {
    return <NotAllowed email={user.email} allowedEmail={allowedEmail} onSignOut={handleSignOut} />;
  }

  return (
    <UserContext.Provider value={user}>
      <div className="app">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="main">
          <Header onSignOut={handleSignOut} />
          {activeTab === 'home' && <HomeDashboard />}
          {activeTab === 'leads' && <Leads />}
          {activeTab === 'pipe' && <PipelineBoard />}
          {activeTab === 'find' && <FindLeads />}
          {activeTab === 'num' && <Reports />}
          {activeTab === 'tpl' && <Templates />}
        </main>
      </div>
    </UserContext.Provider>
  );
};

export default App;
