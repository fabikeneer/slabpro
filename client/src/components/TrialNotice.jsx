import { useState, useEffect, useCallback } from 'react';
import {
  TRIAL_CONFIG,
  formatTrialEndDate,
  formatTrialEndShort,
  shouldShowTrialModal,
  recordTrialModalDismissed,
  getTrialModalRetryDelay,
} from '../config/trial';

export default function TrialNotice() {
  const [showModal, setShowModal] = useState(false);

  const endLabel = formatTrialEndDate();
  const endLabelShort = formatTrialEndShort();
  const { contactEmail } = TRIAL_CONFIG;

  const openModalIfDue = useCallback(() => {
    if (shouldShowTrialModal()) setShowModal(true);
  }, []);

  useEffect(() => {
    if (!TRIAL_CONFIG.enabled) return;

    openModalIfDue();

    const retryDelay = getTrialModalRetryDelay();
    let retryTimeoutId = null;
    if (retryDelay > 0) {
      retryTimeoutId = setTimeout(openModalIfDue, retryDelay);
    }

    const intervalId = setInterval(openModalIfDue, 60 * 1000);

    return () => {
      clearInterval(intervalId);
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
    };
  }, [openModalIfDue]);

  if (!TRIAL_CONFIG.enabled) return null;

  const dismissModal = () => {
    recordTrialModalDismissed();
    setShowModal(false);
  };

  return (
    <>
      <div className="trial-banner trial-banner--urgent" role="status">
        <div className="trial-banner__icon" aria-hidden>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="trial-banner__body">
          <p className="trial-banner__line">
            <strong>¡Atención! Periodo de prueba por vencer.</strong> Límite: {endLabelShort}.
          </p>
          <p className="trial-banner__line">
            Active el hosting cuanto antes para evitar la suspensión del servicio. Detalles en{' '}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        </div>
        <div className="trial-banner__actions">
          <button type="button" className="trial-banner__link trial-banner__link--urgent" onClick={() => setShowModal(true)}>
            Ver más
          </button>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay trial-modal-overlay trial-modal-overlay--urgent">
          <div className="modal-content trial-modal trial-modal--urgent" role="alertdialog" aria-labelledby="trial-modal-title">
            <div className="trial-urgent__badge">Periodo de prueba por concluir</div>

            <div className="trial-urgent__header">
              <div className="trial-urgent__icon" aria-hidden>
                <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 id="trial-modal-title" className="trial-urgent__title">
                Acción requerida — Hosting pendiente
              </h3>
            </div>

            <div className="trial-modal__body">
              <p className="trial-modal__text trial-modal__text--urgent">
                El periodo de prueba de SlabPro está por <strong>finalizar el {endLabel}</strong>.
                Sin la activación del hosting, el sistema podría quedar <strong>fuera de línea</strong>.
              </p>
              <p className="trial-modal__text trial-modal__text--urgent">
                Es necesario gestionar el pago del <strong>servicio de hosting</strong> lo antes posible.
                Revise el correo <a href={`mailto:${contactEmail}`}>{contactEmail}</a> con los detalles
                enviados para la activación.
              </p>
            </div>

            <div className="trial-modal__footer trial-modal__footer--urgent">
              <button type="button" className="btn btn-danger" onClick={dismissModal}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
