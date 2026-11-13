const FIRST_CHECK_DELAY_MS = 5000;
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const PING_INTERVAL_MS = 60 * 1000;

export class SyncScheduler {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private pingHandle: ReturnType<typeof setInterval> | null = null;

  start(check: () => void, ping: () => void): void {
    setTimeout(check, FIRST_CHECK_DELAY_MS);
    this.intervalHandle = setInterval(check, SYNC_INTERVAL_MS);
    this.pingHandle = setInterval(ping, PING_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    if (this.pingHandle) {
      clearInterval(this.pingHandle);
      this.pingHandle = null;
    }
  }
}
