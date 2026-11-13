import { OAuth2Client } from 'google-auth-library';
import { safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { t } from '../i18n';
import { DRIVE_REDIRECT_URI } from '../../utils/constants';
import { mainLogger } from '../logger';
import { UserFacingError } from '../../utils/userFacingError';

const credentialsFileSchema = z.object({
  encrypted: z.boolean().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
});

const encryptedTokenFileSchema = z.object({ encrypted: z.literal(true), token: z.string().min(1) });

const tokenSchema = z.looseObject({
  access_token: z.string().nullish(),
  refresh_token: z.string().nullish(),
  expiry_date: z.number().nullish(),
  token_type: z.string().nullish(),
  id_token: z.string().nullish(),
  scope: z.string().optional(),
});

function encrypt(value: string): string {
  return safeStorage.encryptString(value).toString('base64');
}

function decrypt(value: string): string {
  return safeStorage.decryptString(Buffer.from(value, 'base64'));
}

function writeEncryptedFile(filePath: string, fields: Record<string, string>): void {
  fs.writeFileSync(filePath, JSON.stringify({ encrypted: true, ...fields, version: 2 }, null, 2));
}

export class DriveCredentialStore {
  private tokenPath: string = '';
  private configPath: string = '';
  private clientId = '';
  private clientSecret = '';

  setLocation(userDataPath: string): void {
    this.tokenPath = path.join(userDataPath, 'google-drive-token.json');
    this.configPath = path.join(userDataPath, 'google-drive-credentials.json');
  }

  hasCredentials(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }

  createClient(): OAuth2Client {
    return new OAuth2Client(this.clientId, this.clientSecret, DRIVE_REDIRECT_URI);
  }

  loadCredentials(resavePlainCredentials: (clientId: string, clientSecret: string) => void): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = credentialsFileSchema.parse(
          JSON.parse(fs.readFileSync(this.configPath, 'utf-8'))
        );

        if (data.encrypted && data.clientId && data.clientSecret) {
          if (safeStorage.isEncryptionAvailable()) {
            try {
              this.clientId = decrypt(data.clientId);
              this.clientSecret = decrypt(data.clientSecret);
            } catch {
              mainLogger.error(
                'Failed to decrypt credentials, they may be corrupted',
                'GoogleDrive'
              );
              this.clientId = '';
              this.clientSecret = '';
            }
          } else {
            mainLogger.warn('safeStorage not available, cannot decrypt credentials', 'GoogleDrive');
          }
        } else {
          this.clientId = data.clientId || '';
          this.clientSecret = data.clientSecret || '';
          if (this.clientId && this.clientSecret) {
            resavePlainCredentials(this.clientId, this.clientSecret);
          }
        }
      }
    } catch (error) {
      mainLogger.error('Credentials load error', 'GoogleDrive', error);
    }
  }

  saveCredentials(clientId: string, clientSecret: string): void {
    this.clientId = clientId;
    this.clientSecret = clientSecret;

    if (safeStorage.isEncryptionAvailable()) {
      writeEncryptedFile(this.configPath, {
        clientId: encrypt(clientId),
        clientSecret: encrypt(clientSecret),
      });
    } else {
      throw new UserFacingError(t('main.gdrive.encryptionUnavailable'));
    }
  }

  loadToken(client: OAuth2Client): void {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const raw: unknown = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
        const stored = encryptedTokenFileSchema.safeParse(raw);

        if (stored.success) {
          if (safeStorage.isEncryptionAvailable()) {
            try {
              const decryptedToken = decrypt(stored.data.token);
              client.setCredentials(tokenSchema.parse(JSON.parse(decryptedToken)));
            } catch {
              mainLogger.error('Failed to decrypt token', 'GoogleDrive');
            }
          }
        } else {
          const tokens = tokenSchema.parse(raw);
          client.setCredentials(tokens);
          this.saveToken(tokens);
        }
      }
    } catch (error) {
      mainLogger.error('Token load error', 'GoogleDrive', error);
    }
  }

  saveToken(tokens: object): void {
    if (safeStorage.isEncryptionAvailable()) {
      writeEncryptedFile(this.tokenPath, { token: encrypt(JSON.stringify(tokens)) });
    } else {
      mainLogger.warn(
        'safeStorage not available, token will not be persisted. Re-authentication will be required on next launch.',
        'GoogleDrive'
      );
    }
  }

  removeToken(): void {
    if (fs.existsSync(this.tokenPath)) {
      fs.unlinkSync(this.tokenPath);
    }
  }
}
