
export const logSystemEvent = (message: string) => {
  const event = new CustomEvent('logTransaction', { detail: message });
  window.dispatchEvent(event);
};
