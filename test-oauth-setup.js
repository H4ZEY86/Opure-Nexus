// Quick OAuth2 Setup Verification Script
// Run this after deployment to verify everything is working

const https = require('https');

console.log('🔍 Testing OAuth2 Setup...\n');

// Test 1: Server Health Check
function testServerHealth() {
    return new Promise((resolve, reject) => {
        console.log('1️⃣ Testing Server Health: https://api.opure.uk/health');
        
        https.get('https://api.opure.uk/health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {

                if (res.statusCode === 200) {
                    try {
                        console.log('✅ Server Health: OK');
                        console.log(`   Response: ${JSON.parse(data).status}\n`);
                        resolve(true);
                    } catch (e) {
                        console.log(`❌ Server Health: Invalid JSON response\n`);
                        resolve(false);
                    }
                } else {
                    console.log(`❌ Server Health: Failed (${res.statusCode})\n`);
                    resolve(false);
                }
            });
        }).on('error', (err) => {
            console.log(`❌ Server Health: Error - ${err.message}\n`);
            resolve(false);
        });
    });
}

// Test 2: OAuth2 Endpoint
function testOAuth2Endpoint() {
    return new Promise((resolve, reject) => {
        console.log('2️⃣ Testing OAuth2 Endpoint: https://api.opure.uk/api/auth/discord');
        
        const postData = JSON.stringify({ code: 'test_code' });
        
        const options = {
            hostname: 'api.opure.uk',
            port: 443,
            path: '/api/auth/discord',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.error && response.error.includes('Invalid authorization code')) {
                        console.log('✅ OAuth2 Endpoint: OK (correctly rejects invalid code)');
                        console.log(`   Response: ${response.error}\n`);
                        resolve(true);
                    } else {
                        console.log('⚠️ OAuth2 Endpoint: Unexpected response');
                        console.log(`   Response: ${data}\n`);
                        resolve(false);
                    }
                } catch (e) {
                    console.log(`❌ OAuth2 Endpoint: Invalid JSON response\n`);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (err) => {
            console.log(`❌ OAuth2 Endpoint: Error - ${err.message}\n`);
            resolve(false);
        });
        
        req.write(postData);
        req.end();
    });
}

// Test 3: Client Accessibility
function testClientAccess() {
    return new Promise((resolve, reject) => {
        console.log('3️⃣ Testing Client Access: https://opure.uk');
        
        https.get('https://opure.uk', (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Client Access: OK');
                console.log(`   Status: ${res.statusCode}\n`);
                resolve(true);
            } else {
                console.log(`❌ Client Access: Failed (${res.statusCode})\n`);
                resolve(false);
            }
        }).on('error', (err) => {
            console.log(`❌ Client Access: Error - ${err.message}\n`);
            resolve(false);
        });
    });
}

// Run all tests
async function runTests() {
    console.log('🚀 Opure OAuth2 Setup Verification\n');
    console.log('Testing your IONOS + Vercel configuration...\n');
    
    const serverHealth = await testServerHealth();
    const oauth2Endpoint = await testOAuth2Endpoint();
    const clientAccess = await testClientAccess();
    
    console.log('📊 Test Results:');
    console.log(`   Server Health: ${serverHealth ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   OAuth2 Endpoint: ${oauth2Endpoint ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Client Access: ${clientAccess ? '✅ PASS' : '❌ FAIL'}\n`);
    
    if (serverHealth && oauth2Endpoint && clientAccess) {
        console.log('🎉 ALL TESTS PASSED!');
        console.log('🔐 OAuth2 should work correctly now!');
        console.log('🏴󠁧󠁢󠁳󠁣󠁴󠁿 Try your Discord Activity - authentication should work!\n');
    } else {
        console.log('⚠️ SOME TESTS FAILED');
        console.log('📋 Check the deployment guide: IONOS_VERCEL_OAUTH2_SETUP.md');
        console.log('🔧 Make sure environment variables are set in Vercel\n');
    }
    
    console.log('💡 Next steps:');
    console.log('   1. Deploy server: cd D:\\Opure.exe\\activity\\server && vercel --prod');
    console.log('   2. Set environment variables in Vercel dashboard');
    console.log('   3. Upload client dist/ folder to IONOS opure.uk');
    console.log('   4. Test Discord Activity OAuth2 flow');
}

runTests().catch(console.error);