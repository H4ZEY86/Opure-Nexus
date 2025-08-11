#!/usr/bin/env node

/**
 * Discord Activity Deployment Verification Script
 * Tests all critical endpoints and configurations
 */

import https from 'https';
import { URL } from 'url';

// Configuration
const CONFIG = {
  CLIENT_URL: 'https://www.opure.uk',
  API_URL: 'https://api.opure.uk',
  DISCORD_CLIENT_ID: '1388207626944249856',
  GUILD_ID: '1362815996557263049'
};

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to make HTTPS requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    request.on('error', reject);
    request.setTimeout(10000, () => reject(new Error('Request timeout')));
    request.end();
  });
}

// Test functions
async function testClientDeployment() {
  console.log('\n🌐 Testing Client Deployment...');
  
  try {
    const response = await makeRequest(CONFIG.CLIENT_URL);
    
    if (response.statusCode === 200) {
      if (response.data.includes('<title>Opure')) {
        results.passed.push('✅ Client deployment accessible');
      } else {
        results.warnings.push('⚠️  Client accessible but missing expected title');
      }
      
      // Check for required meta tags
      if (response.data.includes('viewport-fit=cover')) {
        results.passed.push('✅ Mobile viewport configuration present');
      } else {
        results.failed.push('❌ Missing viewport-fit=cover for Discord Activity');
      }
      
      // Check for Discord Activity meta tags
      if (response.data.includes('og:title')) {
        results.passed.push('✅ OpenGraph meta tags present');
      } else {
        results.warnings.push('⚠️  Missing OpenGraph meta tags');
      }
      
    } else {
      results.failed.push(`❌ Client deployment failed: HTTP ${response.statusCode}`);
    }
  } catch (error) {
    results.failed.push(`❌ Client deployment error: ${error.message}`);
  }
}

async function testAPIHealth() {
  console.log('\n🔥 Testing API Health...');
  
  try {
    const response = await makeRequest(`${CONFIG.API_URL}/health`);
    
    if (response.statusCode === 200) {
      const healthData = JSON.parse(response.data);
      
      if (healthData.status === 'healthy') {
        results.passed.push('✅ API health check passed');
        
        // Check database connection
        if (healthData.database?.connected) {
          results.passed.push('✅ Database connection working');
        } else {
          results.warnings.push('⚠️  Database in fallback mode - check Supabase config');
        }
        
        // Check environment
        if (healthData.environment === 'vercel-serverless') {
          results.passed.push('✅ Serverless deployment confirmed');
        }
        
        // Check CORS origin handling
        results.passed.push(`✅ CORS origin: ${healthData.cors_origin || 'no-origin'}`);
        
      } else {
        results.failed.push(`❌ API health check failed: ${healthData.status}`);
      }
    } else {
      results.failed.push(`❌ API health endpoint failed: HTTP ${response.statusCode}`);
    }
  } catch (error) {
    results.failed.push(`❌ API health check error: ${error.message}`);
  }
}

async function testAPIEndpoints() {
  console.log('\n🔌 Testing Critical API Endpoints...');
  
  const endpoints = [
    { path: '/', name: 'Root endpoint' },
    { path: '/api/auth/test', name: 'Auth test endpoint' },
    { path: '/api/auth/activity-sync', name: 'Activity sync endpoint' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${CONFIG.API_URL}${endpoint.path}`);
      
      if (response.statusCode < 500) {
        results.passed.push(`✅ ${endpoint.name} accessible (HTTP ${response.statusCode})`);
      } else {
        results.failed.push(`❌ ${endpoint.name} server error: HTTP ${response.statusCode}`);
      }
    } catch (error) {
      results.failed.push(`❌ ${endpoint.name} error: ${error.message}`);
    }
  }
}

async function testDiscordActivityCompliance() {
  console.log('\n🎮 Testing Discord Activity Compliance...');
  
  try {
    const response = await makeRequest(CONFIG.CLIENT_URL);
    
    // Check for required headers
    const headers = response.headers;
    
    if (headers['x-frame-options'] === 'ALLOWALL') {
      results.passed.push('✅ X-Frame-Options allows Discord embedding');
    } else {
      results.failed.push('❌ Missing X-Frame-Options: ALLOWALL header');
    }
    
    // Check CSP
    const csp = headers['content-security-policy'];
    if (csp && csp.includes('frame-ancestors')) {
      if (csp.includes('discord.com') && csp.includes('discordapp.com')) {
        results.passed.push('✅ Content Security Policy allows Discord');
      } else {
        results.failed.push('❌ CSP missing Discord frame-ancestors');
      }
    } else {
      results.failed.push('❌ Missing or invalid Content Security Policy');
    }
    
    // Check for HTTPS
    if (CONFIG.CLIENT_URL.startsWith('https://')) {
      results.passed.push('✅ HTTPS enabled (required for Discord Activities)');
    } else {
      results.failed.push('❌ HTTPS required for Discord Activities');
    }
    
  } catch (error) {
    results.failed.push(`❌ Discord compliance check failed: ${error.message}`);
  }
}

async function testDiscordSDKCompatibility() {
  console.log('\n🤖 Testing Discord SDK Compatibility...');
  
  try {
    const response = await makeRequest(CONFIG.CLIENT_URL);
    
    // Check for Discord SDK inclusion
    if (response.data.includes('@discord/embedded-app-sdk') || response.data.includes('discord-DbY_imvY.js')) {
      results.passed.push('✅ Discord SDK assets detected');
    } else {
      results.warnings.push('⚠️  Discord SDK assets not found in HTML');
    }
    
    // Check client ID configuration
    if (response.data.includes(CONFIG.DISCORD_CLIENT_ID)) {
      results.passed.push('✅ Discord Client ID embedded correctly');
    } else {
      results.warnings.push('⚠️  Discord Client ID not found in client');
    }
    
  } catch (error) {
    results.warnings.push(`⚠️  Discord SDK compatibility check failed: ${error.message}`);
  }
}

// Main execution
async function runTests() {
  console.log('🚀 Discord Activity Deployment Verification');
  console.log('==========================================');
  console.log(`Client URL: ${CONFIG.CLIENT_URL}`);
  console.log(`API URL: ${CONFIG.API_URL}`);
  console.log(`Discord App ID: ${CONFIG.DISCORD_CLIENT_ID}`);
  console.log(`Guild ID: ${CONFIG.GUILD_ID}`);
  
  // Run all tests
  await testClientDeployment();
  await testAPIHealth();
  await testAPIEndpoints();
  await testDiscordActivityCompliance();
  await testDiscordSDKCompatibility();
  
  // Print results
  console.log('\n📊 VERIFICATION RESULTS');
  console.log('=======================');
  
  if (results.passed.length > 0) {
    console.log('\n✅ PASSED TESTS:');
    results.passed.forEach(test => console.log(test));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.warnings.forEach(warning => console.log(warning));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach(failure => console.log(failure));
  }
  
  // Final verdict
  console.log('\n🏆 OVERALL STATUS');
  console.log('=================');
  
  const totalTests = results.passed.length + results.failed.length + results.warnings.length;
  const passRate = Math.round((results.passed.length / totalTests) * 100);
  
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Warnings: ${results.warnings.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Pass Rate: ${passRate}%`);
  
  if (results.failed.length === 0) {
    console.log('\n🎉 DEPLOYMENT READY FOR DISCORD ACTIVITY APPROVAL!');
  } else if (results.failed.length <= 2) {
    console.log('\n⚠️  DEPLOYMENT MOSTLY READY - Fix failed tests before Discord submission');
  } else {
    console.log('\n❌ DEPLOYMENT NOT READY - Multiple critical issues need fixing');
  }
  
  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

runTests().catch(console.error);