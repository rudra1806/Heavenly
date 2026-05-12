#!/usr/bin/env node

/**
 * Smoke Test Script — Verifies all microservices are running and healthy.
 * 
 * Checks:
 *   1. Health endpoints for all services
 *   2. API Gateway routing
 *   3. BFF rendering
 *   4. Inter-service communication
 * 
 * Usage:
 *   node scripts/smoke-test.js
 *   node scripts/smoke-test.js --gateway-url http://localhost:3000
 *   node scripts/smoke-test.js --bff-url http://localhost:8080
 */

const args = process.argv.slice(2);
const GATEWAY_URL = args.find(a => a.startsWith('--gateway-url='))?.split('=')[1] || 'http://localhost:3000';
const BFF_URL = args.find(a => a.startsWith('--bff-url='))?.split('=')[1] || 'http://localhost:8080';

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (err) {
        console.log(`  ❌ ${name}: ${err.message}`);
        failed++;
    }
}

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function fetchStatus(url) {
    const res = await fetch(url);
    return res.status;
}

async function main() {
    console.log('\n🧪 Heavenly Microservices — Smoke Tests\n');
    console.log(`   Gateway: ${GATEWAY_URL}`);
    console.log(`   BFF:     ${BFF_URL}\n`);

    // ===== 1. Service Health Checks =====
    console.log('📡 Service Health Checks:');

    const services = [
        ['Gateway',  `${GATEWAY_URL}/health`],
        ['Auth',     'http://localhost:3001/health'],
        ['Listing',  'http://localhost:3002/health'],
        ['Review',   'http://localhost:3003/health'],
        ['Booking',  'http://localhost:3004/health'],
        ['Media',    'http://localhost:3005/health'],
        ['Search',   'http://localhost:3006/health'],
        ['Admin',    'http://localhost:3007/health'],
        ['BFF',      `${BFF_URL}/health`]
    ];

    for (const [name, url] of services) {
        await test(`${name} health (${url})`, async () => {
            const data = await fetchJSON(url);
            if (data.status !== 'healthy') throw new Error(`Status: ${data.status}`);
        });
    }

    // ===== 2. API Gateway Routing =====
    console.log('\n🔀 API Gateway Routing:');

    await test('GET /api/listings (via Gateway)', async () => {
        const data = await fetchJSON(`${GATEWAY_URL}/api/listings`);
        if (!data.success) throw new Error('Response not successful');
    });

    await test('GET /api/reviews (via Gateway)', async () => {
        const data = await fetchJSON(`${GATEWAY_URL}/api/reviews`);
        if (!data.success) throw new Error('Response not successful');
    });

    await test('GET /api/bookings requires auth (401)', async () => {
        const status = await fetchStatus(`${GATEWAY_URL}/api/bookings`);
        if (status !== 401) throw new Error(`Expected 401, got ${status}`);
    });

    await test('GET /api/search?q=test (via Gateway)', async () => {
        const data = await fetchJSON(`${GATEWAY_URL}/api/search?q=test`);
        if (!data.success) throw new Error('Response not successful');
    });

    await test('Protected endpoint returns 401 without token', async () => {
        const status = await fetchStatus(`${GATEWAY_URL}/api/auth/me`);
        if (status !== 401) throw new Error(`Expected 401, got ${status}`);
    });

    // ===== 3. BFF Rendering =====
    console.log('\n🖥️  BFF Page Rendering:');

    const bffPages = [
        ['Home page', '/'],
        ['Listings page', '/listings'],
        ['Login page', '/login'],
        ['Signup page', '/signup'],
        ['Contact page', '/contact'],
        ['Privacy page', '/privacy'],
        ['Terms page', '/terms']
    ];

    for (const [name, path] of bffPages) {
        await test(`${name} (${BFF_URL}${path})`, async () => {
            const res = await fetch(`${BFF_URL}${path}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = await res.text();
            if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
                throw new Error('Not an HTML page');
            }
        });
    }

    // ===== 4. Auth Flow =====
    console.log('\n🔐 Auth Flow:');

    await test('Register new test user', async () => {
        const res = await fetch(`${GATEWAY_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `smoketest_${Date.now()}`,
                email: `smoketest_${Date.now()}@test.com`,
                password: 'testpass123'
            })
        });
        const data = await res.json();
        if (!data.data?.accessToken) throw new Error('No token returned');
    });

    // ===== Summary =====
    console.log('\n' + '='.repeat(50));
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50) + '\n');

    if (failed > 0) {
        console.log('  ⚠️  Some tests failed. Check that all services are running:');
        console.log('     docker-compose up -d\n');
        process.exit(1);
    } else {
        console.log('  🎉 All smoke tests passed!\n');
    }
}

main().catch(err => {
    console.error('\n❌ Smoke test runner failed:', err.message);
    process.exit(1);
});
