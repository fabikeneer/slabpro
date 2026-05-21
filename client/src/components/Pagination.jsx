import React from 'react';

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages } = pagination;

  // Generar array de páginas (mostrando máximo 5 páginas alrededor de la actual)
  let startPage = Math.max(1, page - 2);
  let endPage = Math.min(totalPages, page + 2);

  // Ajustar si estamos cerca de los bordes
  if (page <= 2) {
    endPage = Math.min(totalPages, 5);
  }
  if (page >= totalPages - 1) {
    startPage = Math.max(1, totalPages - 4);
  }

  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '24px', flexWrap: 'wrap' }}>
      <button 
        className="btn btn-ghost btn-sm" 
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        &laquo;
      </button>

      {startPage > 1 && (
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => onPageChange(1)}>1</button>
          {startPage > 2 && <span style={{ color: 'var(--text-muted)' }}>...</span>}
        </>
      )}

      {pages.map(p => (
        <button 
          key={p} 
          className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onPageChange(p)}
          style={{ minWidth: '32px' }}
        >
          {p}
        </button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span style={{ color: 'var(--text-muted)' }}>...</span>}
          <button className="btn btn-ghost btn-sm" onClick={() => onPageChange(totalPages)}>{totalPages}</button>
        </>
      )}

      <button 
        className="btn btn-ghost btn-sm" 
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        &raquo;
      </button>
    </div>
  );
}
