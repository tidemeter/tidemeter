import type { PageEvent, AnalyticsRepository } from "@tidemeter/analytics";
import { getAnalyticsRepository } from "@/lib/analytics";

const FLUSH_SIZE = 100;
const FLUSH_INTERVAL_MS = 5000;
const MAX_BUFFER_SIZE = 10_000;

class EventBuffer {
  private buffer: PageEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  constructor() {
    this.startTimer();

    // Graceful shutdown
    if (typeof process !== "undefined") {
      process.on("SIGTERM", () => this.flush());
      process.on("SIGINT", () => this.flush());
    }
  }

  add(event: PageEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= FLUSH_SIZE) {
      this.flush();
    }
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, FLUSH_INTERVAL_MS);

    // Don't prevent Node.js from exiting
    if (this.timer && typeof this.timer === "object" && "unref" in this.timer) {
      this.timer.unref();
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;
    this.flushing = true;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      const repo = await getAnalyticsRepository();
      await repo.insertEvents(events);
    } catch (error) {
      console.error(
        `[EventBuffer] Failed to flush ${events.length} events:`,
        error,
      );
      // Put events back in buffer for retry, but cap to prevent OOM
      this.buffer.unshift(...events);
      if (this.buffer.length > MAX_BUFFER_SIZE) {
        const dropped = this.buffer.length - MAX_BUFFER_SIZE;
        this.buffer = this.buffer.slice(0, MAX_BUFFER_SIZE);
        console.warn(
          `[EventBuffer] Dropped ${dropped} oldest events (buffer full)`,
        );
      }
    } finally {
      this.flushing = false;
    }
  }
}

export const eventBuffer = new EventBuffer();
