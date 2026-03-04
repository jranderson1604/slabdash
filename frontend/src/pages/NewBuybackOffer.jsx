import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { buyback, customers, cards as cardsApi } from '../api/client';
import {
  ArrowLeft,
  X,
  Save,
  DollarSign,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NewBuybackOffer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [customerList, setCustomerList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerCards, setCustomerCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [offerMessage, setOfferMessage] = useState('');
  const [deadlineHours, setDeadlineHours] = useState(24);
  const [isBulkOffer, setIsBulkOffer] = useState(false);
  const [bulkDiscount, setBulkDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialCardLoaded, setInitialCardLoaded] = useState(false);

  // Load customers on mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Handle card_id query parameter (from Cards page green dollar icon)
  useEffect(() => {
    const cardId = searchParams.get('card_id');
    if (cardId && !initialCardLoaded) {
      loadCardById(cardId);
    }
  }, [searchParams, initialCardLoaded]);

  // Load customer cards when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerCards(selectedCustomer);
    } else {
      setCustomerCards([]);
      if (!initialCardLoaded) {
        setSelectedCards([]);
      }
    }
  }, [selectedCustomer]);

  const loadCustomers = async () => {
    try {
      const res = await customers.list({});
      setCustomerList(res.data.customers || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadCardById = async (cardId) => {
    try {
      const res = await cardsApi.get(cardId);
      const card = res.data;

      if (card.customer_id) {
        setSelectedCustomer(card.customer_id);
      }

      setSelectedCards([{
        card_id: card.id,
        card_name: card.description,
        grade: card.grade,
        player_name: card.player_name,
        offer_amount: 0,
        grading_fee: 0,
      }]);
      setInitialCardLoaded(true);
    } catch (error) {
      console.error('Failed to load card:', error);
      toast.error('Could not load the selected card');
    }
  };

  const loadCustomerCards = async (customerId) => {
    try {
      const res = await cardsApi.list({ customer_id: customerId, limit: 500 });
      setCustomerCards(res.data.cards || []);
    } catch (error) {
      console.error('Failed to load cards:', error);
    }
  };

  const toggleCardSelection = (card) => {
    const existing = selectedCards.find((c) => c.card_id === card.id);
    if (existing) {
      setSelectedCards(selectedCards.filter((c) => c.card_id !== card.id));
    } else {
      setSelectedCards([
        ...selectedCards,
        {
          card_id: card.id,
          card_name: card.description,
          grade: card.grade,
          player_name: card.player_name,
          offer_amount: 0,
          grading_fee: 0,
        },
      ]);
    }
  };

  const updateCardOffer = (cardId, field, value) => {
    setSelectedCards(
      selectedCards.map((c) =>
        c.card_id === cardId ? { ...c, [field]: parseFloat(value) || 0 } : c
      )
    );
  };

  const calculateTotals = () => {
    const totalOffer = selectedCards.reduce((sum, c) => sum + (c.offer_amount || 0), 0);
    const totalFees = selectedCards.reduce((sum, c) => sum + (c.grading_fee || 0), 0);
    const discount = isBulkOffer ? (totalOffer * bulkDiscount) / 100 : 0;
    const finalOffer = totalOffer - discount;
    const finalPayout = finalOffer - totalFees;

    return { totalOffer, totalFees, discount, finalOffer, finalPayout };
  };

  const handleCreate = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (selectedCards.length === 0) {
      toast.error('Please select at least one card');
      return;
    }

    if (selectedCards.some((c) => !c.offer_amount || c.offer_amount <= 0)) {
      toast.error('Please enter offer amounts for all cards');
      return;
    }

    setLoading(true);
    try {
      await buyback.create({
        customer_id: selectedCustomer,
        cards: selectedCards.map((c) => ({
          card_id: c.card_id,
          offer_amount: c.offer_amount,
          grading_fee: c.grading_fee || 0,
        })),
        offer_message: offerMessage,
        response_deadline_hours: deadlineHours,
        is_bulk_offer: isBulkOffer,
        bulk_discount_percent: isBulkOffer ? bulkDiscount : 0,
      });

      toast.success(`Created ${selectedCards.length} buyback offer${selectedCards.length > 1 ? 's' : ''}`);
      navigate('/buyback');
    } catch (error) {
      console.error('Failed to create offer:', error);
      toast.error(error.response?.data?.error || 'Failed to create buyback offer');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl" style={{ background: 'var(--hdr-gradient)', boxShadow: 'var(--hdr-shadow)', border: 'var(--hdr-border)' }}>
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full" style={{ background: 'var(--hdr-circle-1)' }} />
        <div className="absolute -bottom-10 -left-8 w-40 h-40 rounded-full" style={{ background: 'var(--hdr-circle-2)' }} />
        <div className="relative px-6 sm:px-8 py-7">
          <div className="flex items-center gap-4">
            <Link
              to="/buyback"
              className="p-2 rounded-xl transition-all hover:bg-white/20 flex-shrink-0"
              style={{ background: 'var(--hdr-back-bg)', border: 'var(--hdr-back-border)' }}
              aria-label="Back to Buyback"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--hdr-btn-color)' }} />
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--hdr-eyebrow)' }}>Purchasing</p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight" style={{ color: 'var(--hdr-title)' }}>New Buyback Offer</h1>
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--hdr-sub)' }}>Create a purchase offer for customer cards</p>
            </div>
          </div>
        </div>
      </div>

      {/* Select Customer */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Customer</h2>
        <select
          value={selectedCustomer}
          onChange={(e) => {
            setSelectedCustomer(e.target.value);
            setSelectedCards([]);
            setInitialCardLoaded(false);
          }}
          className="input"
        >
          <option value="">Choose a customer...</option>
          {customerList.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} ({customer.email})
            </option>
          ))}
        </select>
      </div>

      {/* Select Cards */}
      {selectedCustomer && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select Cards ({selectedCards.length} selected)
          </h2>

          {customerCards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No cards found for this customer</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customerCards.map((card) => {
                const isSelected = selectedCards.some((c) => c.card_id === card.id);
                return (
                  <div
                    key={card.id}
                    onClick={() => toggleCardSelection(card)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-1 w-4 h-4 text-brand-600 rounded"
                      />

                      {/* Card Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{card.description}</p>
                        <p className="text-sm text-gray-600">
                          {card.year} {card.brand} {card.player_name}
                        </p>
                        {card.grade && (
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            Grade: {card.grade}
                          </p>
                        )}
                        {card.card_images && card.card_images.length > 0 && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <ImageIcon className="w-3 h-3" />
                            {card.card_images.length} image{card.card_images.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Offer Details for Selected Cards */}
      {selectedCards.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Offer Details</h2>

          <div className="space-y-4">
            {selectedCards.map((card) => (
              <div key={card.card_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{card.card_name}</p>
                    {card.grade && (
                      <p className="text-sm text-gray-500">Grade: {card.grade}</p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setSelectedCards(selectedCards.filter((c) => c.card_id !== card.card_id))
                    }
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Offer Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={card.offer_amount || ''}
                      onChange={(e) =>
                        updateCardOffer(card.card_id, 'offer_amount', e.target.value)
                      }
                      className="input"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="label">Grading Fee ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={card.grading_fee || ''}
                      onChange={(e) =>
                        updateCardOffer(card.card_id, 'grading_fee', e.target.value)
                      }
                      className="input"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bulk Discount */}
          {selectedCards.length > 1 && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <label className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={isBulkOffer}
                  onChange={(e) => setIsBulkOffer(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded"
                />
                <span className="font-medium text-gray-900">Apply Bulk Discount</span>
              </label>

              {isBulkOffer && (
                <div className="ml-6">
                  <label className="label">Discount Percentage (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={bulkDiscount}
                    onChange={(e) => setBulkDiscount(parseFloat(e.target.value) || 0)}
                    className="input max-w-xs"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          )}

          {/* Totals */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Offer Amount:</span>
              <span className="font-medium text-gray-900">${totals.totalOffer.toFixed(2)}</span>
            </div>
            {isBulkOffer && totals.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Bulk Discount ({bulkDiscount}%):</span>
                <span className="font-medium text-red-600">-${totals.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Grading Fees:</span>
              <span className="font-medium text-gray-900">-${totals.totalFees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
              <span className="text-gray-900">Final Payout to Customer:</span>
              <span className="text-brand-600">${totals.finalPayout.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Additional Details */}
      {selectedCards.length > 0 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Additional Details</h2>

          <div>
            <label className="label">Message to Customer</label>
            <textarea
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              className="input"
              rows="4"
              placeholder="Optional message explaining the offer..."
            />
          </div>

          <div>
            <label className="label">Response Deadline</label>
            <select
              value={deadlineHours}
              onChange={(e) => setDeadlineHours(parseInt(e.target.value))}
              className="input max-w-xs"
            >
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
            </select>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">This will send an email to the customer</p>
              <p>
                They will have {deadlineHours} hours to accept or decline the offer through their portal.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button onClick={() => navigate('/buyback')} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={loading} className="btn btn-primary flex-1">
              {loading ? (
                <>
                  <DollarSign className="w-4 h-4 animate-pulse" />
                  Creating Offer...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Buyback Offer{selectedCards.length > 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
