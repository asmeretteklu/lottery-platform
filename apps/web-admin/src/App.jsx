import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CreateLotteryPage from './pages/CreateLotteryPage';
import AddPrizePage from './pages/AddPrizePage';
import LotteryDetailPage from './pages/LotteryDetailPage';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — wrapped in sidebar layout */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/lotteries/create" element={<CreateLotteryPage />} />
        <Route path="/lotteries/:id/prize" element={<AddPrizePage />} />
        <Route path="/lotteries/:id" element={<LotteryDetailPage />} />
      </Route>

      {/* Catch-all redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
