import React, { useEffect, useState, createContext, useContext } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db, missingFirebaseConfig } from './firebase/init';
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
import { LeadsProvider } from './data/firestore';
import { setFixedClock } from './lib/dates';

export const UserContext = createContext<null | { uid: string; email: string }>(null);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('home');
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);
  const [leadSearch, setLeadSearch] = React.useState('');
  const openLead = (id:string)=> setSelectedLeadId(id);
  const closeLead = ()=> setSelectedLeadId(null);

  const [user, setUser] = useState<null | { uid: string; email: string }>(null);
  const [allowed, setAllowed] = useState<boolean>(false);
  const allowedEmail = import.meta.env.VITE_ALLOWED_EMAIL?.trim() ?? '';
  const bypassAuth = import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true';

  useEffect(() => {
    const onOpenLead = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) {
        setSelectedLeadId(customEvent.detail);
        setActiveTab('leads');
      }
    };
    window.addEventListener('cartwise-open-lead', onOpenLead);
    return () => window.removeEventListener('cartwise-open-lead', onOpenLead);
  }, []);

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) setActiveTab(customEvent.detail);
    };
    window.addEventListener('cartwise-go', onNavigate);
    return () => window.removeEventListener('cartwise-go', onNavigate);
  }, []);

  useEffect(() => {
    if (bypassAuth) {
      setFixedClock('2026-11-23');
      return () => setFixedClock(null);
    }
  }, [bypassAuth]);

  useEffect(() => {
    if (missingFirebaseConfig.length > 0) return undefined;
    if (!auth) return undefined;
    if (bypassAuth) {
      setUser({ uid: 'test-user', email: allowedEmail || 'test@local.dev' });
      setAllowed(true);
      return undefined;
    }

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
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err:any) {
      console.error('🔴 Google sign‑in failed:', err);
      alert(`Sign‑in failed: ${err.message}`);
    }
  };
  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
  };
  const handleSearch = (query: string) => {
    setLeadSearch(query);
    setActiveTab('leads');
  };
  const handleNewLead = () => {
    setSelectedLeadId('');
    setActiveTab('leads');
  };
  const handleCloseLead = () => setSelectedLeadId(null);

  if (missingFirebaseConfig.length > 0) {
    return (
      <div className="center-screen">
        <h1>Configuration required</h1>
        <p>Set these Vercel environment variables and redeploy:</p>
        <pre>{missingFirebaseConfig.join('\n')}</pre>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="center-screen">
        <h1>Firebase could not start</h1>
        <p>Check the Firebase web config values and redeploy.</p>
      </div>
    );
  }

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
      <LeadsProvider uid={bypassAuth ? '' : user.uid} testMode={bypassAuth}>
        {bypassAuth && (
          <div className="auth-bypass-banner" role="status">TEST MODE</div>
        )}
        <div className="app">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          <main className="main">
          <Header onSignOut={handleSignOut} onSearch={handleSearch} onNewLead={handleNewLead} />
          {activeTab === 'home' && <HomeDashboard />}
          {activeTab === 'leads' && <Leads search={leadSearch} selectedLeadId={selectedLeadId} onCloseLead={handleCloseLead} />}
          {activeTab === 'pipe' && <PipelineBoard />}
          {activeTab === 'find' && <FindLeads />}
          {activeTab === 'num' && <Reports />}
          {activeTab === 'tpl' && <Templates />}
          </main>
        </div>
      </LeadsProvider>
    </UserContext.Provider>
  );
};

export default App;
