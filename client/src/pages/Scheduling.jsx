import { useState } from 'react';
import JobsTab from './scheduling/JobsTab.jsx';
import CrewTab from './scheduling/CrewTab.jsx';
import ProcoreTab from './scheduling/ProcoreTab.jsx';

const TABS = {
  jobs: { label: 'Jobs & Calendar', Component: JobsTab },
  crew: { label: 'Crew Roster', Component: CrewTab },
  procore: { label: 'Procore', Component: ProcoreTab },
};

export default function Scheduling() {
  const [tab, setTab] = useState('jobs');
  const { Component } = TABS[tab];

  return (
    <div>
      <h1>Scheduling & Dispatch</h1>
      <div className="tabs">
        {Object.entries(TABS).map(([key, { label }]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      <Component />
    </div>
  );
}
