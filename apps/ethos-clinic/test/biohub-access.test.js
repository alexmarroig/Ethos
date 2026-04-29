const test = require('node:test');
const assert = require('node:assert/strict');
const { BiohubAccessResolverService } = require('../dist/application/biohubAccessResolver');
const { db, resetDatabaseForTests, uid } = require('../dist/infra/database');

test('biohub resolver precedence', async (t) => {
  const resolver = new BiohubAccessResolverService();
  const u = 'user-biohub';
  await t.test('blocked > all', () => {
    resetDatabaseForTests();
    db.biohubAccessProfiles.set(u, { user_id: u, trial_started_at: null, trial_ends_at: null, status: 'blocked', is_ambassador: true, blocked_at: new Date().toISOString() });
    const r = resolver.resolve({ user_id: u });
    assert.equal(r.reason, 'blocked');
  });
  await t.test('override > others', () => {
    resetDatabaseForTests();
    db.biohubPlanOverrides.set(uid(), { id: uid(), user_id: u, override_plan: 'basic', reason: 'admin', set_by_admin_id: 'a', active: true });
    const r = resolver.resolve({ user_id: u });
    assert.equal(r.reason, 'override');
  });
});
