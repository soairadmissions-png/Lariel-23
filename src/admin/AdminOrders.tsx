import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { api } from '../services/api';
import { OrderRecord } from '../types';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const AdminOrders: React.FC = () => {
  const { formatPrice, showToast } = useShop();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, status: any) => {
    try {
      await api.updateOrderStatus(orderId, status);
      await loadOrders();
      showToast(`Order #${orderId} status updated to ${status}`);
    } catch (err: any) {
      showToast(err.message || 'Status update failed');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesId = o.id.toLowerCase().includes(q);
      const matchesName = o.customerName.toLowerCase().includes(q);
      const matchesEmail = o.customerEmail.toLowerCase().includes(q);
      if (!matchesId && !matchesName && !matchesEmail) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#181614] font-normal">
            Customer Orders & Fulfillment
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
            Manage bridal atelier commissions, custom monograms, shipping addresses, and status dispatching.
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="p-2.5 bg-white hover:bg-[#F2ECE4] border border-[#DCD1BF] text-neutral-700 rounded-xl transition-colors self-start sm:self-auto flex items-center space-x-2 text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#FAF8F5] border border-[#E0D5C3] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, order #, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-neutral-500 whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs text-neutral-800"
          >
            <option value="all">All Orders ({orders.length})</option>
            <option value="processing">Processing</option>
            <option value="in_production">In Production</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F2ECE4] text-[#181614] border-b border-[#E0D5C3] text-[10px] tracking-wider uppercase font-semibold">
                <th className="py-4 px-4">Order ID & Date</th>
                <th className="py-4 px-4">Customer</th>
                <th className="py-4 px-4">Items Commissioned</th>
                <th className="py-4 px-4">Total Amount</th>
                <th className="py-4 px-4">Fulfillment Status</th>
                <th className="py-4 pr-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DE]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    No orders match your filter criteria
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-medium text-[#181614]">
                        #{order.id.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-neutral-900">{order.customerName}</div>
                      <div className="text-[11px] text-neutral-500">{order.customerEmail}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-neutral-700 truncate max-w-xs">
                            <span className="font-semibold">{item.quantity}x</span> {item.productName}
                            <span className="text-neutral-400 text-[10px] ml-1">
                              ({typeof item.selectedColor === 'object' ? item.selectedColor?.name : (item.selectedColor || item.color || '')} · {typeof item.selectedSize === 'object' ? item.selectedSize?.name : (item.selectedSize || item.size || '')})
                            </span>
                            {item.monogramText && (
                              <span className="block text-[10px] text-[#A58860] italic">
                                Monogram: "{item.monogramText}"
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      {formatPrice(order.totalUSD)}
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                          order.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : order.status === 'shipped'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : order.status === 'in_production'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        <option value="processing">● Processing</option>
                        <option value="in_production">● In Production</option>
                        <option value="shipped">● Shipped</option>
                        <option value="delivered">● Delivered</option>
                      </select>
                    </td>

                    <td className="py-3 pr-6 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1.5 bg-white hover:bg-[#F2ECE4] border border-[#DCD1BF] rounded-lg text-xs font-medium text-neutral-800"
                      >
                        View Order
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="relative w-full max-w-2xl bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl shadow-xl overflow-hidden z-10">
            <div className="px-6 py-4 bg-[#181614] text-white flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-normal">
                  Order Details #{selectedOrder.id.slice(-8).toUpperCase()}
                </h3>
                <span className="text-xs text-[#C5A880]">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
              {/* Customer and Shipping Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white border border-[#DCD1BF] rounded-xl">
                <div>
                  <div className="font-semibold text-neutral-800 uppercase tracking-wider text-[10px] mb-1">
                    Client Details
                  </div>
                  <div className="font-medium text-neutral-900">{selectedOrder.customerName}</div>
                  <div className="text-neutral-600 flex items-center space-x-1 mt-1">
                    <Mail className="w-3 h-3 text-[#A58860]" />
                    <span>{selectedOrder.customerEmail}</span>
                  </div>
                  {selectedOrder.customerPhone && (
                    <div className="text-neutral-600 flex items-center space-x-1 mt-0.5">
                      <Phone className="w-3 h-3 text-[#A58860]" />
                      <span>{selectedOrder.customerPhone}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="font-semibold text-neutral-800 uppercase tracking-wider text-[10px] mb-1">
                    Destination Address
                  </div>
                  <div className="text-neutral-700 flex items-start space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-[#A58860] shrink-0 mt-0.5" />
                    <div>
                      <div>{selectedOrder.shippingAddress?.address || '14 Victoria Island'}</div>
                      <div>{selectedOrder.shippingAddress?.city || 'Lagos'}, {selectedOrder.shippingAddress?.country || 'Nigeria'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="font-semibold text-neutral-800 uppercase tracking-wider text-[10px]">
                  Ordered Items ({selectedOrder.items.length})
                </div>
                <div className="divide-y divide-[#EBE3D8] border border-[#DCD1BF] rounded-xl bg-white overflow-hidden">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={item.productImage || CANONICAL_DEFAULTS.PRODUCT}
                          alt={item.productName}
                          onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                          className="w-12 h-16 object-cover rounded-lg border border-[#DCD1BF]"
                        />
                        <div>
                          <div className="font-semibold text-neutral-900">{item.productName}</div>
                          <div className="text-neutral-500 text-[11px] mt-0.5">
                            Color: <span className="font-medium text-neutral-700">{typeof item.selectedColor === 'object' ? item.selectedColor?.name : (item.selectedColor || item.color || '')}</span> · Size: <span className="font-medium text-neutral-700">{typeof item.selectedSize === 'object' ? item.selectedSize?.name : (item.selectedSize || item.size || '')}</span> · Qty: <span className="font-medium text-neutral-700">{item.quantity}</span>
                          </div>
                          {item.monogramText && (
                            <div className="mt-1 px-2 py-0.5 bg-[#FAF8F5] border border-[#E0D5C3] rounded text-[10px] text-[#A58860]">
                              Custom Embroidery: "{item.monogramText}" ({item.monogramRole || 'Bride'})
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="font-medium text-neutral-900">
                        {formatPrice(item.unitPriceUSD * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="p-4 bg-white border border-[#DCD1BF] rounded-xl space-y-1.5">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(selectedOrder.totalUSD)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Express Couture Courier</span>
                  <span className="text-emerald-700">Complimentary</span>
                </div>
                <div className="flex justify-between font-semibold text-sm text-neutral-900 pt-2 border-t border-[#EBE3D8]">
                  <span>Total Paid</span>
                  <span>{formatPrice(selectedOrder.totalUSD)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
