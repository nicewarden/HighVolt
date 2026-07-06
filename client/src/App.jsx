import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import WeatherBackground from './components/WeatherBackground.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Safety from './pages/Safety.jsx';
import Scheduling from './pages/Scheduling.jsx';
import Reference from './pages/Reference.jsx';
import Assistant from './pages/Assistant.jsx';
import Email from './pages/Email.jsx';

function RequireAuth({ children }) {
  const { authenticated } = useAuth();
  const location = useLocation();
  if (authenticated === null) return <div className="app-main">Loading...</div>;
  if (!authenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

export default function App() {
  return (
    <>
      <WeatherBackground />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Assistant />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="safety" element={<Safety />} />
          <Route path="scheduling" element={<Scheduling />} />
          <Route path="reference" element={<Reference />} />
          <Route path="email" element={<Email />} />
        </Route>
      </Routes>
    </>
  );
}
