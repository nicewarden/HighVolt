import { useState } from 'react';
import CalculatorsTab from './reference/CalculatorsTab.jsx';
import LibraryTab from './reference/LibraryTab.jsx';
import FormulasTab from './reference/FormulasTab.jsx';
import CodesTab from './reference/CodesTab.jsx';

const TABS = {
  codes: { label: 'Substation Codes', Component: CodesTab },
  calculators: { label: 'Calculators', Component: CalculatorsTab },
  library: { label: 'Reference Library', Component: LibraryTab },
  formulas: { label: 'Formula Lookup', Component: FormulasTab },
};

export default function Reference() {
  const [tab, setTab] = useState('codes');
  const { Component } = TABS[tab];

  return (
    <div>
      <h1>Technical Reference</h1>
      <div className="tabs">
        {Object.entries(TABS).map(([key, { label }]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      <Component />
    </div>
  );
}
