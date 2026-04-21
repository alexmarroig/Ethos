const assert = require('assert');

// Mock db and other dependencies
const db = {
  users: new Map()
};

const uid = () => Math.random().toString(36).substr(2, 9);
const now = () => new Date().toISOString();

async function loginWithGoogle(googleToken) {
  // In real code this calls verifyGoogleToken
  // We mock a successful verification
  const payload = {
    email: 'test@gmail.com',
    name: 'Test User',
    picture: 'http://image.com/pic.jpg',
    sub: 'google-id-123'
  };

  if (googleToken !== 'valid-token') return null;

  let user = Array.from(db.users.values()).find((u) => u.email.toLowerCase() === payload.email.toLowerCase());

  if (!user) {
    user = {
      id: uid(),
      email: payload.email,
      name: payload.name || 'Usuário Google',
      avatar_url: payload.picture,
      role: 'professional',
      status: 'active',
      created_at: now(),
      updated_at: now(),
    };
    db.users.set(user.id, user);
  }

  return { user, token: 'fake-jwt-token' };
}

async function runTest() {
  console.log('Testing Google Login logic...');

  // Test 1: New user creation
  const result1 = await loginWithGoogle('valid-token');
  assert.ok(result1, 'Should return a session');
  assert.strictEqual(result1.user.email, 'test@gmail.com');
  assert.strictEqual(db.users.size, 1);
  console.log('✅ New user creation passed');

  // Test 2: Existing user login
  const result2 = await loginWithGoogle('valid-token');
  assert.ok(result2, 'Should return a session');
  assert.strictEqual(result2.user.id, result1.user.id);
  assert.strictEqual(db.users.size, 1);
  console.log('✅ Existing user login passed');

  // Test 3: Invalid token
  const result3 = await loginWithGoogle('invalid-token');
  assert.strictEqual(result3, null);
  console.log('✅ Invalid token handling passed');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
