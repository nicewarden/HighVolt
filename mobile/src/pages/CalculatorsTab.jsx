import { useState } from 'react';
import OhmsLawCalc from './calculators/OhmsLawCalc.jsx';
import VoltageDropCalc from './calculators/VoltageDropCalc.jsx';
import LoadCalc from './calculators/LoadCalc.jsx';
import TransformerSizingCalc from './calculators/TransformerSizingCalc.jsx';
import PowerFactorCalc from './calculators/PowerFactorCalc.jsx';

const CALCS = {
  ohms: { label: "Ohm's Law", Component: OhmsLawCalc },
  vdrop: { label: 'Voltage Drop', Component: VoltageDropCalc },
  load: { label: 'Load Calc', Component: LoadCalc },
  transformer: { label: 'Transformer Sizing', Component: TransformerSizingCalc },
  pf: { label: 'Power Factor', Component: PowerFactorCalc },
};

export default function CalculatorsTab() {
  const [calc, setCalc] = useState('ohms');
  const { Component } = CALCS[calc];

  return (
    <div>
      <div className="tabs">
        {Object.entries(CALCS).map(([key, { label }]) => (
          <button key={key} className={calc === key ? 'active' : ''} onClick={() => setCalc(key)}>{label}</button>
        ))}
      </div>
      <Component />
    </div>
  );
}
