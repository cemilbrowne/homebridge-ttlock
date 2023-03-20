
import axios from 'axios';
import qs from 'qs';

import { TtlockPlatform } from './platform';
import { TokenResponse } from './models/token-response';
import { LocksResponse } from './models/locks-response';
import { LockResponse } from './models/lock-response';

/**
 * Represents a client that communicates with the Tedee HTTP API.
 */
export class TtlockApiClient {

  /**
     * Initializes a new TtlockApiClient instance.
     * @param platform The platform of the plugin.
     */
  constructor(private platform: TtlockPlatform) { }

  /**
     * Contains the expiration date time for the access token.
     */
  private expirationDateTime: Date|null = null;

  /**
     * Contains the currently active access token.
     */
  public accessToken: string|null = null;

  public async getLockStatus(lockId: string): Promise<LockResponse> {
    await this.getAccessTokenAsync();
    const now = new Date().getTime();

    this.platform.log.debug('Querying, clientid: '+this.platform.config.clientid+' accesstoken: '+this.accessToken+' lockid: '+lockId+' date: '+now);

    const response = await axios.post<LockResponse>('https://euapi.ttlock.com/v3/lock/queryOpenState', qs.stringify({
      clientId: this.platform.config.clientid,
      accessToken: this.accessToken,
      lockId: lockId,
      date: now,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 6000,
    });



    if (response.data.errcode === null || response.data.errcode === undefined) {
      this.platform.log.debug('Got Lock Response: ' + response.data.state);
    } else {
      this.platform.log.error('Ensure your TTLock API keys and username/password are correct in the config. Error: ' +
        response.data.errcode);
    }
    return response.data;
  }

  public async lock(lockId: string): Promise<LockResponse> {
    await this.getAccessTokenAsync();
    const now = new Date().getTime();

    this.platform.log.debug('locking, clientid: '+this.platform.config.clientid+' accesstoken: '+this.accessToken+' lockid: '+lockId+' date: '+now);

    const response = await axios.post<LockResponse>('https://euapi.ttlock.com/v3/lock/lock', qs.stringify({
      clientId: this.platform.config.clientid,
      accessToken: this.accessToken,
      lockId: lockId,
      date: now,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 8000,
    });



    if (response.data.errcode === null || response.data.errcode === undefined) {
      this.platform.log.debug('Got Lock Response: ' + response.data.state);
    } else {
      this.platform.log.error('Locking Error. Ensure your TTLock API keys and username/password are correct in the config. Error: ' +
        response.data.errcode);
    }
    return response.data;
  }

  public async unlock(lockId: string): Promise<LockResponse> {
    await this.getAccessTokenAsync();
    const now = new Date().getTime();

    this.platform.log.debug('unlocking, clientid: '+this.platform.config.clientid+' accesstoken: '+this.accessToken+' lockid: '+lockId+' date: '+now);

    const response = await axios.post<LockResponse>('https://euapi.ttlock.com/v3/lock/unlock', qs.stringify({
      clientId: this.platform.config.clientid,
      accessToken: this.accessToken,
      lockId: lockId,
      date: now,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 6000,
    });



    if (response.data.errcode === null || response.data.errcode === undefined) {
      this.platform.log.debug('Got Lock Response: ' + response.data.state);
    } else {
      this.platform.log.error('Unlocking Error. Ensure your TTLock API keys and username/password are correct in the config. Error: ' +
        response.data.errcode);
    }
    return response.data;
  }

  public async getLockList(): Promise<LocksResponse> {
    await this.getAccessTokenAsync();
    const now = new Date().getTime();
    const response = await axios.post<LocksResponse>('https://euapi.ttlock.com/v3/lock/list', qs.stringify({
      clientId: this.platform.config.clientid,
      accessToken: this.accessToken,
      pageNo:  1,
      pageSize: 100,
      date: now,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 6000,
    });

    if (response.data.errcode === null || response.data.errcode === undefined) {
      this.platform.log.debug('Number of locks returned from API: ' + String(response.data.list.length));
    } else {
      this.platform.log.error('Ensure your TTLock API keys and username/password are correct in the config. Error: ' +
        response.data.errcode);
    }
    return response.data;
  }

  /**
     * Gets the access token either from cache or from the token endpoint.
     * @param retryCount The number of retries before reporting failure.
     */
  public async getAccessTokenAsync(retryCount?: number): Promise<string> {

    // Checks if the current access token is expired
    if (this.expirationDateTime && this.expirationDateTime.getTime() < new Date().getTime() - (120 * 1000)) {
      this.expirationDateTime = null;
      this.accessToken = null;
    }

    // Checks if a cached access token exists
    if (this.accessToken) {
      this.platform.log.debug('Returning cached access token.');
      return this.accessToken;
    }

    // Set the default retry count
    if (!retryCount) {
      retryCount = this.platform.config.maximumTokenRetry;
    }

    // Sends the HTTP request to get a new access token
    try {
      const response = await axios.post<TokenResponse>('https://euapi.ttlock.com/oauth2/token', qs.stringify({
        client_id: this.platform.config.clientid,
        client_secret: this.platform.config.clientsecret,
        username:  this.platform.config.username,
        password: this.platform.config.password,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Stores the access token
      this.accessToken = String(response.data.access_token);
      this.expirationDateTime = new Date(new Date().getTime() + (response.data.expires_in * 1000));

      // Returns the access token
      this.platform.log.debug('New access token received from server.' + this.accessToken);
      return this.accessToken;

    } catch (e) {
      this.platform.log.warn(`Error while retrieving access token: ${e}`);
      return await this.getAccessTokenAsync(retryCount);
    }
  }
}
