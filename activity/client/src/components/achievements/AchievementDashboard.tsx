/**
 * ACHIEVEMENT DASHBOARD - VIRAL GAMIFICATION UI
 * Comprehensive achievement display with glass morphism design
 * Features: Real-time progress, social sharing, mobile optimization, viral mechanics
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Achievement, UserAchievementProgress, AchievementCategory } from '../../types/achievements'
import { useAchievements } from '../../contexts/AchievementContext'
import { AchievementCard } from './AchievementCard'
import { AchievementProgress } from './AchievementProgress'
import { AchievementLeaderboard } from './AchievementLeaderboard'
import { AchievementFilters } from './AchievementFilters'
import { SocialSharing } from './SocialSharing'
import { LoadingSpinner } from '../common/LoadingSpinner'

interface AchievementDashboardProps {
  userId?: string
  showSocialFeatures?: boolean
  compactMode?: boolean
}

export const AchievementDashboard: React.FC<AchievementDashboardProps> = ({
  userId,
  showSocialFeatures = true,
  compactMode = false
}) => {
  const {
    achievements,
    userProgress,
    categories,
    leaderboard,
    filters,
    loading,
    error,
    fetchUserAchievements,
    fetchLeaderboard,
    setFilters,
    shareAchievement
  } = useAchievements()

  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'leaderboard' | 'social'>('overview')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(true)
  const [showInProgress, setShowInProgress] = useState(true)
  const [celebrationAchievement, setCelebrationAchievement] = useState<Achievement | null>(null)

  // Load data on component mount
  useEffect(() => {
    if (userId) {
      fetchUserAchievements(userId)
      fetchLeaderboard()
    }
  }, [userId, fetchUserAchievements, fetchLeaderboard])

  // Calculate dashboard statistics
  const stats = React.useMemo(() => {
    const totalAchievements = achievements.length
    const completedAchievements = userProgress.filter(p => p.status === 'completed').length
    const inProgressAchievements = userProgress.filter(p => p.status === 'active').length
    const totalTokensEarned = userProgress
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => {
        const achievement = achievements.find(a => a.id === p.achievement_id)
        return sum + (achievement?.rewards.tokens || 0)
      }, 0)

    // Calculate completion by category
    const categoryStats = categories.reduce((acc, category) => {
      const categoryAchievements = achievements.filter(a => a.category === category.id)
      const categoryCompleted = userProgress.filter(p => {
        const achievement = achievements.find(a => a.id === p.achievement_id)
        return achievement?.category === category.id && p.status === 'completed'
      }).length

      acc[category.id] = {
        total: categoryAchievements.length,
        completed: categoryCompleted,
        percentage: categoryAchievements.length > 0 ? (categoryCompleted / categoryAchievements.length) * 100 : 0
      }
      return acc
    }, {} as Record<string, { total: number; completed: number; percentage: number }>)

    // Calculate rarity distribution
    const rarityStats = achievements.reduce((acc, achievement) => {
      const progress = userProgress.find(p => p.achievement_id === achievement.id)
      if (progress?.status === 'completed') {
        acc[achievement.rarity] = (acc[achievement.rarity] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return {
      totalAchievements,
      completedAchievements,
      inProgressAchievements,
      completionPercentage: totalAchievements > 0 ? (completedAchievements / totalAchievements) * 100 : 0,
      totalTokensEarned,
      categoryStats,
      rarityStats
    }
  }, [achievements, userProgress, categories])

  // Filter achievements based on current filters
  const filteredAchievements = React.useMemo(() => {
    let filtered = achievements

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(a => a.category === selectedCategory)
    }

    // Filter by completion status
    filtered = filtered.filter(a => {
      const progress = userProgress.find(p => p.achievement_id === a.id)
      if (!progress) return showInProgress // Show unlocked achievements as in progress
      
      if (progress.status === 'completed') return showCompleted
      if (progress.status === 'active') return showInProgress
      return false
    })

    // Apply additional filters
    if (filters.rarity?.length) {
      filtered = filtered.filter(a => filters.rarity!.includes(a.rarity))
    }

    if (filters.tier?.length) {
      filtered = filtered.filter(a => filters.tier!.includes(a.tier))
    }

    return filtered
  }, [achievements, userProgress, selectedCategory, showCompleted, showInProgress, filters])

  // Handle achievement unlock celebration
  const handleAchievementUnlocked = useCallback((achievement: Achievement) => {
    setCelebrationAchievement(achievement)
    
    // Auto-hide after animation
    setTimeout(() => {
      setCelebrationAchievement(null)
    }, 5000)
  }, [])

  // Handle sharing achievement
  const handleShareAchievement = useCallback(async (achievement: Achievement) => {
    try {
      await shareAchievement(achievement.id, 'dashboard')
      // Show success notification
    } catch (error) {
      // Show error notification
    }
  }, [shareAchievement])

  if (loading && achievements.length === 0) {
    return (
      <div className="achievement-dashboard loading">
        <LoadingSpinner size="large" />
        <p>Loading your achievements...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="achievement-dashboard error">
        <div className="error-message">
          <h3>Failed to load achievements</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`achievement-dashboard ${compactMode ? 'compact' : ''}`}>
      {/* Achievement Unlock Celebration */}
      <AnimatePresence>
        {celebrationAchievement && (
          <motion.div
            className="achievement-celebration-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCelebrationAchievement(null)}
          >
            <motion.div
              className="celebration-content"
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 50 }}
              transition={{ type: "spring", damping: 15 }}
            >
              <div className="celebration-header">
                <h2>🏆 Achievement Unlocked!</h2>
              </div>
              <AchievementCard
                achievement={celebrationAchievement}
                progress={userProgress.find(p => p.achievement_id === celebrationAchievement.id)}
                showProgress={false}
                animationDelay={0.2}
                onShare={() => handleShareAchievement(celebrationAchievement)}
              />
              <div className="celebration-actions">
                <button
                  className="share-button"
                  onClick={() => handleShareAchievement(celebrationAchievement)}
                >
                  Share Achievement
                </button>
                <button
                  className="close-button"
                  onClick={() => setCelebrationAchievement(null)}
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">
            🏆 Achievement System
          </h1>
          <div className="header-stats">
            <div className="stat-card">
              <div className="stat-value">{stats.completedAchievements}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.inProgressAchievements}</div>
              <div className="stat-label">In Progress</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalTokensEarned.toLocaleString()}</div>
              <div className="stat-label">Tokens Earned</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.completionPercentage.toFixed(1)}%</div>
              <div className="stat-label">Complete</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          Progress
        </button>
        <button
          className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
        {showSocialFeatures && (
          <button
            className={`tab ${activeTab === 'social' ? 'active' : ''}`}
            onClick={() => setActiveTab('social')}
          >
            Social
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Category Overview */}
            <div className="category-overview">
              <h3>Progress by Category</h3>
              <div className="category-grid">
                {categories.map(category => {
                  const categoryData = stats.categoryStats[category.id]
                  if (!categoryData) return null

                  return (
                    <motion.div
                      key={category.id}
                      className={`category-card ${selectedCategory === category.id ? 'selected' : ''}`}
                      onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="category-icon" style={{ color: category.color }}>
                        {category.icon}
                      </div>
                      <div className="category-info">
                        <h4>{category.name}</h4>
                        <div className="category-progress">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ 
                                width: `${categoryData.percentage}%`,
                                backgroundColor: category.color 
                              }}
                            />
                          </div>
                          <span>{categoryData.completed}/{categoryData.total}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Filters */}
            <AchievementFilters
              filters={filters}
              onFiltersChange={setFilters}
              categories={categories}
              showCompletedToggle={true}
              showCompleted={showCompleted}
              onShowCompletedChange={setShowCompleted}
              showInProgress={showInProgress}
              onShowInProgressChange={setShowInProgress}
            />

            {/* Achievement Grid */}
            <div className="achievements-section">
              <div className="section-header">
                <h3>
                  {selectedCategory 
                    ? `${categories.find(c => c.id === selectedCategory)?.name} Achievements`
                    : 'All Achievements'
                  }
                </h3>
                <span className="achievement-count">
                  {filteredAchievements.length} achievements
                </span>
              </div>

              <div className="achievements-grid">
                <AnimatePresence mode="popLayout">
                  {filteredAchievements.map((achievement, index) => {
                    const progress = userProgress.find(p => p.achievement_id === achievement.id)
                    
                    return (
                      <motion.div
                        key={achievement.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <AchievementCard
                          achievement={achievement}
                          progress={progress}
                          showProgress={true}
                          animationDelay={index * 0.05}
                          onShare={showSocialFeatures ? () => handleShareAchievement(achievement) : undefined}
                        />
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

              {filteredAchievements.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">🎯</div>
                  <h3>No achievements found</h3>
                  <p>Try adjusting your filters or start completing activities to unlock achievements!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <AchievementProgress
            userProgress={userProgress}
            achievements={achievements}
            categories={categories}
          />
        )}

        {activeTab === 'leaderboard' && (
          <AchievementLeaderboard
            leaderboard={leaderboard}
            currentUserId={userId}
          />
        )}

        {activeTab === 'social' && showSocialFeatures && (
          <SocialSharing
            achievements={achievements.filter(a => userProgress.find(p => p.achievement_id === a.id && p.status === 'completed'))}
            onShare={handleShareAchievement}
          />
        )}
      </div>
    </div>
  )
}