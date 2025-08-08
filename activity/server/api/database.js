// Legacy Database Fallback - Serverless Compatible
// This file provides fallback exports for any legacy imports
// All actual database operations now use Supabase cloud database

console.warn('⚠️ Legacy database.js imported - consider updating to use supabase-service.js')

// Import the new cloud database service
import { 
  initializeDatabases as cloudInitialize,
  getUserData as cloudGetUserData,
  getUserPlaylists as cloudGetUserPlaylists,
  logActivity as cloudLogActivity,
  isHealthy as cloudIsHealthy
} from '../database/supabase-service.js'

// Export legacy-compatible functions
export const initializeDatabases = cloudInitialize
export const getUserData = cloudGetUserData
export const getUserPlaylists = cloudGetUserPlaylists
export const recordActivitySession = cloudLogActivity
export const isHealthy = cloudIsHealthy

// Fallback function for getAllUsers (not commonly used)
export async function getAllUsers() {
  console.warn('getAllUsers called - not implemented in cloud version for security')
  return []
}

// Default export for CommonJS compatibility
export default {
  initializeDatabases,
  getUserData,
  getUserPlaylists,
  recordActivitySession,
  getAllUsers,
  isHealthy
}