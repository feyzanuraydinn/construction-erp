// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const opened = vi.hoisted(() => ({ urls: [] as string[] }));

vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn(async (url: string) => {
      opened.urls.push(url);
    }),
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(text, 'utf-8'),
    decryptString: (buffer: Buffer) => buffer.toString('utf-8'),
  },
}));

import { OAuth2Client } from 'google-auth-library';
import { googleDriveService } from '../../main/googleDrive';

let userDataPath: string;

beforeAll(() => {
  userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-gdrive-'));
  googleDriveService.init(userDataPath);
  googleDriveService.saveCredentials('test-client.apps.googleusercontent.com', 'test-secret');
});

afterAll(() => {
  vi.restoreAllMocks();
  fs.rmSync(userDataPath, { recursive: true, force: true });
});

const waitForAuthUrl = async (): Promise<URL> => {
  for (let i = 0; i < 100 && opened.urls.length === 0; i++)
    await new Promise((r) => setTimeout(r, 20));
  const url = opened.urls.shift();
  if (!url) throw new Error('auth URL was not opened');
  return new URL(url);
};

describe('Google Drive sign-in (OAuth)', () => {
  it('uses state + PKCE, ignores a forged callback and exchanges the code with the verifier', async () => {
    const getToken = vi.spyOn(OAuth2Client.prototype, 'getToken').mockImplementation(async () => ({
      tokens: { access_token: 'access', refresh_token: 'refresh' },
      res: null,
    }));

    const result = googleDriveService.startAuth();
    const authUrl = await waitForAuthUrl();
    const state = authUrl.searchParams.get('state');
    expect(state).toMatch(/^[0-9a-f]{32}$/);
    expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authUrl.searchParams.get('code_challenge')).toBeTruthy();

    const forged = await fetch('http://127.0.0.1:8089/oauth2callback?code=evil&state=wrong');
    expect(forged.status).toBe(400);
    expect(getToken).not.toHaveBeenCalled();

    const real = await fetch(`http://127.0.0.1:8089/oauth2callback?code=good&state=${state}`);
    expect(real.status).toBe(200);
    await expect(result).resolves.toEqual({ success: true });

    const [options] = getToken.mock.calls[0];
    expect(options).toMatchObject({ code: 'good' });
    expect(
      typeof options === 'object' &&
        options !== null &&
        'codeVerifier' in options &&
        options.codeVerifier
    ).toBeTruthy();
  });

  it('escapes an error message from the callback URL instead of rendering it as HTML', async () => {
    const result = googleDriveService.startAuth();
    const authUrl = await waitForAuthUrl();
    const state = authUrl.searchParams.get('state');

    const response = await fetch(
      `http://127.0.0.1:8089/oauth2callback?state=${state}&error=${encodeURIComponent('<script>alert(1)</script>')}`
    );
    const html = await response.text();

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    await expect(result).resolves.toMatchObject({ success: false });
  });
});

describe('expired Google sign-in', () => {
  it('tells an expired or revoked sign-in from a network problem', async () => {
    const { isAuthError } = await import('../../main/googleDrive');
    expect(isAuthError(new Error('invalid_grant'))).toBe(true);
    expect(isAuthError({ response: { status: 401, data: {} } })).toBe(true);
    expect(
      isAuthError({
        response: {
          status: 400,
          data: { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' },
        },
      })
    ).toBe(true);
    expect(isAuthError(new Error('getaddrinfo ENOTFOUND www.googleapis.com'))).toBe(false);
    expect(
      isAuthError({
        response: {
          status: 403,
          data: { error: { message: 'The user has exceeded their Drive storage quota' } },
        },
      })
    ).toBe(false);
  });

  it('drops a dead token and reports the sign-in as lost, so the app asks to reconnect', async () => {
    expect(googleDriveService.isConnected()).toBe(true);
    expect(fs.existsSync(path.join(userDataPath, 'google-drive-token.json'))).toBe(true);

    const lost = vi.fn();
    const unsubscribe = googleDriveService.onAuthLost(lost);
    const request = vi.spyOn(OAuth2Client.prototype, 'request').mockRejectedValue(
      Object.assign(new Error('invalid_grant'), {
        response: { status: 400, data: { error: 'invalid_grant' } },
      })
    );

    await expect(googleDriveService.ping()).resolves.toBe(false);
    expect(request).toHaveBeenCalled();
    expect(lost).toHaveBeenCalledTimes(1);
    expect(googleDriveService.isConnected()).toBe(false);
    expect(fs.existsSync(path.join(userDataPath, 'google-drive-token.json'))).toBe(false);

    request.mockRestore();
    unsubscribe();
  });
});

describe('retrying the sign-in', () => {
  it('can start again right after a failed attempt (the port is released)', async () => {
    const first = googleDriveService.startAuth();
    const firstUrl = await waitForAuthUrl();
    await fetch(
      `http://127.0.0.1:8089/oauth2callback?state=${firstUrl.searchParams.get('state')}&error=access_denied`
    );
    await expect(first).resolves.toMatchObject({ success: false });

    const second = googleDriveService.startAuth();
    const secondUrl = await waitForAuthUrl();
    await fetch(
      `http://127.0.0.1:8089/oauth2callback?state=${secondUrl.searchParams.get('state')}&error=access_denied`
    );
    const result = await second;
    expect(result.success).toBe(false);
    expect(result.error).not.toMatch(/8089/);
  });
});
