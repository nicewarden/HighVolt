import { useState } from 'react';
import ChecklistsTab from './safety/ChecklistsTab.jsx';
import IncidentsTab from './safety/IncidentsTab.jsx';
import ComplianceTab from './safety/ComplianceTab.jsx';

const TABS = {
  checklists: { label: 'Checklists', Component: ChecklistsTab },
  incidents: { label: 'Incidents', Component: IncidentsTab },
  compliance: { label: 'Compliance Calendar', Component: ComplianceTab },
};

export default function Safety() {
  const [tab, setTab] = useState('checklists');
  const { Component } = TABS[tab];

  return (
    <div>
      <h1>Safety & Compliance</h1>
      <div className="tabs">
        {Object.entries(TABS).map(([key, { label }]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      <Component />
    </div>
  );
}
