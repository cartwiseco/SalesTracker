import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/init';
import { Lead } from '../models/Lead';
import { Settings } from '../models/Settings';

type LeadsContextValue = {
  leads: Record<string, Lead>;
  settings: Settings | null;
  saveLead: (lead: Lead) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

export const LeadsProvider: React.FC<{ uid: string; children: React.ReactNode }> = ({ uid, children }) => {
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (!uid || !db) return undefined;

    const unsubLeads = onSnapshot(collection(db, 'users', uid, 'leads'), (snapshot) => {
      const nextLeads: Record<string, Lead> = {};
      snapshot.forEach((leadSnapshot) => {
        nextLeads[leadSnapshot.id] = { ...leadSnapshot.data(), id: leadSnapshot.id } as Lead;
      });
      setLeads(nextLeads);
    });

    const unsubSettings = onSnapshot(doc(db, 'users', uid, 'settings', 'main'), (snapshot) => {
      setSettings(snapshot.exists() ? snapshot.data() as Settings : null);
    });

    return () => {
      unsubLeads();
      unsubSettings();
    };
  }, [uid]);

  const saveLead = useCallback(async (lead: Lead) => {
    if (!db) throw new Error('Firebase is not configured');
    if (!uid) throw new Error('Test bypass cannot write Firestore data');
    await setDoc(doc(db, 'users', uid, 'leads', lead.id), lead, { merge: true });
  }, [uid]);

  const deleteLead = useCallback(async (leadId: string) => {
    if (!db) throw new Error('Firebase is not configured');
    if (!uid) throw new Error('Test bypass cannot delete Firestore data');
    await deleteDoc(doc(db, 'users', uid, 'leads', leadId));
  }, [uid]);

  const saveSettings = useCallback(async (newSettings: Settings) => {
    if (!db) throw new Error('Firebase is not configured');
    if (!uid) throw new Error('Test bypass cannot write Firestore data');
    await setDoc(doc(db, 'users', uid, 'settings', 'main'), newSettings, { merge: true });
  }, [uid]);

  return (
    <LeadsContext.Provider value={{ leads, settings, saveLead, deleteLead, saveSettings }}>
      {children}
    </LeadsContext.Provider>
  );
};

export const useLeads = (): LeadsContextValue => {
  const context = useContext(LeadsContext);
  if (!context) throw new Error('useLeads must be used within LeadsProvider');
  return context;
};
