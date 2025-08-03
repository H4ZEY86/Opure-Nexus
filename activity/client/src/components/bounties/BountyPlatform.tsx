/**
 * BOUNTY PLATFORM - DYNAMIC CHALLENGE SYSTEM
 * Comprehensive bounty interface with creation, participation, and leaderboards
 * Features: Real-time updates, mobile optimization, social features, AI integration
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bounty, BountyParticipation, BountyFilters } from '../../types/bounties'
import { useBounties } from '../../contexts/BountyContext'
import { BountyCard } from './BountyCard'
import { BountyCreator } from './BountyCreator'
import { BountyDetails } from './BountyDetails'
import { BountyLeaderboard } from './BountyLeaderboard'
import { BountyFiltersPanel } from './BountyFiltersPanel'
import { UserBountyStats } from './UserBountyStats'
import { LoadingSpinner } from '../common/LoadingSpinner'

interface BountyPlatformProps {
  userId?: string
  showCreation?: boolean
  compactMode?: boolean
}

export const BountyPlatform: React.FC<BountyPlatformProps> = ({
  userId,
  showCreation = true,
  compactMode = false
}) => {
  const {
    bounties,
    userParticipations,
    trending,
    categories,
    filters,
    loading,
    error,
    fetchBounties,
    fetchUserParticipations,
    fetchTrending,
    createBounty,
    joinBounty,
    submitBounty,
    setFilters
  } = useBounties()

  const [activeTab, setActiveTab] = useState<'browse' | 'my_bounties' | 'create' | 'trending' | 'stats'>('browse')
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'ending_soon' | 'popular' | 'tokens'>('newest')

  // Load data on component mount
  useEffect(() => {
    fetchBounties()
    fetchTrending()
    if (userId) {
      fetchUserParticipations(userId)
    }
  }, [fetchBounties, fetchTrending, fetchUserParticipations, userId])

  // Filter and sort bounties
  const filteredBounties = React.useMemo(() => {
    let filtered = bounties

    // Apply filters
    if (filters.category?.length) {
      filtered = filtered.filter(b => filters.category!.includes(b.category_id))
    }

    if (filters.difficulty_min !== undefined) {
      filtered = filtered.filter(b => b.difficulty_level >= filters.difficulty_min!)
    }

    if (filters.difficulty_max !== undefined) {
      filtered = filtered.filter(b => b.difficulty_level <= filters.difficulty_max!)
    }

    if (filters.tokens_min !== undefined) {
      filtered = filtered.filter(b => b.token_pool >= filters.tokens_min!)
    }

    if (filters.tokens_max !== undefined) {
      filtered = filtered.filter(b => b.token_pool <= filters.tokens_max!)
    }

    if (filters.bounty_type?.length) {
      filtered = filtered.filter(b => filters.bounty_type!.includes(b.bounty_type))
    }

    if (filters.ending_soon) {
      const soon = new Date()
      soon.setHours(soon.getHours() + 24)
      filtered = filtered.filter(b => b.ends_at && new Date(b.ends_at) <= soon)
    }

    if (filters.search_query) {
      const query = filters.search_query.toLowerCase()
      filtered = filtered.filter(b => 
        b.title.toLowerCase().includes(query) ||
        b.description.toLowerCase().includes(query)
      )
    }

    // Sort bounties
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'ending_soon':
          if (!a.ends_at && !b.ends_at) return 0
          if (!a.ends_at) return 1
          if (!b.ends_at) return -1
          return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()
        case 'popular':
          return b.current_participants - a.current_participants
        case 'tokens':
          return b.token_pool - a.token_pool
        default:
          return 0
      }
    })

    return filtered
  }, [bounties, filters, sortBy])

  // Get user's bounties
  const userBounties = React.useMemo(() => {
    if (!userId) return []
    return bounties.filter(b => 
      userParticipations.some(p => p.bounty_id === b.bounty_id)
    )
  }, [bounties, userParticipations, userId])

  // Calculate user stats
  const userStats = React.useMemo(() => {
    if (!userId || !userParticipations.length) return null

    const totalJoined = userParticipations.length
    const completed = userParticipations.filter(p => p.status === 'completed').length
    const active = userParticipations.filter(p => p.status === 'active').length
    const totalTokensEarned = userParticipations.reduce((sum, p) => sum + p.tokens_earned, 0)
    const avgCompletion = userParticipations.reduce((sum, p) => sum + p.completion_percentage, 0) / totalJoined

    return {
      totalJoined,
      completed,
      active,
      completionRate: completed / totalJoined * 100,
      totalTokensEarned,
      avgCompletion
    }
  }, [userParticipations, userId])

  // Handle bounty creation
  const handleCreateBounty = useCallback(async (bountyData: any) => {
    try {
      const bountyId = await createBounty(bountyData)
      setActiveTab('browse')
      // Show success notification
    } catch (error) {
      // Show error notification
    }
  }, [createBounty])

  // Handle joining bounty
  const handleJoinBounty = useCallback(async (bountyId: string) => {
    try {
      await joinBounty(bountyId)
      // Show success notification
    } catch (error) {
      // Show error notification
    }
  }, [joinBounty])

  // Handle bounty submission
  const handleSubmitBounty = useCallback(async (bountyId: string, submissionData: any) => {
    try {
      await submitBounty(bountyId, submissionData)
      // Show success notification
    } catch (error) {
      // Show error notification
    }
  }, [submitBounty])

  if (loading && bounties.length === 0) {
    return (
      <div className="bounty-platform loading">
        <LoadingSpinner size="large" />
        <p>Loading bounties...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bounty-platform error">
        <div className="error-message">
          <h3>Failed to load bounties</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bounty-platform ${compactMode ? 'compact' : ''}`}>
      {/* Platform Header */}
      <div className="platform-header">
        <div className="header-content">
          <h1 className="platform-title">
            🎯 Bounty Platform
          </h1>
          <div className="header-actions">
            {showCreation && (
              <button
                className="create-bounty-button"
                onClick={() => setActiveTab('create')}
              >
                Create Bounty
              </button>
            )}
            <button
              className="filters-button"
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        {userStats && (
          <div className="quick-stats">
            <div className="stat">
              <span className="value">{userStats.completed}</span>
              <span className="label">Completed</span>
            </div>
            <div className="stat">
              <span className="value">{userStats.active}</span>
              <span className="label">Active</span>
            </div>
            <div className="stat">
              <span className="value">{userStats.totalTokensEarned.toLocaleString()}</span>
              <span className="label">Tokens Earned</span>
            </div>
            <div className="stat">
              <span className="value">{userStats.completionRate.toFixed(1)}%</span>
              <span className="label">Success Rate</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="platform-tabs">
        <button
          className={`tab ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse
        </button>
        <button
          className={`tab ${activeTab === 'trending' ? 'active' : ''}`}
          onClick={() => setActiveTab('trending')}
        >
          Trending
        </button>
        {userId && (
          <button
            className={`tab ${activeTab === 'my_bounties' ? 'active' : ''}`}
            onClick={() => setActiveTab('my_bounties')}
          >
            My Bounties
          </button>
        )}
        {showCreation && (
          <button
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create
          </button>
        )}
        {userId && (
          <button
            className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Stats
          </button>
        )}
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="filters-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <BountyFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              categories={categories}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="platform-content">
        {activeTab === 'browse' && (
          <div className="browse-tab">
            <div className="bounties-grid">
              <AnimatePresence mode="popLayout">
                {filteredBounties.map((bounty, index) => {
                  const participation = userParticipations.find(p => p.bounty_id === bounty.bounty_id)
                  
                  return (
                    <motion.div
                      key={bounty.bounty_id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <BountyCard
                        bounty={bounty}
                        participation={participation}
                        onJoin={() => handleJoinBounty(bounty.bounty_id)}
                        onView={() => setSelectedBounty(bounty)}
                        showActions={!!userId}
                      />
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {filteredBounties.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <h3>No bounties found</h3>
                <p>Try adjusting your filters or check back later for new challenges!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trending' && (
          <div className="trending-tab">
            <h3>🔥 Trending Bounties</h3>
            <div className="trending-grid">
              {trending.map((bounty, index) => {
                const participation = userParticipations.find(p => p.bounty_id === bounty.bounty_id)
                
                return (
                  <motion.div
                    key={bounty.bounty_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <BountyCard
                      bounty={bounty}
                      participation={participation}
                      onJoin={() => handleJoinBounty(bounty.bounty_id)}
                      onView={() => setSelectedBounty(bounty)}
                      showActions={!!userId}
                      trending={true}
                    />
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'my_bounties' && userId && (
          <div className="my-bounties-tab">
            <h3>📋 Your Bounties</h3>
            <div className="user-bounties-grid">
              {userBounties.map(bounty => {
                const participation = userParticipations.find(p => p.bounty_id === bounty.bounty_id)
                
                return (
                  <BountyCard
                    key={bounty.bounty_id}
                    bounty={bounty}
                    participation={participation}
                    onJoin={() => handleJoinBounty(bounty.bounty_id)}
                    onView={() => setSelectedBounty(bounty)}
                    onSubmit={participation?.status === 'active' ? 
                      (data) => handleSubmitBounty(bounty.bounty_id, data) : 
                      undefined
                    }
                    showActions={true}
                    showProgress={true}
                  />
                )
              })}
            </div>

            {userBounties.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No bounties joined yet</h3>
                <p>Start browsing bounties to find challenges that interest you!</p>
                <button onClick={() => setActiveTab('browse')}>
                  Browse Bounties
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && showCreation && (
          <div className="create-tab">
            <BountyCreator
              onSubmit={handleCreateBounty}
              onCancel={() => setActiveTab('browse')}
              categories={categories}
            />
          </div>
        )}

        {activeTab === 'stats' && userId && userStats && (
          <div className="stats-tab">
            <UserBountyStats
              stats={userStats}
              participations={userParticipations}
              bounties={bounties}
            />
          </div>
        )}
      </div>

      {/* Bounty Details Modal */}
      <AnimatePresence>
        {selectedBounty && (
          <motion.div
            className="bounty-details-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBounty(null)}
          >
            <motion.div
              className="bounty-details-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <BountyDetails
                bounty={selectedBounty}
                participation={userParticipations.find(p => p.bounty_id === selectedBounty.bounty_id)}
                onJoin={() => handleJoinBounty(selectedBounty.bounty_id)}
                onSubmit={(data) => handleSubmitBounty(selectedBounty.bounty_id, data)}
                onClose={() => setSelectedBounty(null)}
                showActions={!!userId}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}