import { useMemo, useState } from 'react';

export default function OhmsLawCalc() {
  const [solveFor, setSolveFor] = useState('voltage');
  const [voltage, setVoltage] = useState('');
  const [current, setCurrent] = useState('');
  const [resistance, setResistance] = useState('');

  const result = useMemo(() => {
    const v = parseFloat(voltage), i = parseFloat(current), r = parseFloat(resistance);
    if (solveFor === 'voltage' && !isNaN(i) && !isNaN(r)) return { label: 'Voltage', value: i * r, unit: 'V' };
    if (solveFor === 'current' && !isNaN(v) && !isNaN(r) && r !== 0) return { label: 'Current', value: v / r, unit: 'A' };
    if (solveFor === 'resistance' && !isNaN(v) && !isNaN(i) && i !== 0) return { label: 'Resistance', value: v / i, unit: 'Ω' };
    return null;
  }, [solveFor, voltage, current, resistance]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Ohm's Law</h3>
      <div className="form-row">
        <label>Solve for</label>
        <select value={solveFor} onChange={e => setSolveFor(e.target.value)}>
          <option value="voltage">Voltage (V = I x R)</option>
          <option value="current">Current (I = V / R)</option>
          <option value="resistance">Resistance (R = V / I)</option>
        </select>
      </div>
      <div className="form-grid">
        {solveFor !== 'voltage' && (
          <div className="form-row"><label>Voltage (V)</label><input type="number" value={voltage} onChange={e => setVoltage(e.target.value)} /></div>
        )}
        {solveFor !== 'current' && (
          <div className="form-row"><label>Current (A)</label><input type="number" value={current} onChange={e => setCurrent(e.target.value)} /></div>
        )}
        {solveFor !== 'resistance' && (
          <div className="form-row"><label>Resistance (Ω)</label><input type="number" value={resistance} onChange={e => setResistance(e.target.value)} /></div>
        )}
      </div>
      <div className="calc-result">
        {result ? <><strong>{result.label}:</strong> {result.value.toFixed(4)} {result.unit}</> : 'Enter the two known values.'}
      </div>
    </div>
  );
}
