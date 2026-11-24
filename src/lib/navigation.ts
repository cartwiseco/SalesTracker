export const openLead = (leadId: string): void => {
  window.dispatchEvent(new CustomEvent('cartwise-open-lead', { detail: leadId }));
};
