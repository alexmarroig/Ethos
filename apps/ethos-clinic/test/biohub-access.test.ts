import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { BiohubAccessResolverService } from "../src/application/biohubAccessResolver";
import { createEthosBackend } from "../src/server";
import { db, resetDatabaseForTests, uid } from "../src/infra/database";

const req = async (base: string, path: string, body: unknown, headers: Record<string,string> = {}) => {
  const res = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json() as any };
};

test("biohub resolver precedence full", async (t) => {
  const r = new BiohubAccessResolverService(); const u="u";
  await t.test("blocked", ()=>{ resetDatabaseForTests(); db.biohubAccessProfiles.set(u,{user_id:u,trial_started_at:null,trial_ends_at:null,status:"blocked",is_ambassador:false}); return r.resolve({user_id:u}).then(x=>assert.equal(x.reason,"blocked"));});
  await t.test("override", ()=>{ resetDatabaseForTests(); db.biohubPlanOverrides.set(uid(),{id:uid(),user_id:u,override_plan:"premium",reason:"x",set_by_admin_id:"a",active:true}); return r.resolve({user_id:u}).then(x=>assert.equal(x.reason,"override"));});
  await t.test("ambassador", ()=>{ resetDatabaseForTests(); db.biohubAccessProfiles.set(u,{user_id:u,trial_started_at:null,trial_ends_at:null,status:"active",is_ambassador:true}); return r.resolve({user_id:u}).then(x=>assert.equal(x.reason,"ambassador"));});
  await t.test("bundle", ()=>{ resetDatabaseForTests(); db.biohubSubscriptions.set(uid(),{id:uid(),user_id:u,source:"bundle",plan_code:"basic",status:"active",current_period_start:new Date().toISOString(),current_period_end:new Date().toISOString()}); return r.resolve({user_id:u}).then(x=>assert.equal(x.reason,"bundle"));});
  await t.test("standalone", ()=>{ resetDatabaseForTests(); db.biohubSubscriptions.set(uid(),{id:uid(),user_id:u,source:"standalone",plan_code:"basic",status:"active",current_period_start:new Date().toISOString(),current_period_end:new Date().toISOString()}); return r.resolve({user_id:u}).then(x=>assert.equal(x.reason,"standalone"));});
  await t.test("trial", ()=>{ resetDatabaseForTests(); db.biohubAccessProfiles.set(u,{user_id:u,trial_started_at:new Date().toISOString(),trial_ends_at:new Date(Date.now()+86400000).toISOString(),status:"trialing",is_ambassador:false}); return r.resolve({user_id:u}).then(x=>assert.equal(x.reason,"trial"));});
  await t.test("none", ()=>{ resetDatabaseForTests(); return r.resolve({user_id:u}).then(x=>assert.equal(x.reason,"no_access"));});
});

test("biohub API contracts and statuses", async () => {
  process.env.BIOHUB_INTEGRATION_ENABLED = "1"; process.env.BIOHUB_LEGACY_ACCESS_ENDPOINT_ENABLED = "1"; process.env.ETHOS_API_TOKEN = "tok";
  resetDatabaseForTests();
  const server = createEthosBackend(); server.listen(0); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const unauthorized = await req(base, "/api/integrations/biohub/access", { user_id: "u1" });
    assert.equal(unauthorized.status, 401); assert.ok(unauthorized.json.error?.code);

    const forbidden = await req(base, "/api/integrations/biohub/access", { user_id: "u-denied" }, { authorization: "Bearer tok", "x-biohub-strict": "1" });
    assert.equal(forbidden.status, 403);

    db.biohubAccessProfiles.set("u1", { user_id: "u1", trial_started_at: new Date().toISOString(), trial_ends_at: new Date(Date.now()+86400000).toISOString(), status: "trialing", is_ambassador: false });
    const envRes = await req(base, "/api/integrations/biohub/access", { user_id: "u1" }, { authorization: "Bearer tok" });
    assert.equal(envRes.status, 200); assert.equal(envRes.json.data.allowed, true);

    const rawRes = await req(base, "/api/integrations/biohub/access", { user_id: "u1" }, { authorization: "Bearer tok", "x-biohub-compat": "raw" });
    assert.equal(rawRes.status, 200); assert.equal(rawRes.json.allowed, true);

    const legacy = await req(base, "/biohub/access", { userId: "u1", action: "read" }, { authorization: "Bearer tok" });
    assert.equal(legacy.status, 200); assert.deepEqual(legacy.json.data, { allowed: true });

    process.env.BIOHUB_INTEGRATION_ENABLED = "0";
    const unavailable = await req(base, "/api/integrations/biohub/access", { user_id: "u1" }, { authorization: "Bearer tok" });
    assert.equal(unavailable.status, 503);
    process.env.BIOHUB_INTEGRATION_ENABLED = "1";

    for (let i = 0; i < 121; i += 1) {
      const r = await req(base, "/biohub/access", { userId: "u1", action: "read" }, { authorization: "Bearer tok" });
      if (i === 120) assert.equal(r.status, 429);
    }
  } finally { server.closeAllConnections(); server.close(); }
});


test("phase2 admin + sso", async () => {
  process.env.BIOHUB_ADMIN_OVERRIDE_ENABLED = "1"; process.env.BIOHUB_SSO_VALIDATE_ENABLED = "1"; process.env.BIOHUB_SSO_JWT_SECRET = "secret";
  resetDatabaseForTests();
  const server = createEthosBackend(); server.listen(0); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const adminLogin = await req(base, "/auth/login", { email: "admin@ethos.local", password: "admin123" });
    const adminToken = adminLogin.json.data.token;
    const setOverride = await req(base, "/api/admin/biohub/users/u2/override", { override_plan: "premium", reason: "vip" }, { authorization: `Bearer ${adminToken}` });
    assert.equal(setOverride.status, 200);
    const accessAfterOverride = await req(base, "/api/integrations/biohub/access", { user_id: "u2" }, { authorization: "Bearer tok", "x-biohub-compat": "raw" });
    assert.equal(accessAfterOverride.json.allowed, true);
    

    
    const userLogin = await req(base, "/auth/login", { email: "camila@ethos.local", password: "admin123" });
    const openToken = await req(base, "/api/me/biohub/sso-token", {}, { authorization: `Bearer ${userLogin.json.data.token}` });
    assert.equal(openToken.status, 200);
    const metricRes = await fetch(`${base}/metrics`);
    assert.equal(metricRes.status, 200);

    const adminLogin = await req(base, "/auth/login", { email: "camila@ethos.local", password: "admin123" });
    const adminToken = adminLogin.json.data.token;
    const setOverride = await req(base, "/api/admin/biohub/users/u2/override", { override_plan: "premium", reason: "vip" }, { authorization: `Bearer ${adminToken}` });
    assert.equal(setOverride.status, 403);
    

    const payload = Buffer.from(JSON.stringify({ user_id: "u1", tenant_id: "t1", session_id: "s1", issued_at: 1, exp: Math.floor(Date.now()/1000)+3600, requires_upgrade: false })).toString("base64url");
    const head = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const sig = require("node:crypto").createHmac("sha256", "secret").update(`${head}.${payload}`).digest("base64url");
    const token = `${head}.${payload}.${sig}`;
    const sso = await req(base, "/api/integrations/sso/validate", { token });
    assert.equal(sso.status, 200);
    assert.equal(sso.json.data.valid, true);
  } finally { server.closeAllConnections(); server.close(); }
});
