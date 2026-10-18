import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

/**
 * Checks that:
 * 1. A token exists in localStorage
 * 2. The token is not expired (decoded client-side — no crypto, just a safety net)
 *
 * The backend is the authoritative verifier; this only prevents the UI from
 * showing a stale session after a 2-hour JWT expires.
 */
function isTokenValid(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is seconds since epoch
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default function ProtectedRoute() {
  const token = localStorage.getItem('lottery_token');

  if (!token || !isTokenValid(token)) {
    // Clear stale auth data before redirecting
    localStorage.removeItem('lottery_token');
    localStorage.removeItem('lottery_role');
    localStorage.removeItem('lottery_admin_name');
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
