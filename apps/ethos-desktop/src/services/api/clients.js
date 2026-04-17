"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLINICAL_API_BASE_URL = exports.CONTROL_API_BASE_URL = exports.clinicalClient = exports.controlClient = void 0;
const controlPlane_contract_1 = require("./contracts/controlPlane.contract");
const clinical_contract_1 = require("./contracts/clinical.contract");
const httpClient_1 = require("./httpClient");
const getEnv = (key, fallback) => {
    const fromVite = import.meta.env[key];
    return typeof fromVite === "string" && fromVite.trim().length > 0 ? fromVite : fallback;
};
const CONTROL_API_BASE_URL = getEnv("CONTROL_API_BASE_URL", "http://localhost:8788");
exports.CONTROL_API_BASE_URL = CONTROL_API_BASE_URL;
const CLINICAL_API_BASE_URL = getEnv("CLINICAL_API_BASE_URL", "http://localhost:8787");
exports.CLINICAL_API_BASE_URL = CLINICAL_API_BASE_URL;
const getStoredToken = () => {
    try {
        return localStorage.getItem("ethos-admin-token");
    }
    catch {
        return null;
    }
};
const getControlBaseUrl = () => {
    try {
        return localStorage.getItem("ethos-control-plane-url") || CONTROL_API_BASE_URL;
    }
    catch {
        return CONTROL_API_BASE_URL;
    }
};
const revalidateSession = (reason) => {
    if (typeof window === "undefined")
        return;
    window.dispatchEvent(new CustomEvent("ethos:session-invalid", { detail: { reason } }));
};
exports.controlClient = (0, httpClient_1.createHttpClient)({
    name: "controlClient",
    baseUrl: getControlBaseUrl,
    contract: controlPlane_contract_1.controlPlaneContract,
    getAuthToken: getStoredToken,
    onSessionInvalid: revalidateSession,
});
exports.clinicalClient = (0, httpClient_1.createHttpClient)({
    name: "clinicalClient",
    baseUrl: CLINICAL_API_BASE_URL,
    contract: clinical_contract_1.clinicalContract,
    getAuthToken: getStoredToken,
    onSessionInvalid: revalidateSession,
    offline: {
        enabled: true,
        cacheNamespace: "ethos-clinical-offline-cache",
    },
});
