import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import client from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CreateLotteryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    ticket_price: '',
    max_tickets: '',
    draw_at: '',
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Validate
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.ticket_price || parseFloat(form.ticket_price) <= 0) {
      toast.error('Ticket price must be greater than 0');
      return;
    }
    if (!form.max_tickets || parseInt(form.max_tickets) <= 0) {
      toast.error('Max tickets must be greater than 0');
      return;
    }
    if (!form.draw_at) {
      toast.error('Draw date is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        ticket_price: parseFloat(form.ticket_price),
        max_tickets: parseInt(form.max_tickets),
        draw_at: new Date(form.draw_at).toISOString(),
      };

      const { data } = await client.post('/lotteries', payload);
      toast.success('Lottery created! Now add a prize.');
      navigate(`/lotteries/${data.id}/prize`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create lottery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Lottery</h1>
        <p className="text-gray-500 text-sm mt-1">Set up the lottery details — you'll add the prize next</p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="lottery-title" className="block text-sm font-medium text-gray-700 mb-1.5">
              Lottery Title
            </label>
            <input
              id="lottery-title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Friday Evening Coffee Draw"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          {/* Price + Max Tickets row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lottery-price" className="block text-sm font-medium text-gray-700 mb-1.5">
                Ticket Price (ETB)
              </label>
              <input
                id="lottery-price"
                name="ticket_price"
                type="number"
                min="1"
                step="0.01"
                value={form.ticket_price}
                onChange={handleChange}
                placeholder="50"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>
            <div>
              <label htmlFor="lottery-max-tickets" className="block text-sm font-medium text-gray-700 mb-1.5">
                Max Tickets
              </label>
              <input
                id="lottery-max-tickets"
                name="max_tickets"
                type="number"
                min="1"
                value={form.max_tickets}
                onChange={handleChange}
                placeholder="100"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>
          </div>

          {/* Draw Date */}
          <div>
            <label htmlFor="lottery-draw-date" className="block text-sm font-medium text-gray-700 mb-1.5">
              Draw Date & Time
            </label>
            <input
              id="lottery-draw-date"
              name="draw_at"
              type="datetime-local"
              value={form.draw_at}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          {/* Submit */}
          <button
            id="create-lottery-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white font-semibold text-sm shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40 hover:from-gold-600 hover:to-gold-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" color="white" />
                Creating...
              </>
            ) : (
              <>
                Create Lottery
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
