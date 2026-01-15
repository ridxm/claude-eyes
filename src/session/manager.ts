import { chromium, Browser, BrowserContext, Page } from 'playwright';
import {
  ConsoleLogEntry,
  NetworkRequestEntry,
  ConsoleFilter,
  NetworkFilter,
  SessionConfig,
} from './types.js';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function parseViewport(viewport: string): { width: number; height: number } {
  const [width, height] = viewport.split('x').map(Number);
  return { width: width || 1280, height: height || 720 };
}

function getConfig(): SessionConfig {
  return {
    headless: process.env.HEADLESS !== 'false',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.TIMEOUT || '30000', 10),
    viewport: parseViewport(process.env.VIEWPORT || '1280x720'),
  };
}

class SessionManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: SessionConfig;

  private consoleLogs: ConsoleLogEntry[] = [];
  private networkRequests: NetworkRequestEntry[] = [];
  private screenshots: Map<string, Buffer> = new Map();
  private domSnapshots: Map<string, string> = new Map();

  constructor() {
    this.config = getConfig();
  }

  async ensureBrowser(): Promise<Page> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.config.headless,
      });
      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
      });
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(this.config.timeout);
      this.attachListeners(this.page);
    }
    return this.page!;
  }

  private attachListeners(page: Page): void {
    page.on('console', (msg) => {
      const type = msg.type() as ConsoleLogEntry['type'];
      const location = msg.location();

      this.consoleLogs.push({
        type,
        text: msg.text(),
        timestamp: Date.now(),
        location: location.url ? {
          url: location.url,
          lineNumber: location.lineNumber,
          columnNumber: location.columnNumber,
        } : undefined,
      });
    });

    page.on('request', (request) => {
      const entry: NetworkRequestEntry = {
        id: generateId(),
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData() ?? undefined,
        resourceType: request.resourceType(),
        timestamp: Date.now(),
      };
      this.networkRequests.push(entry);
    });

    page.on('response', async (response) => {
      const request = response.request();
      const entry = this.networkRequests.find(
        (r) => r.url === request.url() && r.method === request.method() && !r.response
      );

      if (entry) {
        entry.duration = Date.now() - entry.timestamp;
        entry.response = {
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
          body: await this.safeGetBody(response),
        };
      }
    });
  }

  private async safeGetBody(response: import('playwright').Response): Promise<string | undefined> {
    try {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('application/json') || contentType.includes('text/')) {
        const text = await response.text();
        if (text.length > 10000) {
          return text.substring(0, 10000) + '... [truncated]';
        }
        return text;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  getPage(): Page | null {
    return this.page;
  }

  getConfig(): SessionConfig {
    return this.config;
  }

  getConsoleLogs(filter?: ConsoleFilter): ConsoleLogEntry[] {
    let logs = [...this.consoleLogs];

    if (filter?.types && filter.types.length > 0) {
      logs = logs.filter((log) => filter.types!.includes(log.type));
    }

    if (filter?.since) {
      logs = logs.filter((log) => log.timestamp >= filter.since!);
    }

    if (filter?.search) {
      const searchLower = filter.search.toLowerCase();
      logs = logs.filter((log) => log.text.toLowerCase().includes(searchLower));
    }

    return logs;
  }

  clearConsoleLogs(): void {
    this.consoleLogs = [];
  }

  getNetworkRequests(filter?: NetworkFilter): NetworkRequestEntry[] {
    let requests = [...this.networkRequests];

    if (filter?.urlPattern) {
      const regex = new RegExp(filter.urlPattern);
      requests = requests.filter((r) => regex.test(r.url));
    }

    if (filter?.methods && filter.methods.length > 0) {
      const methodsUpper = filter.methods.map((m) => m.toUpperCase());
      requests = requests.filter((r) => methodsUpper.includes(r.method));
    }

    if (filter?.statusCodes && filter.statusCodes.length > 0) {
      requests = requests.filter((r) =>
        r.response && filter.statusCodes!.includes(r.response.status)
      );
    }

    if (filter?.failed) {
      requests = requests.filter((r) =>
        !r.response || r.response.status >= 400
      );
    }

    return requests;
  }

  clearNetworkRequests(): void {
    this.networkRequests = [];
  }

  storeScreenshot(name: string, buffer: Buffer): void {
    this.screenshots.set(name, buffer);
  }

  getScreenshot(name: string): Buffer | undefined {
    return this.screenshots.get(name);
  }

  listScreenshots(): string[] {
    return Array.from(this.screenshots.keys());
  }

  storeDomSnapshot(name: string, html: string): void {
    this.domSnapshots.set(name, html);
  }

  getDomSnapshot(name: string): string | undefined {
    return this.domSnapshots.get(name);
  }

  listDomSnapshots(): string[] {
    return Array.from(this.domSnapshots.keys());
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}

export const sessionManager = new SessionManager();
