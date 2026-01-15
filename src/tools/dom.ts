import { z } from 'zod';
import { sessionManager } from '../session/manager.js';

export const getDomSnapshotSchema = z.object({
  name: z.string().describe('name to identify this snapshot'),
  selector: z
    .string()
    .optional()
    .default('body')
    .describe('root element to snapshot'),
});

export async function getDomSnapshot(args: z.infer<typeof getDomSnapshotSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();

    const html = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el ? el.outerHTML : null;
    }, args.selector);

    if (!html) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `error: element not found: ${args.selector}\nsuggestion: check if the selector is correct`,
          },
        ],
      };
    }

    sessionManager.storeDomSnapshot(args.name, html);

    return {
      content: [
        {
          type: 'text' as const,
          text: `dom snapshot "${args.name}" captured (${html.length} chars)`,
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

export const domDiffSchema = z.object({
  baseline: z.string().describe('name of baseline snapshot'),
  current: z.string().describe('name of current snapshot'),
});

export async function domDiff(args: z.infer<typeof domDiffSchema>) {
  const baseline = sessionManager.getDomSnapshot(args.baseline);
  const current = sessionManager.getDomSnapshot(args.current);

  if (!baseline) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: baseline snapshot "${args.baseline}" not found\nsuggestion: capture a dom snapshot with name "${args.baseline}" first`,
        },
      ],
    };
  }

  if (!current) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `error: current snapshot "${args.current}" not found\nsuggestion: capture a dom snapshot with name "${args.current}" first`,
        },
      ],
    };
  }

  if (baseline === current) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'PASS: no dom differences detected',
        },
      ],
    };
  }

  const baselineLines = baseline.split('\n');
  const currentLines = current.split('\n');

  const added: string[] = [];
  const removed: string[] = [];

  const baselineSet = new Set(baselineLines.map((l) => l.trim()));
  const currentSet = new Set(currentLines.map((l) => l.trim()));

  for (const line of currentLines) {
    const trimmed = line.trim();
    if (trimmed && !baselineSet.has(trimmed)) {
      added.push(trimmed.substring(0, 100));
    }
  }

  for (const line of baselineLines) {
    const trimmed = line.trim();
    if (trimmed && !currentSet.has(trimmed)) {
      removed.push(trimmed.substring(0, 100));
    }
  }

  const changes: string[] = [];

  if (added.length > 0) {
    changes.push(`added (${added.length}):\n${added.slice(0, 10).map((l) => `+ ${l}`).join('\n')}`);
    if (added.length > 10) {
      changes.push(`... and ${added.length - 10} more additions`);
    }
  }

  if (removed.length > 0) {
    changes.push(`removed (${removed.length}):\n${removed.slice(0, 10).map((l) => `- ${l}`).join('\n')}`);
    if (removed.length > 10) {
      changes.push(`... and ${removed.length - 10} more removals`);
    }
  }

  const totalChanges = added.length + removed.length;

  return {
    content: [
      {
        type: 'text' as const,
        text: `DIFF: ${totalChanges} changes detected\n\n${changes.join('\n\n')}`,
      },
    ],
  };
}

export const getElementInfoSchema = z.object({
  selector: z.string().describe('css selector'),
});

export async function getElementInfo(args: z.infer<typeof getElementInfoSchema>) {
  try {
    const page = await sessionManager.ensureBrowser();

    const info = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);

      return {
        tagName: el.tagName.toLowerCase(),
        id: el.id || undefined,
        className: el.className || undefined,
        textContent: el.textContent?.trim().substring(0, 200) || undefined,
        attributes: Array.from(el.attributes).reduce(
          (acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          },
          {} as Record<string, string>
        ),
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        visible: styles.display !== 'none' && styles.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
      };
    }, args.selector);

    if (!info) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `error: element not found: ${args.selector}`,
          },
        ],
      };
    }

    const lines = [
      `element: <${info.tagName}${info.id ? ` id="${info.id}"` : ''}${info.className ? ` class="${info.className}"` : ''}>`,
      `visible: ${info.visible}`,
      `position: x=${info.rect.x}, y=${info.rect.y}`,
      `size: ${info.rect.width}x${info.rect.height}`,
    ];

    if (info.textContent) {
      lines.push(`text: "${info.textContent}"`);
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
          text: `error: ${message}`,
        },
      ],
    };
  }
}

export const listDomSnapshotsSchema = z.object({});

export async function listDomSnapshots() {
  const names = sessionManager.listDomSnapshots();

  if (names.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'no dom snapshots stored',
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: `stored dom snapshots:\n${names.map((n) => `- ${n}`).join('\n')}`,
      },
    ],
  };
}
