import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ByNeighborhood from './pages/ByNeighborhood.jsx';
import ByWorker from './pages/ByWorker.jsx';
import ManageWorkers from './pages/ManageWorkers.jsx';
import ManageNeighborhoods from './pages/ManageNeighborhoods.jsx';
import AddJob from './pages/AddJob.jsx';
import AllJobs from './pages/AllJobs.jsx';
import JobDetail from './pages/JobDetail.jsx';
import Invoice from './pages/Invoice.jsx';
import WeeklyJobs from './pages/WeeklyJobs.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="loading">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="loading" style={{ padding: '3rem', textAlign: 'center' }}>Loading…</p>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="all-jobs" element={<AllJobs />} />
        <Route path="weekly" element={<WeeklyJobs />} />
        <Route path="neighborhoods" element={<ByNeighborhood />} />
        <Route path="neighborhoods/manage" element={<ManageNeighborhoods />} />
        <Route path="workers/manage" element={<ManageWorkers />} />
        <Route path="workers" element={<ByWorker />} />
        <Route path="jobs/new" element={<AddJob />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="jobs/:id/invoice" element={<Invoice />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
