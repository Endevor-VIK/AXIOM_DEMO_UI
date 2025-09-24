import React from 'react';

export function ErrorBlock({ title, details, file }: { title: string; details?: string; file?: string }) {
  return (
    <div className="ax-card" role="alert" aria-live="polite" style={{ padding: 16 }}>
      <div className="ax-blade-head">{title}</div>
      <div className="ax-hr-blade" />
      {file && (
        <p style={{ opacity: 0.8, marginTop: 8 }}>
          File: <code>{file}</code>
        </p>
      )}
      {details && <p style={{ opacity: 0.7 }}>{details}</p>}
    </div>
  );
}
