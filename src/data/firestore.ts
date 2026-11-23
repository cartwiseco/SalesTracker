import { useEffect, useState, useCallback } from 'react';
import { auth, db } from '../firebase/init';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { Lead } from '../models/Lead';
import { Settings } from '../models/Settings';
import { iso, today } from '../utils/date';

/** Hook that provides realtime leads and settings for the signed‑in user */
export const useLeads = () => {
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [settings, setSettings] = useState<Settings | null>(null);

  const uid = auth.currentUser?.uid;

  // realtime listener for leads collection and settings document
  useEffect(() => {
    if (!uid) return undefined;
    const leadsRef = collection(db, 'users', uid, 'leads');
    const unsubLeads = onSnapshot(leadsRef, (snap) => {
      const map: Record<string, Lead> = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Lead;
        map[docSnap.id] = data;
      });
      setLeads(map);
    });
    const settingsRef = doc(db, 'users', uid, 'settings', 'main');
    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) setSettings(snap.data() as Settings);
      else setSettings(null);
    });
    return () => {
      unsubLeads();
      unsubSettings();
    };
  }, [uid]);

  const saveLead = useCallback(
    async (lead: Lead) => {
      if (!uid) return;
      const leadRef = doc(db, 'users', uid, 'leads', lead.id);
      await setDoc(leadRef, lead, { merge: true });
    },
    [uid]
  );

  const deleteLead = useCallback(
    async (leadId: string) => {
      if (!uid) return;
      const leadRef = doc(db, 'users', uid, 'leads', leadId);
      await deleteDoc(leadRef);
    },
    [uid]
  );

  const saveSettings = useCallback(
    async (newSettings: Settings) => {
      if (!uid) return;
      const settingsRef = doc(db, 'users', uid, 'settings', 'main');
      await setDoc(settingsRef, newSettings, { merge: true });
    },
    [uid]
  );

  // Helper to add a *test* lead – used from the header button
  const addTestLead = useCallback(async () => {
    if (!uid) return;
    // compute next n (max existing + 1)
    const maxN = Object.values(leads).reduce((m, l) => Math.max(m, l.n || 0), 0);
    const id = 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const newLead: Lead = {
      id,
      n: maxN + 1,
      stage: 'New Lead',
      added: today(),
      fu: 0,
      audit: 'No',
      founding: 'No',
      budget: 'Unknown',
      service: 'Other',
      leadType: 'Running ads',
      source: 'Meta Ad Library',
      category: 'Fashion & Accessories',
      platform: 'Unknown',
      route: 'WhatsApp',
      brand: 'Test Brand',
      link: '',
      observation: '',
      contact: '',
      handle: '',
      value: 0,
      dealType: 'One-time project',
      lostReason: '',
      notes: '',
      log: [{ t: today(), x: 'Found via lead finder' }],
    };
    await saveLead(newLead);
  }, [uid, leads, saveLead]);

  return { leads, settings, saveLead, deleteLead, saveSettings, addTestLead };
};
