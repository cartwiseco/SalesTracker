import { Lead } from '../models/Lead';

export const DEFAULT_TEMPLATES = [
  '{hi} I was looking at {brand} and noticed {obs}. I help online brands fix issues like this so more visitors check out. Could I send you a free 10-point audit of your store?',
  '{hi} just checking you saw my last message about {brand}. Happy to share what I found, no strings attached.',
  '{hi} I put together a free 10-point audit for {brand}, starting with {obs}. Want me to send it over?',
  '{hi} here is a live store in your space that we improved. I can show you what changed and what it did for their orders.',
  '{hi} one quick tip for {brand}: fast pages and a simple checkout lift orders more than most design changes. Glad to point out where yours can improve.',
  '{hi} I will stop pinging you here. If store improvements come up later, I am a message away. Wishing {brand} a great season.',
];

export const fillTemplate = (
  template: string,
  lead: Lead,
): string => {
  const contactName = lead.contact?.trim().split(/\s+/)[0];
  const hi = contactName ? `Hi ${contactName},` : 'Hi,';
  const brand = lead.brand?.trim() || 'your brand';
  const observation = lead.observation?.trim();
  const cleanedObservation = observation
    ? `${observation.replace(/[.!]+$/, '')}`.replace(/^([A-Z])/, (letter) => letter.toLowerCase())
    : 'a few things on the store that could be improved';

  return template
    .replaceAll('{hi}', hi)
    .replaceAll('{brand}', brand)
    .replaceAll('{obs}', cleanedObservation);
};
