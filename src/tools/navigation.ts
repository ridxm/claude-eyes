import { z } from 'zod';
import { sessionManager } from '../session/manager.js';

export const navigateSchema = z.object({
  url: z.string().describe('the url to navigate to'),
  waitUntil: z
    .enum(['load', 'domcontentloaded', 'networkidle'])
    .optional()
    .default('load')
    .describe('when to consider navigation complete'),
});

export async function navigate(args: z.infer<typeof navigateSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();
    const config = sessionManager.getConfig();

    let url = args.url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = config.baseUrl + (url.startsWith('/') ? url : '/' + url);
    }

    await page.goto(url, { waitUntil: args.waitUntil });

    const title = await page.title();
    const currentUrl = page.url();

    return {
      content: [
        {
          type: 'text' as const,
          text: `navigated to ${currentUrl}\ntitle: "${title}"`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: ${message}\nsuggestion: check if the url is correct and the server is running`,
        },
      ],
    };
  }
}

export const reloadSchema = z.object({
  waitUntil: z
    .enum(['load', 'domcontentloaded', 'networkidle'])
    .optional()
    .default('load')
    .describe('when to consider reload complete'),
});

export async function reload(args: z.infer<typeof reloadSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();
    await page.reload({ waitUntil: args.waitUntil });

    const title = await page.title();
    const url = page.url();

    return {
      content: [
        {
          type: 'text' as const,
          text: `page reloaded\nurl: ${url}\ntitle: "${title}"`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: ${message}`,
        },
      ],
    };
  }
}

export const goBackSchema = z.object({});

export async function goBack() {
  try {
    const page = await sessionManager.ensureBrowser();
    const response = await page.goBack();

    if (!response) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'error: no previous page in history\nsuggestion: navigate to a page first',
          },
        ],
      };
    }

    const title = await page.title();
    const url = page.url();

    return {
      content: [
        {
          type: 'text' as const,
          text: `navigated back\nurl: ${url}\ntitle: "${title}"`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: ${message}`,
        },
      ],
    };
  }
}

export const goForwardSchema = z.object({});

export async function goForward() {
  try {
    const page = await sessionManager.ensureBrowser();
    const response = await page.goForward();

    if (!response) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'error: no next page in history',
          },
        ],
      };
    }

    const title = await page.title();
    const url = page.url();

    return {
      content: [
        {
          type: 'text' as const,
          text: `navigated forward\nurl: ${url}\ntitle: "${title}"`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: ${message}`,
        },
      ],
    };
  }
}
