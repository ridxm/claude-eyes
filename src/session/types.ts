export interface ConsoleLogEntry {
  type: 'log' | 'debug' | 'info' | 'error' | 'warning' | 'trace';
  text: string;
  timestamp: number;
  location?: {
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
}

export interface NetworkRequestEntry {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  resourceType: string;
  timestamp: number;
  duration?: number;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body?: string;
  };
}

export interface ConsoleFilter {
  types?: ConsoleLogEntry['type'][];
  since?: number;
  search?: string;
}

export interface NetworkFilter {
  urlPattern?: string;
  methods?: string[];
  statusCodes?: number[];
  failed?: boolean;
}

export interface SessionConfig {
  headless: boolean;
  baseUrl: string;
  timeout: number;
  viewport: {
    width: number;
    height: number;
  };
}
