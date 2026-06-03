import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function ProtectedRoute() {
  const token = localStorage.getItem('lottery_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 bg-gray-50 min-h-screen">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
