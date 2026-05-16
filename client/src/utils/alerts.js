import Swal from 'sweetalert2';

// Diseño base acorde al Light Theme actual
const baseConfig = {
  customClass: {
    popup: 'swal-custom-popup',
    title: 'swal-custom-title',
    htmlContainer: 'swal-custom-text',
    confirmButton: 'btn btn-primary',
    cancelButton: 'btn btn-ghost',
  },
  buttonsStyling: false,
  background: '#ffffff',
  color: '#111827',
};

// ── Toasts Sutiles (Esquina superior) ──────────────────────────────────
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#ffffff',
  color: '#111827',
  customClass: {
    popup: 'swal-toast-popup',
  },
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

export const toastSuccess = (msg) => {
  Toast.fire({
    icon: 'success',
    title: msg,
    iconColor: '#10b981', // var(--accent-green)
  });
};

export const toastError = (msg) => {
  Toast.fire({
    icon: 'error',
    title: msg,
    iconColor: '#ef4444', // var(--accent-red)
  });
};

// ── Modales de Confirmación ───────────────────────────────────────────
export const confirmAction = async (title, text = '', confirmText = 'Aceptar', cancelText = 'Cancelar') => {
  const result = await Swal.fire({
    ...baseConfig,
    title,
    text,
    icon: 'warning',
    iconColor: '#f59e0b', // var(--accent-gold)
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
  });
  return result.isConfirmed;
};

// ── Modales Informativos ──────────────────────────────────────────────
export const showAlert = (title, text, icon = 'info') => {
  let iconColor = '#3b82f6';
  if (icon === 'success') iconColor = '#10b981';
  if (icon === 'error') iconColor = '#ef4444';
  if (icon === 'warning') iconColor = '#f59e0b';

  Swal.fire({
    ...baseConfig,
    title,
    text,
    icon,
    iconColor,
    confirmButtonText: 'Entendido',
  });
};
