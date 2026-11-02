import { Route, Routes } from 'react-router-dom';
import Background from './components/Background.jsx';
import { PublicLayout, AppLayout, ProtectedRoute } from './components/Layouts.jsx';
import Home from './pages/Home.jsx';
import Features from './pages/Features.jsx';
import { Pricing, About, NotFound } from './pages/Info.jsx';
import Scan, { ScanReport } from './pages/Scan.jsx';
import { Login, Signup, Forgot, Reset } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import HistoryPage from './pages/History.jsx';
import Alerts from './pages/Alerts.jsx';
import Intel from './pages/Intel.jsx';
import Reports from './pages/Reports.jsx';
import Awareness from './pages/Awareness.jsx';
import { Profile, SettingsPage } from './pages/Account.jsx';

export default function App() {
  return (
    <>
      <Background />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="features" element={<Features />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="about" element={<About />} />
          <Route path="scan" element={<Scan />} />
          <Route path="scan/:id" element={<ProtectedRoute><ScanReport /></ProtectedRoute>} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="forgot-password" element={<Forgot />} />
          <Route path="reset-password" element={<Reset />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="intel" element={<Intel />} />
          <Route path="reports" element={<Reports />} />
          <Route path="awareness/*" element={<Awareness />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </>
  );
}
