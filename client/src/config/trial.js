// Configuración del aviso de periodo de prueba / hosting
// VITE_TRIAL_END_DATE=2026-06-22

const endDateRaw = import.meta.env.VITE_TRIAL_END_DATE || '2026-06-22';
const contactEmail = import.meta.env.VITE_TRIAL_CONTACT_EMAIL || 'keneermanganiello@gmail.com';

export const TRIAL_CONFIG = {
  enabled: import.meta.env.VITE_TRIAL_NOTICE !== 'false',
  endDate: endDateRaw,
  contactEmail,
  modalIntervalHours: Number(import.meta.env.VITE_TRIAL_MODAL_HOURS) || 3,
};

export const TRIAL_MODAL_INTERVAL_MS = TRIAL_CONFIG.modalIntervalHours * 60 * 60 * 1000;

const MODAL_DISMISSED_KEY = 'slabpro_trial_modal_dismissed_at';

export function getTrialEndDate() {
  const [y, m, d] = TRIAL_CONFIG.endDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shouldShowTrialModal(now = Date.now()) {
  const last = localStorage.getItem(MODAL_DISMISSED_KEY);
  if (!last) return true;

  const lastDismissed = Number(last);
  if (Number.isNaN(lastDismissed)) return true;

  return now - lastDismissed >= TRIAL_MODAL_INTERVAL_MS;
}

export function recordTrialModalDismissed(now = Date.now()) {
  localStorage.setItem(MODAL_DISMISSED_KEY, String(now));
}

export function getTrialModalRetryDelay(now = Date.now()) {
  const last = localStorage.getItem(MODAL_DISMISSED_KEY);
  if (!last) return 0;

  const lastDismissed = Number(last);
  if (Number.isNaN(lastDismissed)) return 0;

  return Math.max(0, TRIAL_MODAL_INTERVAL_MS - (now - lastDismissed));
}

export function formatTrialEndDate() {
  return getTrialEndDate().toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTrialEndShort() {
  return getTrialEndDate().toLocaleDateString('es-VE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
