import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/init';
import { Lead } from '../models/Lead';
import { Settings } from '../models/Settings';
import { setFixedClock } from '../lib/dates';

type LeadsContextValue = {
  leads: Record<string, Lead>;
  settings: Settings | null;
  saveLead: (lead: Lead) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

export const LeadsProvider: React.FC<{ uid: string; testMode?: boolean; children: React.ReactNode }> = ({ uid, testMode = false, children }) => {
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV && testMode) {
      setFixedClock('2026-11-23');
      let active = true;
      void import('../lib/testData').then(({ loadTestData }) => {
        if (!active) return;
        const testData = loadTestData();
        setLeads(testData.leads);
        setSettings(testData.settings);
      });
      return () => {
        active = false;
        setFixedClock(null);
      };
    }

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
  }, [uid, testMode]);

  const saveLead = useCallback(async (lead: Lead) => {
    if (import.meta.env.DEV && testMode) {
      setLeads((current) => ({ ...current, [lead.id]: lead }));
      return;
    }
    if (!db) throw new Error('Firebase is not configured');
    if (!uid) throw new Error('Test bypass cannot write Firestore data');
    await setDoc(doc(db, 'users', uid, 'leads', lead.id), lead, { merge: true });
  }, [uid, testMode]);

  const deleteLead = useCallback(async (leadId: string) => {
    if (import.meta.env.DEV && testMode) {
      setLeads((current) => {
        const next = { ...current };
        delete next[leadId];
        return next;
      });
      return;
    }
    if (!db) throw new Error('Firebase is not configured');
    if (!uid) throw new Error('Test bypass cannot delete Firestore data');
    await deleteDoc(doc(db, 'users', uid, 'leads', leadId));
  }, [uid, testMode]);

  const saveSettings = useCallback(async (newSettings: Settings) => {
    if (import.meta.env.DEV && testMode) {
      setSettings(newSettings);
      return;
    }
    if (!db) throw new Error('Firebase is not configured');
    if (!uid) throw new Error('Test bypass cannot write Firestore data');
    await setDoc(doc(db, 'users', uid, 'settings', 'main'), newSettings, { merge: true });
  }, [uid, testMode]);

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
