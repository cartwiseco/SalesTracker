import { Lead } from '../models/Lead';
import { Settings } from '../models/Settings';
import { gapList } from './followUps';

export const sentLeadUpdate = (lead: Lead, settings: Settings | null, today: string): Lead => {
  const firstMessage = lead.stage === 'New Lead';
  const followUp = firstMessage ? 0 : Math.min(gapList(settings).length, (lead.fu || 0) + 1);
  return {
    ...lead,
    stage: firstMessage ? 'Message Sent' : lead.stage,
    firstMsg: firstMessage ? today : lead.firstMsg,
    fu: followUp,
    lastContacted: today,
    log: [
      ...(lead.log || []),
      { t: today, x: firstMessage ? 'First message sent' : `Follow-up ${followUp} sent` },
    ],
  };
};

export const foundLeadActivity = (today: string): { t: string; x: string } => ({
  t: today,
  x: 'Found via lead finder',
});

export const whatsappUrl = (handle: string, message: string): string => {
  const digits = handle.trim().replace(/\D/g, '');
  const phone = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export const gmailComposeUrl = (email: string, brand: string, message: string): string => {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: email.trim(),
    su: `Quick idea for ${brand}`,
    body: message,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
};

export const instagramUrl = (link: string, handle: string): string => {
  const providedLink = link.trim();
  if (providedLink) return /^https?:/.test(providedLink) ? providedLink : `https://${providedLink}`;
  const username = handle.trim().replace(/^@/, '');
  return username ? `https://instagram.com/${username}` : '';
};
