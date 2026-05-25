import axios, { AxiosInstance } from 'axios';

export const AQUALINK_API_KEY = 'EOOEMOW4YR6QNB07';
export const LOGIN_URL = 'https://prod.zodiac-io.com/users/v1/login';
export const REFRESH_URL = 'https://prod.zodiac-io.com/users/v1/refresh';
export const DEVICES_URL = 'https://r-api.iaqualink.net/devices.json';
export const SESSION_URL = 'https://r-api.iaqualink.net/v2/mobile/session.json';

export interface IAqualinkDevice {
  serial_number: string;
  device_type: string;
  name: string;
}

export interface IDeviceState {
  name: string;
  state: string;
  label?: string;
  type?: string;
  subtype?: string;
  aux?: string;
}

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

export class AuthCooldownError extends Error {
  constructor(failureCount: number, remainingMs: number) {
    super(`auth cooldown active after ${failureCount} consecutive failures (${Math.ceil(remainingMs / 1000)}s remaining)`);
    this.name = 'AuthCooldownError';
  }
}

export class IAqualinkApiClient {
  private readonly http: AxiosInstance;
  private authToken = '';
  private userId = '';
  private sessionId = '';
  private idToken = '';
  private refreshToken = '';

  private authFailureCount = 0;
  private lastAuthFailureAt = 0;

  constructor(
    private readonly username: string,
    private readonly password: string,
  ) {
    this.http = axios.create({
      headers: {
        'user-agent': 'okhttp/3.14.7',
        'content-type': 'application/json',
      },
      timeout: 15000,
    });
  }

  private currentCooldownMs(): number {
    const idx = Math.min(this.authFailureCount, AUTH_COOLDOWN_LADDER_MS.length - 1);
    return AUTH_COOLDOWN_LADDER_MS[idx];
  }

  private remainingCooldownMs(): number {
    const elapsed = Date.now() - this.lastAuthFailureAt;
    return Math.max(0, this.currentCooldownMs() - elapsed);
  }

  private throwIfCoolingDown(): void {
    const remaining = this.remainingCooldownMs();
    if (remaining > 0) {
      throw new AuthCooldownError(this.authFailureCount, remaining);
    }
  }

  private recordAuthFailure(): void {
    this.authFailureCount++;
    this.lastAuthFailureAt = Date.now();
  }

  private resetAuthFailures(): void {
    this.authFailureCount = 0;
    this.lastAuthFailureAt = 0;
  }

  get authFailureStreak(): number {
    return this.authFailureCount;
  }

  async login(): Promise<void> {
    this.throwIfCoolingDown();
    try {
      const resp = await this.http.post(LOGIN_URL, {
        api_key: AQUALINK_API_KEY,
        email: this.username,
        password: this.password,
      });
      const data = resp.data;
      this.authToken = data.authentication_token;
      this.userId = String(data.id);
      this.sessionId = data.session_id;
      this.idToken = data.userPoolOAuth?.IdToken ?? '';
      this.refreshToken = data.userPoolOAuth?.RefreshToken ?? '';
      this.resetAuthFailures();
    } catch (err) {
      this.recordAuthFailure();
      throw err;
    }
  }

  async refreshAuth(): Promise<void> {
    this.throwIfCoolingDown();
    try {
      const resp = await this.http.post(REFRESH_URL, {
        email: this.username,
        refresh_token: this.refreshToken,
      });
      const data = resp.data;
      this.authToken = data.authentication_token;
      this.userId = String(data.id);
      this.sessionId = data.session_id;
      this.idToken = data.userPoolOAuth?.IdToken ?? this.idToken;
      if (data.userPoolOAuth?.RefreshToken) {
        this.refreshToken = data.userPoolOAuth.RefreshToken;
      }
      this.resetAuthFailures();
    } catch {
      // Refresh failed — fall back to full login. login() shares the same
      // cooldown state, so back-to-back failures only count as one toward
      // the ladder (login's recordAuthFailure runs; refresh's catch
      // swallows its own failure without double-counting).
      await this.login();
    }
  }

  async getDevices(): Promise<IAqualinkDevice[]> {
    const resp = await this.http.get(DEVICES_URL, {
      params: {
        api_key: AQUALINK_API_KEY,
        authentication_token: this.authToken,
        user_id: this.userId,
      },
    });
    return resp.data as IAqualinkDevice[];
  }

  private sessionHeaders() {
    return {
      Authorization: `Bearer ${this.idToken}`,
      api_key: AQUALINK_API_KEY,
    };
  }

  async sendCommand(serial: string, command: string, extra: Record<string, string> = {}): Promise<unknown> {
    const params: Record<string, string> = {
      actionID: 'command',
      command,
      serial,
      sessionID: this.sessionId,
      ...extra,
    };
    const queryStr = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const resp = await this.http.get(`${SESSION_URL}?${queryStr}`, {
      headers: this.sessionHeaders(),
    });
    return resp.data;
  }

  async getHomeScreen(serial: string): Promise<unknown> {
    return this.sendCommand(serial, 'get_home');
  }

  async getDevicesScreen(serial: string): Promise<unknown> {
    return this.sendCommand(serial, 'get_devices');
  }

  async setPoolPump(serial: string): Promise<unknown> {
    return this.sendCommand(serial, 'set_pool_pump');
  }

  async setSpaPump(serial: string): Promise<unknown> {
    return this.sendCommand(serial, 'set_spa_pump');
  }

  async setPoolHeater(serial: string): Promise<unknown> {
    return this.sendCommand(serial, 'set_pool_heater');
  }

  async setSpaHeater(serial: string): Promise<unknown> {
    return this.sendCommand(serial, 'set_spa_heater');
  }

  async setAux(serial: string, auxNumber: string): Promise<unknown> {
    return this.sendCommand(serial, `set_aux_${auxNumber}`);
  }

  async setLight(serial: string, aux: string, light: string, subtype?: string): Promise<unknown> {
    const extra: Record<string, string> = { aux, light };
    if (subtype !== undefined) {
      extra['subtype'] = subtype;
    }
    return this.sendCommand(serial, 'set_light', extra);
  }

  async setTemps(serial: string, temps: Record<string, string>): Promise<unknown> {
    return this.sendCommand(serial, 'set_temps', temps);
  }

  get isLoggedIn(): boolean {
    return this.authToken !== '';
  }
}
