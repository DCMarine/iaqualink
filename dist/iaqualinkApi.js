"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IAqualinkApiClient = exports.AuthCooldownError = exports.SESSION_URL = exports.DEVICES_URL = exports.REFRESH_URL = exports.LOGIN_URL = exports.AQUALINK_API_KEY = void 0;
const axios_1 = __importDefault(require("axios"));
exports.AQUALINK_API_KEY = 'EOOEMOW4YR6QNB07';
exports.LOGIN_URL = 'https://prod.zodiac-io.com/users/v1/login';
exports.REFRESH_URL = 'https://prod.zodiac-io.com/users/v1/refresh';
exports.DEVICES_URL = 'https://r-api.iaqualink.net/devices.json';
exports.SESSION_URL = 'https://r-api.iaqualink.net/v2/mobile/session.json';
// Cooldown ladder applied to login + refresh when the auth endpoints
// repeatedly reject us. Without this, sustained backend rejection is
// amplified by the poll loop into hundreds or thousands of login attempts
// per hour — which on Jandy's side actually CAUSES a global account lockout
// that then prevents the legitimate iAquaLink mobile app from logging in too,
// since both clients share one account. Tuned conservatively so that a
// single transient blip costs at most one extra retry, but a true lockout
// settles into roughly one auth attempt per hour after five consecutive
// failures.
const AUTH_COOLDOWN_LADDER_MS = [0, 60_000, 300_000, 900_000, 3_600_000];
class AuthCooldownError extends Error {
    constructor(failureCount, remainingMs) {
        super(`auth cooldown active after ${failureCount} consecutive failures (${Math.ceil(remainingMs / 1000)}s remaining)`);
        this.name = 'AuthCooldownError';
    }
}
exports.AuthCooldownError = AuthCooldownError;
class IAqualinkApiClient {
    username;
    password;
    http;
    authToken = '';
    userId = '';
    idToken = '';
    refreshToken = '';
    authFailureCount = 0;
    lastAuthFailureAt = 0;
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.http = axios_1.default.create({
            headers: {
                'user-agent': 'okhttp/3.14.7',
                'content-type': 'application/json',
            },
            timeout: 15000,
        });
    }
    currentCooldownMs() {
        const idx = Math.min(this.authFailureCount, AUTH_COOLDOWN_LADDER_MS.length - 1);
        return AUTH_COOLDOWN_LADDER_MS[idx];
    }
    remainingCooldownMs() {
        const elapsed = Date.now() - this.lastAuthFailureAt;
        return Math.max(0, this.currentCooldownMs() - elapsed);
    }
    throwIfCoolingDown() {
        const remaining = this.remainingCooldownMs();
        if (remaining > 0) {
            throw new AuthCooldownError(this.authFailureCount, remaining);
        }
    }
    recordAuthFailure() {
        this.authFailureCount++;
        this.lastAuthFailureAt = Date.now();
    }
    resetAuthFailures() {
        this.authFailureCount = 0;
        this.lastAuthFailureAt = 0;
    }
    get authFailureStreak() {
        return this.authFailureCount;
    }
    async login() {
        this.throwIfCoolingDown();
        try {
            const resp = await this.http.post(exports.LOGIN_URL, {
                api_key: exports.AQUALINK_API_KEY,
                email: this.username,
                password: this.password,
            });
            const data = resp.data;
            this.authToken = data.authentication_token;
            this.userId = String(data.id);
            this.idToken = data.userPoolOAuth?.IdToken ?? '';
            this.refreshToken = data.userPoolOAuth?.RefreshToken ?? '';
            this.resetAuthFailures();
        }
        catch (err) {
            this.recordAuthFailure();
            throw err;
        }
    }
    async refreshAuth() {
        this.throwIfCoolingDown();
        try {
            const resp = await this.http.post(exports.REFRESH_URL, {
                email: this.username,
                refresh_token: this.refreshToken,
            });
            const data = resp.data;
            this.authToken = data.authentication_token;
            this.userId = String(data.id);
            this.idToken = data.userPoolOAuth?.IdToken ?? this.idToken;
            if (data.userPoolOAuth?.RefreshToken) {
                this.refreshToken = data.userPoolOAuth.RefreshToken;
            }
            this.resetAuthFailures();
        }
        catch {
            // Refresh failed — fall back to full login. login() shares the same
            // cooldown state, so back-to-back failures only count as one toward
            // the ladder (login's recordAuthFailure runs; refresh's catch
            // swallows its own failure without double-counting).
            await this.login();
        }
    }
    async getDevices() {
        const resp = await this.http.get(exports.DEVICES_URL, {
            params: {
                api_key: exports.AQUALINK_API_KEY,
                authentication_token: this.authToken,
                user_id: this.userId,
            },
        });
        return resp.data;
    }
    sessionHeaders() {
        return {
            Authorization: `Bearer ${this.idToken}`,
            api_key: exports.AQUALINK_API_KEY,
        };
    }
    async sendCommand(serial, command, extra = {}) {
        // session.json authenticates from the `Authorization: Bearer <IdToken>` header
        // alone. The legacy `sessionID` query parameter is dead weight — verified
        // empirically: Bearer-only returns 200 with full payload; sessionID without
        // Bearer returns 401. Omitting it makes each plugin instance independent of
        // any other client on the same account (mobile app, web portal, Alexa skill),
        // which is the model the Alexa skill already uses.
        const params = {
            actionID: 'command',
            command,
            serial,
            ...extra,
        };
        const queryStr = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
        const resp = await this.http.get(`${exports.SESSION_URL}?${queryStr}`, {
            headers: this.sessionHeaders(),
        });
        return resp.data;
    }
    async getHomeScreen(serial) {
        return this.sendCommand(serial, 'get_home');
    }
    async getDevicesScreen(serial) {
        return this.sendCommand(serial, 'get_devices');
    }
    async setPoolPump(serial) {
        return this.sendCommand(serial, 'set_pool_pump');
    }
    async setSpaPump(serial) {
        return this.sendCommand(serial, 'set_spa_pump');
    }
    async setPoolHeater(serial) {
        return this.sendCommand(serial, 'set_pool_heater');
    }
    async setSpaHeater(serial) {
        return this.sendCommand(serial, 'set_spa_heater');
    }
    async setAux(serial, auxNumber) {
        return this.sendCommand(serial, `set_aux_${auxNumber}`);
    }
    async setLight(serial, aux, light, subtype) {
        const extra = { aux, light };
        if (subtype !== undefined) {
            extra['subtype'] = subtype;
        }
        return this.sendCommand(serial, 'set_light', extra);
    }
    async setTemps(serial, temps) {
        return this.sendCommand(serial, 'set_temps', temps);
    }
    get isLoggedIn() {
        return this.authToken !== '';
    }
}
exports.IAqualinkApiClient = IAqualinkApiClient;
