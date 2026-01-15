import { z } from 'zod';
import { sessionManager } from '../session/manager.js';

export const getNetworkRequestsSchema = z.object({
  urlPattern: z
    .string()
    .optional()
    .describe('regex pattern to filter urls'),
  methods: z
    .array(z.string())
    .optional()
    .describe('http methods to include'),
  statusCodes: z
    .array(z.number())
    .optional()
    .describe('status codes to filter'),
  failed: z
    .boolean()
    .optional()
    .describe('only show failed requests (4xx, 5xx, or no response)'),
  limit: z
    .number()
    .optional()
    .default(20)
    .describe('maximum number of requests to return'),
});

export async function getNetworkRequests(args: z.infer<typeof getNetworkRequestsSchema>) {
  const requests = sessionManager.getNetworkRequests({
    urlPattern: args.urlPattern,
    methods: args.methods,
    statusCodes: args.statusCodes,
    failed: args.failed,
  });

  const limited = requests.slice(-args.limit!);

  if (limited.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'no network requests matching filters',
        },
      ],
    };
  }

  const formatted = limited
    .map((req) => {
      const status = req.response?.status ?? 'PENDING';
      const duration = req.duration ? `${req.duration}ms` : 'N/A';
      return `${req.method} ${req.url}\n  status: ${status}, duration: ${duration}`;
    })
    .join('\n\n');

  return {
    content: [
      {
        type: 'text' as const,
        text: `network requests (${limited.length}):\n\n${formatted}`,
      },
    ],
  };
}

export const getResponseBodySchema = z.object({
  urlPattern: z.string().describe('url pattern to match'),
  index: z
    .number()
    .optional()
    .default(-1)
    .describe('which matching request (-1 for latest)'),
});

export async function getResponseBody(args: z.infer<typeof getResponseBodySchema>) {
  const requests = sessionManager.getNetworkRequests({
    urlPattern: args.urlPattern,
  });

  if (requests.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: no requests matching "${args.urlPattern}"\nsuggestion: check the url pattern or trigger the request first`,
        },
      ],
    };
  }

  const index = args.index < 0 ? requests.length + args.index : args.index;
  const request = requests[index];

  if (!request) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: request index ${args.index} out of range (found ${requests.length} matching requests)`,
        },
      ],
    };
  }

  if (!request.response) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `request to ${request.url} is still pending`,
        },
      ],
    };
  }

  if (!request.response.body) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `no response body available for ${request.url}\nstatus: ${request.response.status}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: `response body for ${request.method} ${request.url}:\nstatus: ${request.response.status}\n\n${request.response.body}`,
      },
    ],
  };
}

export const clearNetworkSchema = z.object({});

export async function clearNetwork() {
  sessionManager.clearNetworkRequests();

  return {
    content: [
      {
        type: 'text' as const,
        text: 'network request buffer cleared',
      },
    ],
  };
}

export const waitForNetworkIdleSchema = z.object({
  timeout: z
    .number()
    .optional()
    .default(30000)
    .describe('timeout in ms'),
});

export async function waitForNetworkIdle(args: z.infer<typeof waitForNetworkIdleSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();
    await page.waitForLoadState('networkidle', { timeout: args.timeout });

    return {
      content: [
        {
          type: 'text' as const,
          text: 'network is idle',
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: ${message}\nsuggestion: network may have ongoing requests or timeout too short`,
        },
      ],
    };
  }
}
