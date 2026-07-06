import { FORMULAS } from '../lib/formulas.js';

export default function FormulasTab() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Quick Formula Lookup</h2>
      <div className="grid grid-3">
        {FORMULAS.map(f => (
          <div key={f.id} className="card">
            <strong>{f.name}</strong>
            <p style={{ fontFamily: 'monospace', fontSize: '0.95rem', margin: '8px 0' }}>{f.formula}</p>
            <p style={{ fontSize: '0.85rem', opacity: 0.85 }}>{f.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
