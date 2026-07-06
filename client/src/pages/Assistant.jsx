import { useState } from 'react';
import TodoTab from './assistant/TodoTab.jsx';
import RecordingsTab from './assistant/RecordingsTab.jsx';
import NotesTab from './assistant/NotesTab.jsx';
import DraftsTab from './assistant/DraftsTab.jsx';
import AskTab from './assistant/AskTab.jsx';
import ExecuteTab from './assistant/ExecuteTab.jsx';

const TABS = {
  todo: { label: 'To-Do', Component: TodoTab },
  recordings: { label: 'Recordings', Component: RecordingsTab },
  execute: { label: 'Run Command (Advanced)', Component: ExecuteTab },
  notes: { label: 'Notes', Component: NotesTab },
  drafts: { label: 'Drafts', Component: DraftsTab },
  ask: { label: 'Search Notes', Component: AskTab },
};

export default function Assistant() {
  const [tab, setTab] = useState('todo');
  const { Component } = TABS[tab];

  return (
    <div className="assistant-page">
      <Component />
      <div className="tabs assistant-tabs">
        {Object.entries(TABS).map(([key, { label }]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
    </div>
  );
}
