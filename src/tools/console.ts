import { z } from 'zod';
import { sessionManager } from '../session/manager.js';

export const getConsoleLogsSchema = z.object({
  types: z
    .array(z.enum(['log', 'debug', 'info', 'error', 'warning', 'trace']))
    .optional()
    .describe('filter by log types'),
  since: z
    .number()
    .optional()
    .describe('only logs after this timestamp'),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe('maximum number of logs to return'),
  search: z
    .string()
    .optional()
    .describe('search text within log messages'),
});

export async function getConsoleLogs(args: z.infer<typeof getConsoleLogsSchema>) {
  const logs = sessionManager.getConsoleLogs({
    types: args.types,
    since: args.since,
    search: args.search,
  });

  const limited = logs.slice(-args.limit!);

  if (limited.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'no console logs matching filters',
        },
      ],
    };
  }

  const formatted = limited
    .map((log) => {
      const time = new Date(log.timestamp).toISOString().split('T')[1].split('.')[0];
      return `[${log.type.toUpperCase()}] ${time}: ${log.text}`;
    })
    .join('\n');

  return {
    content: [
      {
        type: 'text' as const,
        text: `console logs (${limited.length} entries):\n\n${formatted}`,
      },
    ],
  };
}

export const clearConsoleSchema = z.object({});

export async function clearConsole() {
  sessionManager.clearConsoleLogs();

  return {
    content: [
      {
        type: 'text' as const,
        text: 'console log buffer cleared',
      },
    ],
  };
}

export const getConsoleErrorsSchema = z.object({
  limit: z
    .number()
    .optional()
    .default(20)
    .describe('maximum number of errors to return'),
});

export async function getConsoleErrors(args: z.infer<typeof getConsoleErrorsSchema>) {
  const logs = sessionManager.getConsoleLogs({
    types: ['error'],
  });

  const limited = logs.slice(-args.limit!);

  if (limited.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'no console errors',
        },
      ],
    };
  }

  const formatted = limited
    .map((log) => {
      const time = new Date(log.timestamp).toISOString().split('T')[1].split('.')[0];
      let text = `[${time}] ${log.text}`;
      if (log.location) {
        text += `\n  at ${log.location.url}:${log.location.lineNumber}:${log.location.columnNumber}`;
      }
      return text;
    })
    .join('\n\n');

  return {
    content: [
      {
        type: 'text' as const,
        text: `console errors (${limited.length}):\n\n${formatted}`,
      },
    ],
  };
}
