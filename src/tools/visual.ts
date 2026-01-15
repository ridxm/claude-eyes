import { z } from 'zod';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';
import { sessionManager } from '../session/manager.js';

export const screenshotSchema = z.object({
  name: z.string().describe('name to identify this screenshot'),
  fullPage: z
    .boolean()
    .optional()
    .default(false)
    .describe('capture full page or just viewport'),
  selector: z
    .string()
    .optional()
    .describe('capture specific element only'),
});

export async function screenshot(args: z.infer<typeof screenshotSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();
    const config = sessionManager.getConfig();

    let buffer: Buffer;

    if (args.selector) {
      buffer = await page.locator(args.selector).screenshot();
    } else {
      buffer = await page.screenshot({ fullPage: args.fullPage });
    }

    sessionManager.storeScreenshot(args.name, buffer);

    const metadata = await sharp(buffer).metadata();
    const dimensions = `${metadata.width}x${metadata.height}`;

    return {
      content: [
        {
          type: 'image' as const,
          data: buffer.toString('base64'),
          mimeType: 'image/png',
        },
        {
          type: 'text' as const,
          text: `screenshot "${args.name}" captured (${dimensions})`,
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

export const visualDiffSchema = z.object({
  baseline: z.string().describe('name of baseline screenshot'),
  current: z.string().describe('name of current screenshot'),
  threshold: z
    .number()
    .optional()
    .default(0.1)
    .describe('pixel difference threshold (0-1)'),
});

export async function visualDiff(args: z.infer<typeof visualDiffSchema>) {
  try {
    const baseline = sessionManager.getScreenshot(args.baseline);
    const current = sessionManager.getScreenshot(args.current);

    if (!baseline) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `error: baseline screenshot "${args.baseline}" not found\nsuggestion: take a screenshot with name "${args.baseline}" first`,
          },
        ],
      };
    }

    if (!current) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `error: current screenshot "${args.current}" not found\nsuggestion: take a screenshot with name "${args.current}" first`,
          },
        ],
      };
    }

    const img1 = await sharp(baseline).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const img2 = await sharp(current).raw().ensureAlpha().toBuffer({ resolveWithObject: true });

    if (img1.info.width !== img2.info.width || img1.info.height !== img2.info.height) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `error: screenshots have different dimensions\nbaseline: ${img1.info.width}x${img1.info.height}\ncurrent: ${img2.info.width}x${img2.info.height}\nsuggestion: ensure both screenshots capture the same viewport/element`,
          },
        ],
      };
    }

    const { width, height } = img1.info;
    const diffBuffer = Buffer.alloc(width * height * 4);

    const numDiffPixels = pixelmatch(
      img1.data,
      img2.data,
      diffBuffer,
      width,
      height,
      { threshold: args.threshold }
    );

    const totalPixels = width * height;
    const diffPercent = (numDiffPixels / totalPixels) * 100;

    const diffPng = await sharp(diffBuffer, {
      raw: { width, height, channels: 4 },
    })
      .png()
      .toBuffer();

    const passed = diffPercent < 1;

    return {
      content: [
        {
          type: 'image' as const,
          data: diffPng.toString('base64'),
          mimeType: 'image/png',
        },
        {
          type: 'text' as const,
          text: `${passed ? 'PASS' : 'DIFF'}: ${numDiffPixels} pixels differ (${diffPercent.toFixed(2)}%)`,
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

export const listScreenshotsSchema = z.object({});

export async function listScreenshots() {
  const names = sessionManager.listScreenshots();

  if (names.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'no screenshots stored',
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: `stored screenshots:\n${names.map((n) => `- ${n}`).join('\n')}`,
      },
    ],
  };
}
