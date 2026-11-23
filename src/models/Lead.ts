export interface Lead {
  id: string;
  n: number;
  stage: string;
  added: string; // ISO date YYYY-MM-DD
  fu: number;
  audit: string;
  founding: string;
  budget: string;
  service: string;
  leadType: string;
  source: string;
  category: string;
  platform: string;
  route: string;
  brand: string;
  link: string;
  observation: string;
  contact: string;
  handle: string;
  value: number;
  dealType: string;
  lostReason: string;
  notes: string;
  firstMsg?: string;
  replyDate?: string;
  callDate?: string;
  nextAction?: string;
  wonDate?: string;
  lastContacted?: string;
  log?: { t: string; x: string }[];
}
