import { useMemo, useState } from 'react';

export default function PowerFactorCalc() {
  const [realPower, setRealPower] = useState('');
  const [apparentPower, setApparentPower] = useState('');

  const result = useMemo(() => {
    const kw = parseFloat(realPower), kva = parseFloat(apparentPower);
    if (isNaN(kw) || isNaN(kva) || kva === 0) return null;
    const pf = kw / kva;
    const kvar = Math.sqrt(Math.max(kva * kva - kw * kw, 0));
    return { pf, kvar };
  }, [realPower, apparentPower]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Power Factor</h3>
      <div className="form-grid">
        <div className="form-row"><label>Real power (kW)</label><input type="number" value={realPower} onChange={e => setRealPower(e.target.value)} /></div>
        <div className="form-row"><label>Apparent power (kVA)</label><input type="number" value={apparentPower} onChange={e => setApparentPower(e.target.value)} /></div>
      </div>
      <div className="calc-result">
        {result
          ? <>
              <strong>Power factor:</strong> {result.pf.toFixed(3)}
              {' '}({(result.pf * 100).toFixed(1)}%) · <strong>Reactive power:</strong> {result.kvar.toFixed(2)} kVAR
            </>
          : 'Enter real and apparent power.'}
      </div>
    </div>
  );
}
