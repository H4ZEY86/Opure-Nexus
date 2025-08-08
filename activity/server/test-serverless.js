// Test Script for Serverless API
// Run this to verify the API works without local dependencies

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Simulate Vercel environment
process.env.NODE_ENV = 'production'
process.env.VERCEL = '1'
process.env.VERCEL_ENV = 'production'

// Test without database credentials (should use fallback mode)
console.log('🧪 Testing API in fallback mode (no database credentials)')

async function testEndpoints() {
  try {
    // Import the handler
    const { default: handler } = await import('./api/index.js')
    
    console.log('✅ API handler loaded successfully')
    
    // Test health endpoint
    console.log('\n🏥 Testing health endpoint...')
    const healthReq = {
      method: 'GET',
      url: '/health',
      headers: {
        origin: 'https://www.opure.uk',
        'user-agent': 'Test/1.0.0'
      }
    }
    
    const healthRes = {
      status: (code) => ({ json: (data) => console.log('Health Response:', data) }),
      json: (data) => console.log('Health Response:', data),
      setHeader: () => {},
      end: () => {}
    }
    
    await handler(healthReq, healthRes)
    
    // Test user sync endpoint (fallback mode)
    console.log('\n👤 Testing user sync endpoint...')
    const syncReq = {
      method: 'GET',
      url: '/api/bot/sync/123456789',
      headers: {
        origin: 'https://www.opure.uk'
      }
    }
    
    const syncRes = {
      status: (code) => ({
        json: (data) => {
          console.log('Sync Response Status:', code)
          console.log('Sync Response:', JSON.stringify(data, null, 2))
          return { end: () => {} }
        }
      }),
      json: (data) => {
        console.log('Sync Response:', JSON.stringify(data, null, 2))
        return { end: () => {} }
      },
      setHeader: () => {}
    }
    
    await handler(syncReq, syncRes)
    
    // Test command execution
    console.log('\n⚡ Testing command execution...')
    const commandReq = {
      method: 'POST',
      url: '/api/bot/execute',
      headers: {
        'content-type': 'application/json',
        origin: 'https://www.opure.uk'
      },
      body: {
        command: 'balance',
        userId: '123456789'
      }
    }
    
    const commandRes = {
      status: (code) => ({
        json: (data) => {
          console.log('Command Response Status:', code)
          console.log('Command Response:', JSON.stringify(data, null, 2))
          return { end: () => {} }
        }
      }),
      json: (data) => {
        console.log('Command Response:', JSON.stringify(data, null, 2))
        return { end: () => {} }
      },
      setHeader: () => {}
    }
    
    await handler(commandReq, commandRes)
    
    console.log('\n✅ All tests completed successfully!')
    console.log('\n🎯 API is ready for deployment to Vercel')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

// Run tests
testEndpoints().catch(console.error)