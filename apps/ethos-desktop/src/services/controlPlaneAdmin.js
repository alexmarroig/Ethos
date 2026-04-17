"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAdminUsers = exports.fetchAdminOverview = exports.loginControlPlane = void 0;
const clients_1 = require("./api/clients");
const loginControlPlane = async (_baseUrl, credentials, extras) => {
    const result = await clients_1.controlClient.request("/v1/auth/login", {
        method: "POST",
        body: credentials,
        signal: extras?.signal,
        timeoutMs: extras?.timeoutMs,
    });
    return {
        token: result.token,
        role: result.user.role,
        user: result.user,
    };
};
exports.loginControlPlane = loginControlPlane;
const fetchAdminOverview = async (_baseUrl, _token, extras) => {
    return clients_1.controlClient.request("/v1/admin/metrics/overview", {
        signal: extras?.signal,
        timeoutMs: extras?.timeoutMs,
    });
};
exports.fetchAdminOverview = fetchAdminOverview;
const fetchAdminUsers = async (_baseUrl, _token, extras) => {
    return clients_1.controlClient.request("/v1/admin/users", {
        signal: extras?.signal,
        timeoutMs: extras?.timeoutMs,
    });
};
exports.fetchAdminUsers = fetchAdminUsers;
