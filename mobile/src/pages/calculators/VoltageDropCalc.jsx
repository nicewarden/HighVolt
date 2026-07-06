import { useMemo, useState } from 'react';

const K_VALUES = { copper: 12.9, aluminum: 21.2 };

export default function VoltageDropCalc() {
  const [phase, setPhase] = useState('1');
  const [material, setMaterial] = useState('copper');
  const [current, setCurrent] = useState('');
  const [length, setLength] = useState('');
  const [cm, setCm] = useState('');
  const [sourceVoltage, setSourceVoltage] = useState('');

  const result = useMemo(() => {
    const i = parseFloat(current), l = parseFloat(length), area = parseFloat(cm), sv = parseFloat(sourceVoltage);
    if (isNaN(i) || isNaN(l) || isNaN(area) || area === 0) return null;
    const k = K_VALUES[material];
    const multiplier = phase === '3' ? 1.732 : 2;
    const vdrop = (multiplier * k * i * l) / area;
    const percent = !isNaN(sv) && sv !== 0 ? (vdrop / sv) * 100 : null;
    return { vdrop, percent };
  }, [phase, material, current, length, cm, sourceVoltage]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Voltage Drop</h3>
      <div className="form-grid">
        <div className="form-row">
          <label>Phase</label>
          <select value={phase} onChange={e => setPhase(e.target.value)}>
            <option value="1">Single phase</option>
            <option value="3">Three phase</option>
          </select>
        </div>
        <div className="form-row">
          <label>Conductor material</label>
          <select value={material} onChange={e => setMaterial(e.target.value)}>
            <option value="copper">Copper (K=12.9)</option>
            <option value="aluminum">Aluminum (K=21.2)</option>
          </select>
        </div>
        <div className="form-row"><label>Load current (A)</label><input type="number" value={current} onChange={e => setCurrent(e.target.value)} /></div>
        <div className="form-row"><label>One-way length (ft)</label><input type="number" value={length} onChange={e => setLength(e.target.value)} /></div>
        <div className="form-row"><label>Conductor size (circular mils)</label><input type="number" value={cm} onChange={e => setCm(e.target.value)} /></div>
        <div className="form-row"><label>Source voltage (optional, for %)</label><input type="number" value={sourceVoltage} onChange={e => setSourceVoltage(e.target.value)} /></div>
      </div>
      <div className="calc-result">
        {result
          ? <>
              <strong>Voltage drop:</strong> {result.vdrop.toFixed(2)} V
              {result.percent !== null && <> ({result.percent.toFixed(2)}% of source voltage)</>}
            </>
          : 'Enter current, length, and conductor size.'}
      </div>
    </div>
  );
}
