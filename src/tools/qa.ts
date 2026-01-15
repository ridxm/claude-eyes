import { z } from 'zod';
import { sessionManager } from '../session/manager.js';

export const getPageStateSchema = z.object({});

export async function getPageState() {
  try {
    const page = await sessionManager.ensureBrowser();
    const config = sessionManager.getConfig();

    const url = page.url();
    const title = await page.title();

    const errors = sessionManager.getConsoleLogs({ types: ['error'] });
    const recentErrors = errors.slice(-5);

    const viewport = page.viewportSize();

    const lines = [
      `url: ${url}`,
      `title: "${title}"`,
      `viewport: ${viewport?.width}x${viewport?.height}`,
      `console errors: ${errors.length}`,
    ];

    if (recentErrors.length > 0) {
      lines.push('');
      lines.push('recent errors:');
      for (const err of recentErrors) {
        lines.push(`  - ${err.text.substring(0, 100)}`);
      }
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: lines.join('\n'),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: ${message}\nsuggestion: navigate to a page first`,
        },
      ],
    };
  }
}

export const verifyNoErrorsSchema = z.object({
  since: z
    .number()
    .optional()
    .describe('only check errors since this timestamp'),
  ignorePatterns: z
    .array(z.string())
    .optional()
    .describe('regex patterns for errors to ignore'),
});

export async function verifyNoErrors(args: z.infer<typeof verifyNoErrorsSchema>) {
  let errors = sessionManager.getConsoleLogs({
    types: ['error'],
    since: args.since,
  });

  if (args.ignorePatterns && args.ignorePatterns.length > 0) {
    const patterns = args.ignorePatterns.map((p) => new RegExp(p));
    errors = errors.filter((e) => !patterns.some((p) => p.test(e.text)));
  }

  if (errors.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'PASS: no console errors detected',
        },
      ],
    };
  }

  const errorList = errors
    .slice(0, 10)
    .map((e) => `- ${e.text.substring(0, 100)}`)
    .join('\n');

  return {
    content: [
      {
        type: 'text' as const,
        text: `FAIL: ${errors.length} console error(s) detected\n\n${errorList}${errors.length > 10 ? `\n... and ${errors.length - 10} more` : ''}`,
      },
    ],
  };
}

export const verifyElementSchema = z.object({
  selector: z.string().describe('css selector to verify'),
  state: z
    .enum(['visible', 'hidden', 'exists', 'not-exists'])
    .optional()
    .default('visible')
    .describe('expected element state'),
  text: z
    .string()
    .optional()
    .describe('expected text content'),
  attribute: z
    .object({
      name: z.string(),
      value: z.string().optional(),
    })
    .optional()
    .describe('expected attribute'),
});

export async function verifyElement(args: z.infer<typeof verifyElementSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();
    const locator = page.locator(args.selector);

    let stateResult: { pass: boolean; message: string };

    switch (args.state) {
      case 'visible': {
        const isVisible = await locator.isVisible();
        stateResult = {
          pass: isVisible,
          message: isVisible ? 'element is visible' : 'element is NOT visible',
        };
        break;
      }
      case 'hidden': {
        const isHidden = await locator.isHidden();
        stateResult = {
          pass: isHidden,
          message: isHidden ? 'element is hidden' : 'element is NOT hidden',
        };
        break;
      }
      case 'exists': {
        const count = await locator.count();
        stateResult = {
          pass: count > 0,
          message: count > 0 ? `element exists (${count} found)` : 'element does NOT exist',
        };
        break;
      }
      case 'not-exists': {
        const notCount = await locator.count();
        stateResult = {
          pass: notCount === 0,
          message:
            notCount === 0
              ? 'element does not exist (as expected)'
              : `element unexpectedly exists (${notCount} found)`,
        };
        break;
      }
      default:
        stateResult = { pass: false, message: 'unknown state' };
    }

    if (args.text && stateResult.pass) {
      const actualText = await locator.textContent();
      const textMatch = actualText?.includes(args.text);
      stateResult.pass = textMatch ?? false;
      stateResult.message += textMatch
        ? ` and contains expected text`
        : ` but does NOT contain expected text "${args.text}"`;
    }

    if (args.attribute && stateResult.pass) {
      const attrValue = await locator.getAttribute(args.attribute.name);
      if (args.attribute.value !== undefined) {
        const attrMatch = attrValue === args.attribute.value;
        stateResult.pass = attrMatch;
        stateResult.message += attrMatch
          ? ` and has ${args.attribute.name}="${args.attribute.value}"`
          : ` but ${args.attribute.name} is "${attrValue}" (expected "${args.attribute.value}")`;
      } else {
        const hasAttr = attrValue !== null;
        stateResult.pass = hasAttr;
        stateResult.message += hasAttr
          ? ` and has attribute ${args.attribute.name}`
          : ` but does NOT have attribute ${args.attribute.name}`;
      }
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `${stateResult.pass ? 'PASS' : 'FAIL'}: ${stateResult.message}`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: ${message}\nsuggestion: check if the selector is correct`,
        },
      ],
    };
  }
}

export const verifyRequestSucceededSchema = z.object({
  urlPattern: z.string().describe('url pattern to check'),
  expectedStatus: z
    .number()
    .optional()
    .default(200)
    .describe('expected http status code'),
});

export async function verifyRequestSucceeded(args: z.infer<typeof verifyRequestSucceededSchema>) {
  const requests = sessionManager.getNetworkRequests({
    urlPattern: args.urlPattern,
  });

  if (requests.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `FAIL: no requests matching "${args.urlPattern}" found\nsuggestion: trigger the action that makes this request first`,
        },
      ],
    };
  }

  const latest = requests[requests.length - 1];

  if (!latest.response) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `PENDING: request to ${latest.url} is still in progress`,
        },
      ],
    };
  }

  const passed = latest.response.status === args.expectedStatus;

  return {
    content: [
      {
        type: 'text' as const,
        text: passed
          ? `PASS: request to ${latest.url} returned ${latest.response.status}`
          : `FAIL: request to ${latest.url} returned ${latest.response.status}, expected ${args.expectedStatus}`,
      },
    ],
  };
}

export const verifyTextOnPageSchema = z.object({
  text: z.string().describe('text to find on the page'),
  exact: z
    .boolean()
    .optional()
    .default(false)
    .describe('require exact match'),
});

export async function verifyTextOnPage(args: z.infer<typeof verifyTextOnPageSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();

    const bodyText = await page.evaluate(() => document.body.innerText);

    const found = args.exact
      ? bodyText.includes(args.text)
      : bodyText.toLowerCase().includes(args.text.toLowerCase());

    return {
      content: [
        {
          type: 'text' as const,
          text: found
            ? `PASS: text "${args.text}" found on page`
            : `FAIL: text "${args.text}" not found on page`,
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
