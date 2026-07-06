import { useMemo, useState } from 'react';

export default function LoadCalc() {
  const [phase, setPhase] = useState('1');
  const [voltage, setVoltage] = useState('');
  const [current, setCurrent] = useState('');
  const [pf, setPf] = useState('1');

  const result = useMemo(() => {
    const v = parseFloat(voltage), i = parseFloat(current), p = parseFloat(pf);
    if (isNaN(v) || isNaN(i) || isNaN(p)) return null;
    const multiplier = phase === '3' ? 1.732 : 1;
    const watts = multiplier * v * i * p;
    return { watts, kw: watts / 1000 };
  }, [phase, voltage, current, pf]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Load Calculation (Real Power)</h3>
      <div className="form-grid">
        <div className="form-row">
          <label>Phase</label>
          <select value={phase} onChange={e => setPhase(e.target.value)}>
            <option value="1">Single phase</option>
            <option value="3">Three phase</option>
          </select>
        </div>
        <div className="form-row"><label>Voltage (V)</label><input type="number" value={voltage} onChange={e => setVoltage(e.target.value)} /></div>
        <div className="form-row"><label>Current (A)</label><input type="number" value={current} onChange={e => setCurrent(e.target.value)} /></div>
        <div className="form-row"><label>Power factor (0-1)</label><input type="number" step="0.01" min="0" max="1" value={pf} onChange={e => setPf(e.target.value)} /></div>
      </div>
      <div className="calc-result">
        {result ? <><strong>Real power:</strong> {result.watts.toFixed(1)} W ({result.kw.toFixed(3)} kW)</> : 'Enter voltage, current, and power factor.'}
      </div>
    </div>
  );
}
