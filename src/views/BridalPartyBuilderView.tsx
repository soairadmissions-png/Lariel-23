import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  ShoppingBag,
  MessageCircle,
  Check,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { GLOBAL_COLORS } from '../data/currencies';
import { BridalPartyMember } from '../types';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const BridalPartyBuilderView: React.FC = () => {
  const {
    bridalPartyMembers,
    addBridalPartyMember,
    updateBridalPartyMember,
    removeBridalPartyMember,
    formatPrice,
    addToCart,
    setIsCartOpen,
    products,
  } = useShop();

  const [weddingDate, setWeddingDate] = useState('2025-11-20');
  const [partyThemeColor, setPartyThemeColor] = useState('Blush Pink');
  const [brideNotes, setBrideNotes] = useState('');

  // Catalog items suitable for bridesmaids
  const bridesmaidRobes = products.filter((p) => (p.category === 'bridesmaids' || p.category === 'bridal' || p.category === 'sets') && p.status !== 'draft');

  // Compute total price
  const baseSubtotalUSD = bridalPartyMembers.reduce((acc, member) => {
    return acc + member.selectedProduct.priceUSD;
  }, 0);

  // Group discounts for bridal parties
  const memberCount = bridalPartyMembers.length;
  let discountPercent = 0;
  if (memberCount >= 8) {
    discountPercent = 15;
  } else if (memberCount >= 5) {
    discountPercent = 10;
  }

  const discountAmountUSD = (baseSubtotalUSD * discountPercent) / 100;
  const finalTotalUSD = baseSubtotalUSD - discountAmountUSD;

  const handleAddNewMember = () => {
    const defaultProduct = bridesmaidRobes[0] || products[0];
    const newMember: BridalPartyMember = {
      id: `party-${Date.now()}`,
      name: `Bridesmaid ${memberCount + 1}`,
      role: 'Bridesmaid',
      selectedProduct: defaultProduct,
      selectedColor: defaultProduct.colors[0] || { name: partyThemeColor, hex: '#F0D0D5' },
      selectedSize: 'M',
      monogramText: '',
      includeMatchingBonnet: true,
      includeFlipFlops: false,
    };
    addBridalPartyMember(newMember);
  };

  const handleAddAllToCart = () => {
    bridalPartyMembers.forEach((m) => {
      addToCart(m.selectedProduct, m.selectedColor, m.selectedSize, 1, {
        text: m.monogramText ? `${m.name} - ${m.monogramText}` : m.name,
        role: m.role,
      });
    });
    setIsCartOpen(true);
  };

  const generateWhatsAppRoster = () => {
    let text = `✨ *LARIEL ESSENTIALS BRIDAL PARTY SUITE ORDER* ✨\n\n`;
    text += `Wedding Date: ${weddingDate || 'TBD'}\n`;
    text += `Palette Theme: ${partyThemeColor}\n`;
    text += `Total Party Members: ${memberCount}\n`;
    if (discountPercent > 0) {
      text += `Bridal Party VIP Tier: ${discountPercent}% OFF Applied\n`;
    }
    text += `Estimated Total: ${formatPrice(finalTotalUSD)}\n\n`;
    text += `*ITEMIZED ROSTER:*\n`;

    bridalPartyMembers.forEach((m, idx) => {
      text += `${idx + 1}. *${m.name.toUpperCase()}* (${m.role})\n`;
      text += `   - Piece: ${m.selectedProduct.name}\n`;
      text += `   - Shade: ${m.selectedColor.name}\n`;
      text += `   - Size: ${m.selectedSize}\n`;
      if (m.monogramText) {
        text += `   - Monogram: "${m.monogramText}"\n`;
      }
      if (m.includeMatchingBonnet) text += `   - + Reversible Silk Hair Bonnet\n`;
      if (m.includeFlipFlops) text += `   - + Cushioned Flip Flops\n`;
      text += `\n`;
    });

    if (brideNotes) {
      text += `Special Notes: ${brideNotes}\n`;
    }

    text += `Please review our bridal party suite and advise on production lead times!`;
    return `https://wa.me/2348180306073?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="w-full bg-[#FAF8F5] text-[#111111] py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header banner */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="text-[11px] tracking-wide text-[#A68962] font-medium font-sans block">
            The Essentials Bridal Suite
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#111111] font-normal">
            Build Your Bridal Party
          </h1>
          <p className="text-xs sm:text-sm text-[#6C655E] font-sans max-w-2xl mx-auto leading-relaxed">
            Curate an unforgettable getting-ready experience for you and your inner circle. Coordinated robes, customized monograms, and signature gift sets.
          </p>
        </div>

        {/* Global Wedding Configuration Bar */}
        <div className="bg-[#FAF6F0] border border-[#E3D9CC] p-6 mb-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-neutral-800 mb-1.5 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#C5A880]" />
              Wedding Date
            </label>
            <input
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
              className="w-full text-xs bg-white border border-neutral-300 px-3 py-2 focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-neutral-800 mb-1.5 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1.5 text-[#C5A880]" />
              Primary Wedding Palette
            </label>
            <select
              value={partyThemeColor}
              onChange={(e) => setPartyThemeColor(e.target.value)}
              className="w-full text-xs bg-white border border-neutral-300 px-3 py-2 focus:outline-none"
            >
              {GLOBAL_COLORS.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <div className="bg-[#EFE7DC] p-3 text-xs border border-[#DFD5C7]">
              <span className="font-semibold text-neutral-900 block text-[11px] uppercase tracking-wider">
                Party Group Privilege:
              </span>
              <p className="text-[11px] text-neutral-700 mt-0.5">
                {memberCount >= 8
                  ? '🎉 15% VIP Bridal Suite Discount Unlocked!'
                  : memberCount >= 5
                  ? '✨ 10% Bridal Party Discount Unlocked (Add 8 for 15%)'
                  : 'Add 5+ robes to unlock 10% off; 8+ for 15% off.'}
              </p>
            </div>
          </div>
        </div>

        {/* Member Roster List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-[#C5A880]" />
              <h2 className="font-serif text-xl sm:text-2xl text-neutral-900 font-normal">
                Bridal Party Roster ({memberCount})
              </h2>
            </div>

            <button
              onClick={handleAddNewMember}
              className="bg-[#111111] text-[#FAF8F5] text-xs tracking-wide px-4 py-2.5 font-semibold hover:bg-[#C5A880] transition-colors flex items-center space-x-1.5 font-sans"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bridesmaid / Role</span>
            </button>
          </div>

          {bridalPartyMembers.map((member, index) => (
            <div
              key={member.id}
              className="bg-[#FAF8F5] border border-[#E3D9CC] p-6 text-left shadow-xs transition-all hover:border-[#C5A880]"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#EAE1D5] gap-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-12 bg-[#F2ECE4] border border-[#E0D7CC] shrink-0 overflow-hidden rounded-md">
                    <img
                      src={member.selectedProduct?.images?.[0] || CANONICAL_DEFAULTS.PRODUCT}
                      alt={member.selectedProduct?.name || 'Bridal Robe'}
                      onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="w-6 h-6 rounded-full bg-[#111111] text-white text-xs flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => updateBridalPartyMember(member.id, { name: e.target.value })}
                    className="font-serif text-lg text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-[#C5A880] focus:outline-none px-1"
                    placeholder="Member Name"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={member.role}
                    onChange={(e) => updateBridalPartyMember(member.id, { role: e.target.value as any })}
                    className="text-xs uppercase tracking-wider bg-[#F2ECE4] border border-[#E0D7CC] px-3 py-1.5 focus:outline-none font-semibold text-neutral-800"
                  >
                    <option value="Bride">The Bride</option>
                    <option value="Maid of Honour">Maid of Honour</option>
                    <option value="Bridesmaid">Bridesmaid</option>
                    <option value="Flower Girl">Flower Girl</option>
                    <option value="Junior Bridesmaid">Junior Bridesmaid</option>
                    <option value="Mother of the Bride">Mother of Bride</option>
                    <option value="Mother of the Groom">Mother of Groom</option>
                  </select>

                  {bridalPartyMembers.length > 1 && (
                    <button
                      onClick={() => removeBridalPartyMember(member.id)}
                      className="text-neutral-400 hover:text-red-700 p-1 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Selections for this member */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs">
                {/* 1. Select Product Style */}
                <div>
                  <label className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1">
                    Selected Robe / Set
                  </label>
                  <select
                    value={member.selectedProduct.id}
                    onChange={(e) => {
                      const prod = products.find((p) => p.id === e.target.value) || products[0];
                      updateBridalPartyMember(member.id, {
                        selectedProduct: prod,
                        selectedColor: prod.colors[0],
                      });
                    }}
                    className="w-full bg-white border border-neutral-300 px-2 py-2 focus:outline-none font-medium truncate"
                  >
                    {bridesmaidRobes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatPrice(p.priceUSD)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Select Shade */}
                <div>
                  <label className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1">
                    Color Shade ({member.selectedColor.name})
                  </label>
                  <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
                    {member.selectedProduct.colors.map((col) => (
                      <button
                        key={col.name}
                        onClick={() => updateBridalPartyMember(member.id, { selectedColor: col })}
                        className={`w-5 h-5 rounded-full border shrink-0 transition-transform ${
                          member.selectedColor.name === col.name
                            ? 'ring-2 ring-offset-1 ring-neutral-900 scale-110'
                            : 'border-neutral-300'
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>

                {/* 3. Select Size */}
                <div>
                  <label className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1">
                    Size
                  </label>
                  <select
                    value={member.selectedSize}
                    onChange={(e) => updateBridalPartyMember(member.id, { selectedSize: e.target.value })}
                    className="w-full bg-white border border-neutral-300 px-2 py-2 focus:outline-none font-medium"
                  >
                    {member.selectedProduct.sizes.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Monogram Text */}
                <div>
                  <label className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1">
                    Embroidery Text (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MOH, Anita, 24.10"
                    value={member.monogramText}
                    onChange={(e) => updateBridalPartyMember(member.id, { monogramText: e.target.value })}
                    className="w-full bg-white border border-neutral-300 px-2 py-2 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add member button bottom */}
          <div className="text-center pt-2">
            <button
              onClick={handleAddNewMember}
              className="inline-flex items-center space-x-2 border border-dashed border-neutral-400 text-neutral-800 px-6 py-3 text-xs tracking-wider uppercase hover:border-black transition-colors"
            >
              <Plus className="w-4 h-4 text-[#C5A880]" />
              <span>Add Another Bridesmaid / Queen</span>
            </button>
          </div>
        </div>

        {/* Suite Calculation & Checkout Action Summary */}
        <div className="mt-14 bg-[#FAF6F0] border border-[#E3D9CC] p-8 text-left space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-[#E3D9CC] gap-4">
            <div>
              <h3 className="font-serif text-2xl text-neutral-900 font-normal">
                Bridal Party Summary
              </h3>
              <p className="text-xs text-neutral-500 font-sans mt-0.5">
                {memberCount} Coordinated Robes & Getting-Ready Pieces
              </p>
            </div>

            <div className="text-right">
              {discountPercent > 0 && (
                <p className="text-xs text-[#2F6147] font-semibold tracking-wide font-sans">
                  {discountPercent}% Group Tier Discount Applied (-{formatPrice(discountAmountUSD)})
                </p>
              )}
              <div className="flex items-baseline space-x-2">
                <span className="text-xs text-neutral-500 tracking-wide font-sans">Total Suite:</span>
                <span className="font-serif text-3xl font-semibold text-neutral-950">
                  {formatPrice(finalTotalUSD)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wide text-neutral-700 mb-1 font-sans">
              Custom Delivery Notes or Special Colour Requests
            </label>
            <textarea
              rows={2}
              value={brideNotes}
              onChange={(e) => setBrideNotes(e.target.value)}
              placeholder="e.g. Please match Maid of Honor to rose gold sash, and bridesmaids to sage green..."
              className="w-full text-xs bg-white border border-neutral-300 p-3 focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              onClick={handleAddAllToCart}
              className="w-full bg-[#111111] text-[#FAF8F5] py-4 text-xs tracking-wide font-semibold hover:bg-[#C5A880] transition-colors flex items-center justify-center space-x-2 font-sans"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Add Entire Suite To Bag ({memberCount} Pieces)</span>
            </button>

            <a
              href={generateWhatsAppRoster()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full border border-neutral-900 bg-white text-neutral-900 py-4 text-xs tracking-wide font-semibold hover:border-[#25D366] hover:text-[#25D366] transition-colors flex items-center justify-center space-x-2 font-sans"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>Export Roster To WhatsApp Concierge</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
