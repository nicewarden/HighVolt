import { useState } from 'react';
import CodesTab from './pages/CodesTab.jsx';
import CalculatorsTab from './pages/CalculatorsTab.jsx';
import LibraryTab from './pages/LibraryTab.jsx';
import FormulasTab from './pages/FormulasTab.jsx';

const TABS = {
  codes: { label: 'Substation Codes', Component: CodesTab },
  calculators: { label: 'Calculators', Component: CalculatorsTab },
  library: { label: 'Reference Library', Component: LibraryTab },
  formulas: { label: 'Formula Lookup', Component: FormulasTab },
};

export default function App() {
  const [tab, setTab] = useState('codes');
  const { Component } = TABS[tab];

  return (
    <div className="app-shell">
      <header className="app-header">
        <img src="/bolt-icon.png" alt="" className="brand-bolt" />
        <img src="/wordmark-banner.png" alt="HighVolt AI" className="brand-banner" />
      </header>

      <main className="app-main">
        <div className="tabs">
          {Object.entries(TABS).map(([key, { label }]) => (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>
        <Component />
      </main>
    </div>
  );
}
