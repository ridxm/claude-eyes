import { z } from 'zod';
import { sessionManager } from '../session/manager.js';

export const clickSchema = z.object({
  selector: z.string().describe('css selector or text to click'),
  button: z
    .enum(['left', 'right', 'middle'])
    .optional()
    .default('left')
    .describe('mouse button to use'),
  clickCount: z
    .number()
    .optional()
    .default(1)
    .describe('number of clicks'),
  timeout: z
    .number()
    .optional()
    .default(5000)
    .describe('timeout in ms'),
});

export async function click(args: z.infer<typeof clickSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();

    await page.click(args.selector, {
      button: args.button,
      clickCount: args.clickCount,
      timeout: args.timeout,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `clicked "${args.selector}"`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: ${message}\nsuggestion: check if the selector is correct or use wait_for_element first`,
        },
      ],
    };
  }
}

export const typeSchema = z.object({
  selector: z.string().describe('css selector of input element'),
  text: z.string().describe('text to type'),
  delay: z
    .number()
    .optional()
    .default(0)
    .describe('delay between keystrokes in ms'),
  clear: z
    .boolean()
    .optional()
    .default(false)
    .describe('clear existing text first'),
});

export async function type(args: z.infer<typeof typeSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();

    if (args.clear) {
      await page.fill(args.selector, '');
    }

    await page.type(args.selector, args.text, { delay: args.delay });

    return {
      content: [
        {
          type: 'text' as const,
          text: `typed "${args.text}" into "${args.selector}"`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: ${message}\nsuggestion: check if the selector points to an input element`,
        },
      ],
    };
  }
}

export const fillSchema = z.object({
  selector: z.string().describe('css selector of input element'),
  value: z.string().describe('value to fill'),
});

export async function fill(args: z.infer<typeof fillSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();
    await page.fill(args.selector, args.value);

    return {
      content: [
        {
          type: 'text' as const,
          text: `filled "${args.selector}" with "${args.value}"`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: ${message}\nsuggestion: check if the selector points to an input element`,
        },
      ],
    };
  }
}

export const scrollSchema = z.object({
  selector: z
    .string()
    .optional()
    .describe('element to scroll into view'),
  x: z.number().optional().describe('horizontal scroll amount in pixels'),
  y: z.number().optional().describe('vertical scroll amount in pixels'),
});

export async function scroll(args: z.infer<typeof scrollSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();

    if (args.selector) {
      await page.locator(args.selector).scrollIntoViewIfNeeded();
      return {
        content: [
          {
            type: 'text' as const,
            text: `scrolled "${args.selector}" into view`,
          },
        ],
      };
    }

    if (args.x !== undefined || args.y !== undefined) {
      await page.evaluate(
        ({ x, y }) => {
          window.scrollBy(x || 0, y || 0);
        },
        { x: args.x, y: args.y }
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: `scrolled by x:${args.x || 0}, y:${args.y || 0}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: 'error: provide either selector or x/y coordinates',
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

export const waitForElementSchema = z.object({
  selector: z.string().describe('css selector to wait for'),
  state: z
    .enum(['attached', 'detached', 'visible', 'hidden'])
    .optional()
    .default('visible')
    .describe('expected element state'),
  timeout: z
    .number()
    .optional()
    .default(10000)
    .describe('timeout in ms'),
});

export async function waitForElement(args: z.infer<typeof waitForElementSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();

    await page.locator(args.selector).waitFor({
      state: args.state,
      timeout: args.timeout,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `element "${args.selector}" is ${args.state}`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: ${message}\nsuggestion: element may not exist or state may never be reached`,
        },
      ],
    };
  }
}

export const hoverSchema = z.object({
  selector: z.string().describe('css selector to hover over'),
  timeout: z
    .number()
    .optional()
    .default(5000)
    .describe('timeout in ms'),
});

export async function hover(args: z.infer<typeof hoverSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();
    await page.hover(args.selector, { timeout: args.timeout });

    return {
      content: [
        {
          type: 'text' as const,
          text: `hovering over "${args.selector}"`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: ${message}\nsuggestion: check if the selector exists`,
        },
      ],
    };
  }
}

export const selectSchema = z.object({
  selector: z.string().describe('css selector of select element'),
  value: z.string().describe('value to select'),
});

export async function select(args: z.infer<typeof selectSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();
    await page.selectOption(args.selector, args.value);

    return {
      content: [
        {
          type: 'text' as const,
          text: `selected "${args.value}" in "${args.selector}"`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: ${message}\nsuggestion: check if the selector points to a select element`,
        },
      ],
    };
  }
}
