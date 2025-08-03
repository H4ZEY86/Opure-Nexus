// ============================================================================
// OPURE DISCORD ACTIVITY - ADVANCED SEARCH & FILTERS
// ============================================================================
// Comprehensive search and filtering system with price discovery
// Features: Multi-dimensional filtering, price analytics, smart suggestions
// Real-time price tracking and market insights
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useMarketplace } from '../../contexts/MarketplaceContext'
import { 
  MarketplaceFilters, 
  ItemCategory, 
  ItemRarity, 
  MarketplaceSortOption,
  MarketplacePriceSummary
} from '../../types/marketplace'
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Zap, 
  Eye, 
  Heart, 
  Target,
  Sliders,
  RefreshCw,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

// ============================================================================
// ADVANCED SEARCH FILTERS COMPONENT
// ============================================================================

interface AdvancedSearchFiltersProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({ 
  isOpen, 
  onClose, 
  className 
}) => {
  const { state, setFilters, fetchListings } = useMarketplace()
  
  // Local filter state
  const [localFilters, setLocalFilters] = useState<MarketplaceFilters>(state.filters)
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 10000 })
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    price: true,
    category: true,
    rarity: false,
    seller: false,
    timing: false,
    advanced: false
  })
  
  // Price discovery state
  const [priceAnalytics, setPriceAnalytics] = useState<MarketplacePriceSummary[]>([])
  const [priceLoading, setPriceLoading] = useState(false)
  const [suggestedPrices, setSuggestedPrices] = useState<Record<string, { min: number; max: number; avg: number }>>({})

  // Search suggestions
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Categories and rarities
  const categories: { id: ItemCategory; label: string; icon: string; color: string }[] = [
    { id: 'collectible', label: 'Collectibles', icon: '🎨', color: 'text-purple-600' },
    { id: 'boost', label: 'Boosts', icon: '⚡', color: 'text-yellow-600' },
    { id: 'cosmetic', label: 'Cosmetics', icon: '✨', color: 'text-pink-600' },
    { id: 'premium', label: 'Premium', icon: '👑', color: 'text-amber-600' },
    { id: 'consumable', label: 'Consumables', icon: '🧪', color: 'text-green-600' },
    { id: 'achievement_badge', label: 'Badges', icon: '🏆', color: 'text-blue-600' },
    { id: 'game_enhancement', label: 'Enhancements', icon: '🎮', color: 'text-indigo-600' }
  ]

  const rarities: { id: ItemRarity; label: string; color: string; symbol: string }[] = [
    { id: 'common', label: 'Common', color: 'text-gray-600', symbol: '○' },
    { id: 'uncommon', label: 'Uncommon', color: 'text-green-600', symbol: '◇' },
    { id: 'rare', label: 'Rare', color: 'text-blue-600', symbol: '◈' },
    { id: 'epic', label: 'Epic', color: 'text-purple-600', symbol: '◉' },
    { id: 'legendary', label: 'Legendary', color: 'text-orange-600', symbol: '✦' },
    { id: 'mythic', label: 'Mythic', color: 'text-red-600', symbol: '✧' }
  ]

  const sortOptions: { id: MarketplaceSortOption; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'newest', label: 'Newest First', icon: Clock },
    { id: 'price', label: 'Price', icon: DollarSign },
    { id: 'rarity', label: 'Rarity', icon: Star },
    { id: 'popularity', label: 'Popularity', icon: TrendingUp },
    { id: 'time_remaining', label: 'Time Remaining', icon: Clock },
    { id: 'price_per_unit', label: 'Price per Unit', icon: Target }
  ]

  // Load price analytics
  useEffect(() => {
    if (isOpen && priceAnalytics.length === 0) {
      loadPriceAnalytics()
    }
  }, [isOpen])

  const loadPriceAnalytics = async () => {
    setPriceLoading(true)
    try {
      const response = await fetch('/api/marketplace/prices', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPriceAnalytics(data.data || [])
        
        // Calculate suggested price ranges
        const suggestions: Record<string, { min: number; max: number; avg: number }> = {}
        data.data?.forEach((item: MarketplacePriceSummary) => {
          suggestions[item.item_id] = {
            min: item.min_price,
            max: item.max_price,
            avg: item.avg_price
          }
        })
        setSuggestedPrices(suggestions)
        
        // Update price range based on market data
        if (data.data?.length > 0) {
          const allPrices = data.data.flatMap((item: MarketplacePriceSummary) => [item.min_price, item.max_price])
          setPriceRange({
            min: Math.min(...allPrices),
            max: Math.max(...allPrices)
          })
        }
      }
    } catch (error) {
      console.error('Failed to load price analytics:', error)
    } finally {
      setPriceLoading(false)
    }
  }

  // Search suggestions
  const generateSearchSuggestions = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchSuggestions([])
      return
    }

    const suggestions = [
      // Popular searches
      'legendary weapons',
      'rare cosmetics',
      'premium boosts',
      'achievement badges',
      
      // Category-based
      ...categories.map(cat => cat.label.toLowerCase()),
      
      // Rarity-based
      ...rarities.map(r => r.label.toLowerCase()),
      
      // Price-based
      'under 100 tokens',
      'expensive items',
      'cheap finds',
      
      // Time-based
      'ending soon',
      'new listings',
      'auctions'
    ].filter(suggestion => 
      suggestion.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5)

    setSearchSuggestions(suggestions)
  }, [])

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Update local filters
  const updateLocalFilters = (updates: Partial<MarketplaceFilters>) => {
    setLocalFilters(prev => ({ ...prev, ...updates }))
  }

  // Apply filters
  const applyFilters = () => {
    setFilters(localFilters)
    fetchListings(localFilters)
    onClose()
  }

  // Reset filters
  const resetFilters = () => {
    const defaultFilters: MarketplaceFilters = {
      sort_by: 'newest',
      sort_order: 'desc'
    }
    setLocalFilters(defaultFilters)
    setFilters(defaultFilters)
    fetchListings(defaultFilters)
  }

  // Price range component
  const PriceRangeSlider: React.FC<{ 
    min: number
    max: number
    value: [number, number]
    onChange: (value: [number, number]) => void
  }> = ({ min, max, value, onChange }) => {
    const [localValue, setLocalValue] = useState(value)

    const handleChange = (index: 0 | 1, newValue: number) => {
      const newRange: [number, number] = [...localValue]
      newRange[index] = newValue
      
      // Ensure min is not greater than max
      if (index === 0 && newRange[0] > newRange[1]) {
        newRange[1] = newRange[0]
      } else if (index === 1 && newRange[1] < newRange[0]) {
        newRange[0] = newRange[1]
      }
      
      setLocalValue(newRange)
      onChange(newRange)
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Min Price</label>
            <input
              type="number"
              value={localValue[0]}
              onChange={(e) => handleChange(0, parseInt(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              min={min}
              max={max}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500">Max Price</label>
            <input
              type="number"
              value={localValue[1]}
              onChange={(e) => handleChange(1, parseInt(e.target.value) || max)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              min={min}
              max={max}
            />
          </div>
        </div>
        
        {/* Visual price range indicators */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Market Min: {min} tokens</span>
            <span>Market Max: {max} tokens</span>
          </div>
          {priceAnalytics.length > 0 && (
            <div className="text-center">
              <span className="text-blue-600">
                Avg Market Price: {Math.round(priceAnalytics.reduce((sum, item) => sum + item.avg_price, 0) / priceAnalytics.length)} tokens
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-50 ${className}`} onClick={onClose}>
      <div 
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Advanced Filters
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active filters summary */}
          <div className="mt-2 text-sm text-gray-600">
            {Object.keys(localFilters).length > 2 ? (
              <span className="text-blue-600">{Object.keys(localFilters).length - 2} filters active</span>
            ) : (
              <span>No filters applied</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            
            {/* Search Section */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search items, sellers, categories..."
                  value={localFilters.search_query || ''}
                  onChange={(e) => {
                    updateLocalFilters({ search_query: e.target.value })
                    generateSearchSuggestions(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Search suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        updateLocalFilters({ search_query: suggestion })
                        setShowSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm first:rounded-t-lg last:rounded-b-lg"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price Section */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('price')}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Price Range
                </h3>
                {expandedSections.price ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {expandedSections.price && (
                <div className="space-y-3">
                  <PriceRangeSlider
                    min={priceRange.min}
                    max={priceRange.max}
                    value={[localFilters.price_min || 0, localFilters.price_max || priceRange.max]}
                    onChange={([min, max]) => updateLocalFilters({ price_min: min, price_max: max })}
                  />

                  {/* Price analytics */}
                  {priceLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Loading market data...</span>
                    </div>
                  ) : priceAnalytics.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <h4 className="text-xs font-medium text-blue-800 mb-2 flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        Market Insights
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-gray-600">
                          <span className="text-green-600">↑</span> Trending Up: {priceAnalytics.filter(p => p.price_trend === 'up').length}
                        </div>
                        <div className="text-gray-600">
                          <span className="text-red-600">↓</span> Trending Down: {priceAnalytics.filter(p => p.price_trend === 'down').length}
                        </div>
                        <div className="text-gray-600">
                          <span className="text-blue-600">→</span> Stable: {priceAnalytics.filter(p => p.price_trend === 'stable').length}
                        </div>
                        <div className="text-gray-600">
                          <span className="text-yellow-600">⚡</span> Hot Items: {priceAnalytics.filter(p => p.volume_24h > 10).length}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category Section */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('category')}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-sm font-medium text-gray-900">Categories</h3>
                {expandedSections.category ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {expandedSections.category && (
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => {
                    const isSelected = localFilters.category?.includes(category.id)
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          const currentCategories = localFilters.category || []
                          const newCategories = isSelected
                            ? currentCategories.filter(c => c !== category.id)
                            : [...currentCategories, category.id]
                          
                          updateLocalFilters({ 
                            category: newCategories.length > 0 ? newCategories : undefined 
                          })
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${
                          isSelected 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-base">{category.icon}</span>
                        <span className="font-medium text-xs">{category.label}</span>
                        {isSelected && <CheckCircle className="w-3 h-3 ml-auto" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Rarity Section */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('rarity')}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Rarity
                </h3>
                {expandedSections.rarity ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {expandedSections.rarity && (
                <div className="space-y-2">
                  {rarities.map((rarity) => {
                    const isSelected = localFilters.rarity?.includes(rarity.id)
                    
                    return (
                      <button
                        key={rarity.id}
                        onClick={() => {
                          const currentRarities = localFilters.rarity || []
                          const newRarities = isSelected
                            ? currentRarities.filter(r => r !== rarity.id)
                            : [...currentRarities, rarity.id]
                          
                          updateLocalFilters({ 
                            rarity: newRarities.length > 0 ? newRarities : undefined 
                          })
                        }}
                        className={`flex items-center gap-3 w-full p-2 rounded-lg text-sm transition-colors ${
                          isSelected 
                            ? 'bg-gray-100 border border-gray-300' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className={`text-base ${rarity.color}`}>{rarity.symbol}</span>
                        <span className={`font-medium ${rarity.color}`}>{rarity.label}</span>
                        {isSelected && <CheckCircle className="w-3 h-3 ml-auto text-blue-600" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Sorting Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                Sort By
              </h3>
              
              <div className="space-y-2">
                {sortOptions.map((option) => {
                  const Icon = option.icon
                  const isSelected = localFilters.sort_by === option.id
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => updateLocalFilters({ sort_by: option.id })}
                      className={`flex items-center gap-3 w-full p-2 rounded-lg text-sm transition-colors ${
                        isSelected 
                          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{option.label}</span>
                      {isSelected && (
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateLocalFilters({ 
                                sort_order: localFilters.sort_order === 'asc' ? 'desc' : 'asc' 
                              })
                            }}
                            className="p-1 hover:bg-blue-200 rounded"
                          >
                            {localFilters.sort_order === 'asc' ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Advanced Options */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('advanced')}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-sm font-medium text-gray-900">Advanced Options</h3>
                {expandedSections.advanced ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {expandedSections.advanced && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={localFilters.seller_premium_only || false}
                      onChange={(e) => updateLocalFilters({ 
                        seller_premium_only: e.target.checked ? true : undefined 
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Premium sellers only</span>
                    <Star className="w-3 h-3 text-yellow-500" />
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={localFilters.time_ending_soon || false}
                      onChange={(e) => updateLocalFilters({ 
                        time_ending_soon: e.target.checked ? true : undefined 
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Ending soon (< 1 hour)</span>
                    <Clock className="w-3 h-3 text-red-500" />
                  </label>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-700">Listing Type</label>
                    <div className="space-y-1">
                      {['fixed_price', 'auction', 'offer_wanted'].map((type) => (
                        <label key={type} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={localFilters.listing_type?.includes(type as any) || false}
                            onChange={(e) => {
                              const currentTypes = localFilters.listing_type || []
                              const newTypes = e.target.checked
                                ? [...currentTypes, type as any]
                                : currentTypes.filter(t => t !== type)
                              
                              updateLocalFilters({ 
                                listing_type: newTypes.length > 0 ? newTypes : undefined 
                              })
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 capitalize">
                            {type.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
          <div className="flex gap-3">
            <button
              onClick={resetFilters}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={applyFilters}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdvancedSearchFilters