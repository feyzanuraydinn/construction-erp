import { drive_v3 } from '@googleapis/drive';
import type { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import { t } from './i18n';
import { mainLogger } from './logger';
import { UserFacingError } from '../utils/userFacingError';
import { errorText } from '../utils/errorText';
import { DriveCredentialStore } from './drive/driveCredentialStore';
import { signInWithBrowser, type SignInResult } from './drive/driveSignIn';
import { formatDriveError } from './drive/driveErrors';
import { listInBackupFolder, type DriveFile } from './drive/driveBackupFolder';
import {
  deleteOldSnapshots,
  downloadToFile,
  findLatestFile,
  uploadLatestFile,
  uploadSnapshotFile,
} from './drive/driveFiles';

const AUTH_ERROR_PATTERN =
  /invalid_grant|invalid_token|unauthorized_client|Invalid Credentials|Token has been expired or revoked|No refresh token is set/i;

export function isAuthError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = error.response;
    if (
      typeof response === 'object' &&
      response !== null &&
      'status' in response &&
      response.status === 401
    ) {
      return true;
    }
    if (typeof response === 'object' && response !== null && 'data' in response) {
      if (AUTH_ERROR_PATTERN.test(JSON.stringify(response.data ?? ''))) return true;
    }
  }
  const message = errorText(error);
  return AUTH_ERROR_PATTERN.test(message);
}

class GoogleDriveService {
  private oauth2Client: OAuth2Client | null = null;
  private readonly store = new DriveCredentialStore();
  private authLostListeners: Array<() => void> = [];

  onAuthLost(listener: () => void): () => void {
    this.authLostListeners.push(listener);
    return () => {
      this.authLostListeners = this.authLostListeners.filter((l) => l !== listener);
    };
  }

  private handleError(error: unknown): string {
    if (isAuthError(error) && this.isConnected()) {
      this.oauth2Client?.setCredentials({});
      try {
        this.store.removeToken();
      } catch (unlinkError) {
        mainLogger.warn(
          'Could not remove the expired Drive token',
          'GoogleDrive',
          errorText(unlinkError)
        );
      }
      for (const listener of this.authLostListeners) listener();
    }
    return formatDriveError(error);
  }

  init(userDataPath: string): void {
    this.store.setLocation(userDataPath);
    this.store.loadCredentials((clientId, clientSecret) =>
      this.saveCredentials(clientId, clientSecret)
    );
    if (this.store.hasCredentials()) {
      this.initOAuth2Client();
    }
  }

  saveCredentials(clientId: string, clientSecret: string): void {
    this.store.saveCredentials(clientId, clientSecret);
    this.initOAuth2Client();
  }

  hasCredentials(): boolean {
    return this.store.hasCredentials();
  }

  private initOAuth2Client(): void {
    this.oauth2Client = this.store.createClient();
    this.store.loadToken(this.oauth2Client);
  }

  isConnected(): boolean {
    if (!this.oauth2Client) return false;
    const credentials = this.oauth2Client.credentials;
    return !!credentials && !!credentials.access_token;
  }

  async startAuth(): Promise<SignInResult> {
    if (!this.oauth2Client) {
      return { success: false, error: t('main.gdrive.configMissing') };
    }
    return signInWithBrowser(this.oauth2Client, (tokens) => this.store.saveToken(tokens));
  }

  async disconnect(): Promise<void> {
    if (this.oauth2Client?.credentials.access_token) {
      this.oauth2Client.revokeCredentials().catch((error: unknown) => {
        mainLogger.warn('Token revoke failed (continuing)', 'GoogleDrive', errorText(error));
      });
    }
    this.store.removeToken();
    this.oauth2Client = null;
    if (this.store.hasCredentials()) {
      this.initOAuth2Client();
    }
  }

  private connectedDrive(): drive_v3.Drive | null {
    if (!this.oauth2Client || !this.isConnected()) return null;
    return new drive_v3.Drive({ auth: this.oauth2Client });
  }

  async listBackups(): Promise<DriveFile[]> {
    const drive = this.connectedDrive();
    if (!drive) return [];
    try {
      return await listInBackupFolder(drive, '', 'modifiedTime desc', 1);
    } catch (error) {
      mainLogger.error('List error', 'GoogleDrive', error);
      this.handleError(error);
      return [];
    }
  }

  async getLatestFile(): Promise<DriveFile | null> {
    const drive = this.connectedDrive();
    if (!drive) return null;
    try {
      return await findLatestFile(drive);
    } catch (error) {
      mainLogger.error('getLatestFile error', 'GoogleDrive', error);
      throw new UserFacingError(this.handleError(error), { cause: error });
    }
  }

  async uploadLatest(
    filePath: string
  ): Promise<{ success: boolean; fileId?: string; modifiedTime?: string; error?: string }> {
    const drive = this.connectedDrive();
    if (!drive) return { success: false, error: t('main.gdrive.notConnected') };

    try {
      const uploaded = await uploadLatestFile(drive, filePath, () => this.getLatestFile());
      return { success: true, ...uploaded };
    } catch (error) {
      mainLogger.error('uploadLatest error', 'GoogleDrive', error);
      return { success: false, error: this.handleError(error) };
    }
  }

  async uploadSnapshot(filePath: string): Promise<{ success: boolean; error?: string }> {
    const drive = this.connectedDrive();
    if (!drive) return { success: false, error: t('main.gdrive.notConnected') };
    try {
      await uploadSnapshotFile(drive, filePath);
      return { success: true };
    } catch (error) {
      mainLogger.error('uploadSnapshot error', 'GoogleDrive', error);
      return { success: false, error: this.handleError(error) };
    }
  }

  async rotateSnapshots(keep: number): Promise<void> {
    const drive = this.connectedDrive();
    if (!drive) return;
    try {
      await deleteOldSnapshots(drive, keep);
    } catch (error) {
      mainLogger.error('rotateSnapshots error', 'GoogleDrive', error);
      this.handleError(error);
    }
  }

  async downloadFile(
    fileId: string,
    destPath: string
  ): Promise<{ success: boolean; error?: string }> {
    const drive = this.connectedDrive();
    if (!drive) return { success: false, error: t('main.gdrive.notConnected') };
    try {
      await downloadToFile(drive, fileId, destPath);
      return { success: true };
    } catch (error) {
      mainLogger.error('downloadFile error', 'GoogleDrive', error);
      fs.rmSync(destPath, { force: true });
      return { success: false, error: this.handleError(error) };
    }
  }

  async ping(): Promise<boolean> {
    const drive = this.connectedDrive();
    if (!drive) return false;
    try {
      await drive.about.get({ fields: 'user' });
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }
}

export const googleDriveService = new GoogleDriveService();
