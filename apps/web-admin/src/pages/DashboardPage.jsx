import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchLotteries();
  }, []);

  const fetchLotteries = async () => {
    try {
      const { data } = await client.get('/lotteries');
      setLotteries(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load lotteries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await client.delete(`/lotteries/${deleteTarget.id}`);
      toast.success(`"${deleteTarget.title}" deleted successfully!`);
      setDeleteTarget(null);
      fetchLotteries();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete lottery');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Compute stats
  const activeLotteries = lotteries.filter((l) => l.status === 'active').length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Simple approximation: tickets sold today = total tickets_sold on lotteries created today
  // In production you'd have a proper analytics endpoint
  const ticketsSoldToday = lotteries
    .filter((l) => l.created_at && l.created_at.startsWith(todayStr))
    .reduce((sum, l) => sum + (l.tickets_sold || 0), 0);

  const revenueToday = lotteries
    .filter((l) => l.created_at && l.created_at.startsWith(todayStr))
    .reduce((sum, l) => sum + (l.tickets_sold || 0) * parseFloat(l.ticket_price || 0), 0);

  const stats = [
    {
      label: 'Active Lotteries',
      value: activeLotteries,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'from-emerald-400 to-emerald-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      label: 'Tickets Sold Today',
      value: ticketsSoldToday,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
      color: 'from-blue-400 to-blue-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Revenue Today',
      value: `${revenueToday.toLocaleString()} ETB`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-gold-400 to-gold-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-gold-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your lottery operations</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bgLight} ${stat.textColor} flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Lottery table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">All Lotteries</h2>
            <p className="text-sm text-gray-500 mt-0.5">{lotteries.length} total</p>
          </div>
          <button
            id="create-lottery-button"
            onClick={() => navigate('/lotteries/create')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white text-sm font-medium shadow-sm hover:shadow-md hover:from-gold-600 hover:to-gold-700 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Lottery
          </button>
        </div>

        {lotteries.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-gray-400 font-medium">No lotteries yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first lottery to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" id="lotteries-table">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tickets</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Draw Date</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lotteries.map((lottery) => (
                  <tr
                    key={lottery.id}
                    className="hover:bg-gray-50/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{lottery.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {parseFloat(lottery.ticket_price).toLocaleString()} ETB / ticket
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={lottery.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[100px] h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-500 transition-all duration-500"
                            style={{
                              width: `${Math.min(100, ((lottery.tickets_sold || 0) / lottery.max_tickets) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {lottery.tickets_sold || 0} / {lottery.max_tickets}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        {lottery.draw_at
                          ? new Date(lottery.draw_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          id={`view-lottery-${lottery.id}`}
                          onClick={() => navigate(`/lotteries/${lottery.id}`)}
                          className="px-4 py-1.5 rounded-lg text-sm font-medium text-gold-600 bg-gold-50 hover:bg-gold-100 transition-colors duration-200"
                        >
                          View
                        </button>
                        {['draft', 'cancelled'].includes(lottery.status) && (lottery.tickets_sold || 0) === 0 && (
                          <button
                            id={`delete-lottery-${lottery.id}`}
                            onClick={() => setDeleteTarget({ id: lottery.id, title: lottery.title })}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                            title="Delete lottery"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Lottery"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete Lottery"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
