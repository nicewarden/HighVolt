import { useMemo, useState } from 'react';

export default function TransformerSizingCalc() {
  const [phase, setPhase] = useState('1');
  const [voltage, setVoltage] = useState('');
  const [current, setCurrent] = useState('');

  const result = useMemo(() => {
    const v = parseFloat(voltage), i = parseFloat(current);
    if (isNaN(v) || isNaN(i)) return null;
    const multiplier = phase === '3' ? 1.732 : 1;
    return (multiplier * v * i) / 1000;
  }, [phase, voltage, current]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Transformer Sizing</h3>
      <div className="form-grid">
        <div className="form-row">
          <label>Phase</label>
          <select value={phase} onChange={e => setPhase(e.target.value)}>
            <option value="1">Single phase</option>
            <option value="3">Three phase</option>
          </select>
        </div>
        <div className="form-row"><label>Voltage (V, line-to-line for 3ph)</label><input type="number" value={voltage} onChange={e => setVoltage(e.target.value)} /></div>
        <div className="form-row"><label>Full-load current (A)</label><input type="number" value={current} onChange={e => setCurrent(e.target.value)} /></div>
      </div>
      <div className="calc-result">
        {result !== null ? <><strong>Required capacity:</strong> {result.toFixed(2)} kVA — size up to the next standard transformer rating.</> : 'Enter voltage and current.'}
      </div>
    </div>
  );
}
