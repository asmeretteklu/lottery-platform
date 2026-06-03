import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import client from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function AddPrizePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    value_etb: '',
    prize_rank: 1,
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only JPEG and PNG images are allowed');
      e.target.value = '';
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size must be under 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
      e.target.value = '';
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!form.title.trim()) {
      toast.error('Prize title is required');
      return;
    }
    if (!form.value_etb || parseFloat(form.value_etb) <= 0) {
      toast.error('Prize value must be greater than 0');
      return;
    }
    if (!photoFile) {
      toast.error('Please select a prize photo');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Upload photo
      const formData = new FormData();
      formData.append('photo', photoFile);

      const { data: uploadResult } = await client.post(
        `/lotteries/${id}/prize/upload-photo`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      // Step 2: Create prize with the returned photo URL
      await client.post(`/lotteries/${id}/prize`, {
        title: form.title.trim(),
        description: form.description.trim(),
        value_etb: parseFloat(form.value_etb),
        prize_rank: parseInt(form.prize_rank, 10),
        photo_url: uploadResult.photo_url,
      });

      toast.success('Prize added successfully!');
      setIsSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add prize');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(`/lotteries/${id}`)}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Lottery
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Add Prize</h1>
        <p className="text-gray-500 text-sm mt-1">Define what the winner takes home</p>
      </div>

      {/* Form or Success View */}
      {isSuccess ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Prize Added!</h2>
            <p className="text-gray-500 text-sm">You can add another prize or return to the lottery details.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => {
                setForm(prev => ({ title: '', description: '', value_etb: '', prize_rank: parseInt(prev.prize_rank, 10) + 1 }));
                setPhotoFile(null);
                setPhotoPreview(null);
                setIsSuccess(false);
              }}
              className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Add Another Prize
            </button>
            <button
              onClick={() => navigate(`/lotteries/${id}`)}
              className="px-6 py-2.5 rounded-xl bg-gold-500 text-white font-medium hover:bg-gold-600 transition-colors shadow-sm"
            >
              Done — View Lottery
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rank */}
            <div>
              <label htmlFor="prize-rank" className="block text-sm font-medium text-gray-700 mb-1.5">
                Prize Rank (1 = First Prize, 2 = Second Prize...)
              </label>
              <input
                id="prize-rank"
                name="prize_rank"
                type="number"
                min="1"
                value={form.prize_rank}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            {/* Title */}
            <div>
              <label htmlFor="prize-title" className="block text-sm font-medium text-gray-700 mb-1.5">
                Prize Title
              </label>
              <input
                id="prize-title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Samsung Galaxy S24"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="prize-description" className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                id="prize-description"
                name="description"
                rows={3}
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the prize..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>

            {/* Value */}
            <div>
              <label htmlFor="prize-value" className="block text-sm font-medium text-gray-700 mb-1.5">
                Value in ETB
              </label>
              <input
                id="prize-value"
                name="value_etb"
                type="number"
                min="1"
                step="0.01"
                value={form.value_etb}
                onChange={handleChange}
                placeholder="25000"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Prize Photo <span className="text-gray-400 font-normal">(JPEG or PNG, max 5MB)</span>
              </label>

              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-3">
                  <img
                    src={photoPreview}
                    alt="Prize preview"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="prize-photo"
                  className="flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors duration-200"
                >
                  <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">Click to upload photo</p>
                  <p className="text-xs text-gray-400 mt-1">JPEG or PNG, max 5MB</p>
                </label>
              )}

              <input
                id="prize-photo"
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Submit */}
            <button
              id="add-prize-submit"
              type="submit"
              disabled={loading || !photoFile}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white font-semibold text-sm shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40 hover:from-gold-600 hover:to-gold-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  Uploading & Saving...
                </>
              ) : (
                'Add Prize'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
