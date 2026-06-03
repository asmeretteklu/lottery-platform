import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';

export default function LotteryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lottery, setLottery] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [claimModalPrizeId, setClaimModalPrizeId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLotteryData();
  }, [id]);

  const fetchLotteryData = async () => {
    try {
      // Fetch lottery details and tickets in parallel
      const [lotteryRes, ticketsRes] = await Promise.all([
        client.get(`/lotteries/${id}`),
        client.get(`/lotteries/${id}/tickets`).catch(() => ({ data: [] })) // Fallback if endpoint fails
      ]);
      
      setLottery(lotteryRes.data);
      setTickets(ticketsRes.data);
    } catch (err) {
      toast.error('Failed to load lottery details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerDraw = async () => {
    setActionLoading(true);
    try {
      await client.post(`/draws/${id}/execute`);
      setIsDrawModalOpen(false);
      
      // Trigger confetti
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);

      toast.success('Draw executed successfully!');
      fetchLotteryData(); // Refresh data to show winner
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to execute draw');
    } finally {
      setActionLoading(false);
    }
  };

  const randomInRange = (min, max) => Math.random() * (max - min) + min;

  const handleMarkClaimed = async () => {
    setActionLoading(true);
    try {
      await client.put(`/lotteries/${id}/prize/claim`, { prize_id: claimModalPrizeId });
      setClaimModalPrizeId(null);
      toast.success('Prize marked as claimed!');
      fetchLotteryData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update prize status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLottery = async () => {
    setActionLoading(true);
    try {
      await client.delete(`/lotteries/${id}`);
      setIsDeleteModalOpen(false);
      toast.success('Lottery deleted successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete lottery');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!lottery) return null;

  const prizes = lottery.prizes || [];
  const progressPercent = Math.min(100, ((lottery.tickets_sold || 0) / lottery.max_tickets) * 100);
  const canDelete = ['draft', 'cancelled'].includes(lottery.status) && (lottery.tickets_sold || 0) === 0;
  
  // Can draw if active AND (sold out OR past draw date)
  const isPastDrawDate = lottery.draw_at && new Date() >= new Date(lottery.draw_at);
  const isSoldOut = (lottery.tickets_sold || 0) >= lottery.max_tickets;
  const canDraw = lottery.status === 'active' && (isSoldOut || isPastDrawDate);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{lottery.title}</h1>
            <StatusBadge status={lottery.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Draw Date: {lottery.draw_at ? new Date(lottery.draw_at).toLocaleString() : 'Not set'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">Ticket Price</p>
            <p className="text-xl font-bold text-gray-900">{parseFloat(lottery.ticket_price).toLocaleString()} ETB</p>
          </div>
          {canDelete && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 text-sm font-medium transition-colors border border-red-100"
              title="Delete Lottery"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Progress & Tickets */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Progress Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-end mb-2">
              <h3 className="font-semibold text-gray-900">Ticket Sales</h3>
              <p className="text-sm font-medium text-gray-600">
                {lottery.tickets_sold || 0} <span className="text-gray-400 font-normal">/ {lottery.max_tickets}</span>
              </p>
            </div>
            <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-500 transition-all duration-1000 ease-out animate-progress"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {isSoldOut && (
              <p className="text-sm text-emerald-600 mt-2 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Sold Out!
              </p>
            )}
          </div>

          {/* Draw Execution Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Draw Execution</h3>
            
            {lottery.status === 'completed' ? (
              <div className="bg-emerald-50 rounded-xl p-6 text-center border border-emerald-100">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-emerald-800 mb-1">Draw Completed</h4>
                <p className="text-sm text-emerald-600">
                  Winning Ticket: <span className="font-mono font-bold bg-white px-2 py-1 rounded mx-1">
                    {/* Assuming we might fetch draw details or they're joined. For now, rely on lottery status */}
                    Check draw history
                  </span>
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Trigger Automatic Draw</p>
                  <p className="text-sm text-gray-500 mt-0.5 max-w-sm">
                    Executes the verifiable random draw process. Can only be done when tickets are sold out or draw date has passed.
                  </p>
                </div>
                
                <div className="group relative">
                  <button
                    onClick={() => setIsDrawModalOpen(true)}
                    disabled={!canDraw}
                    className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm
                      ${canDraw 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    Trigger Draw
                  </button>
                  
                  {/* Tooltip for disabled state */}
                  {!canDraw && lottery.status === 'active' && (
                    <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 text-white text-xs p-2 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      Waiting for all tickets to sell or draw date to arrive.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tickets Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Ticket Buyers</h3>
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {tickets.length} total
              </span>
            </div>
            
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No tickets sold yet.</div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ticket #</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Player Phone</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Purchased</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tickets.map(t => (
                      <tr key={t.id} className={t.is_winner ? 'bg-emerald-50' : ''}>
                        <td className="px-6 py-3 font-mono text-sm font-medium text-gray-900">
                          {t.ticket_number}
                          {t.is_winner && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">Winner</span>}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{t.users?.phone || 'Unknown'}</td>
                        <td className="px-6 py-3 text-sm text-gray-500">
                          {new Date(t.purchased_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Prize */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Prize Details</h3>
            </div>
            
            {!prizes.length ? (
              <div className="p-6 text-center">
                <p className="text-gray-500 text-sm mb-4">No prize added yet.</p>
                <button
                  onClick={() => navigate(`/lotteries/${id}/prize`)}
                  className="px-4 py-2 bg-gold-50 text-gold-600 rounded-lg text-sm font-medium hover:bg-gold-100 transition-colors"
                >
                  Add Prize
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {prizes.map((prize) => {
                  const getRankBadge = (rank) => {
                    if (rank === 1) return '🥇';
                    if (rank === 2) return '🥈';
                    if (rank === 3) return '🥉';
                    return `#${rank}`;
                  };

                  return (
                    <div key={prize.id} className="pb-6 last:pb-0 pt-6 first:pt-0">
                      {prize.photo_url && (
                        <div className="aspect-video w-full bg-gray-100 overflow-hidden relative group">
                          <img src={prize.photo_url} alt={prize.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm font-bold text-gray-900 flex items-center gap-1.5">
                            <span className="text-xl">{getRankBadge(prize.prize_rank)}</span>
                            <span>Prize</span>
                          </div>
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg text-gray-900">
                            {!prize.photo_url && <span className="mr-2 text-xl">{getRankBadge(prize.prize_rank)}</span>}
                            {prize.title}
                          </h4>
                          <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ml-2">
                            {parseFloat(prize.value_etb).toLocaleString()} ETB
                          </span>
                        </div>
                        {prize.description && (
                          <p className="text-sm text-gray-600 mb-6 leading-relaxed">{prize.description}</p>
                        )}
                        
                        {/* Claim Status */}
                        <div className="pt-4 border-t border-gray-100">
                          {prize.claimed ? (
                            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Claimed on {new Date(prize.claimed_at).toLocaleDateString()}
                            </div>
                          ) : (
                            lottery.status === 'completed' && (
                              <button
                                onClick={() => setClaimModalPrizeId(prize.id)}
                                className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                              >
                                Mark Prize Claimed
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={isDrawModalOpen}
        title="Execute Draw"
        message="Are you sure you want to trigger the draw? This will randomly select a winner and complete the lottery. This action cannot be undone."
        confirmLabel="Execute Draw"
        variant="success"
        loading={actionLoading}
        onConfirm={handleTriggerDraw}
        onCancel={() => setIsDrawModalOpen(false)}
      />

      <ConfirmModal
        isOpen={!!claimModalPrizeId}
        title="Mark Prize Claimed"
        message="Are you sure you want to mark this prize as claimed by the winner? Make sure they have presented the winning ticket."
        confirmLabel="Mark Claimed"
        variant="success"
        loading={actionLoading}
        onConfirm={handleMarkClaimed}
        onCancel={() => setClaimModalPrizeId(null)}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Lottery"
        message="Are you sure you want to delete this lottery? This cannot be undone."
        confirmLabel="Delete Lottery"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteLottery}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
