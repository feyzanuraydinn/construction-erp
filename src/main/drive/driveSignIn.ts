import { CodeChallengeMethod, type Credentials, type OAuth2Client } from 'google-auth-library';
import { shell } from 'electron';
import crypto from 'crypto';
import http from 'http';
import { t, getLocale } from '../i18n';
import { renderAuthPage } from '../authPage';
import { API, TIMING } from '../../utils/constants';
import { formatDriveError } from './driveErrors';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const REDIRECT_PORT = API.OAUTH_REDIRECT_PORT;

export interface SignInResult {
  success: boolean;
  error?: string;
}

function errorPage(title: string, message: string): string {
  return renderAuthPage({
    variant: 'error',
    lang: getLocale(),
    brand: t('main.gdrive.brand'),
    pageTitle: t('main.errorTitle'),
    title,
    message,
    hint: t('main.gdrive.errorHint'),
  });
}

export async function signInWithBrowser(
  client: OAuth2Client,
  saveToken: (tokens: Credentials) => void
): Promise<SignInResult> {
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  const state = crypto.randomBytes(16).toString('hex');

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    const finish = (result: SignInResult) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      server.close();
      server.closeAllConnections();
      resolve(result);
    };

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state,
      code_challenge_method: CodeChallengeMethod.S256,
      code_challenge: codeChallenge,
    });

    const server = http.createServer(async (req, res) => {
      if (req.url?.startsWith('/oauth2callback')) {
        const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (url.searchParams.get('state') !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8', Connection: 'close' });
          res.end(errorPage(t('main.gdrive.connectionError'), t('main.gdrive.invalidState')));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', Connection: 'close' });

        if (error) {
          const errorMsg =
            error === 'access_denied'
              ? t('main.gdrive.accessDenied')
              : t('main.gdrive.oauthError', { error });
          res.end(errorPage(t('main.gdrive.connectionDenied'), errorMsg));
          finish({ success: false, error: errorMsg });
          return;
        }

        if (code) {
          try {
            const { tokens } = await client.getToken({ code, codeVerifier });
            client.setCredentials(tokens);

            saveToken(tokens);

            res.end(
              renderAuthPage({
                variant: 'success',
                lang: getLocale(),
                brand: t('main.gdrive.brand'),
                pageTitle: t('main.gdrive.successTitle'),
                title: t('main.gdrive.connectionSuccess'),
                message: t('main.gdrive.successMessage'),
                hint: t('main.gdrive.closeWindow'),
              })
            );

            finish({ success: true });
          } catch (error) {
            const message = formatDriveError(error);
            res.end(errorPage(t('main.gdrive.connectionError'), message));
            finish({ success: false, error: message });
          }
        } else {
          res.end(errorPage(t('main.gdrive.noAuthCode'), t('main.gdrive.noAuthCodeMessage')));
          finish({ success: false, error: t('main.gdrive.noAuthCode') });
        }
      }
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        finish({
          success: false,
          error: t('main.gdrive.portInUse', { port: REDIRECT_PORT }),
        });
      } else {
        finish({ success: false, error: t('main.gdrive.serverError', { error: err.message }) });
      }
    });

    server.listen(REDIRECT_PORT, '127.0.0.1', () => {
      void shell.openExternal(authUrl);
    });

    timer = setTimeout(() => {
      finish({ success: false, error: t('main.gdrive.authTimeout') });
    }, TIMING.OAUTH_TIMEOUT);
  });
}
