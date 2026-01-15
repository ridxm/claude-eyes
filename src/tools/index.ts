import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import * as navigation from './navigation.js';
import * as interaction from './interaction.js';
import * as visual from './visual.js';
import * as consoleTool from './console.js';
import * as network from './network.js';
import * as dom from './dom.js';
import * as qa from './qa.js';

type ContentItem = { type: string; text?: string; data?: string; mimeType?: string };
type ToolHandler = (args: unknown) => Promise<{ content: ContentItem[] }>;

interface Tool {
  description: string;
  schema: import('zod').ZodType;
  handler: ToolHandler;
}

function wrapHandler<T>(fn: (args: T) => Promise<{ content: ContentItem[] }>): ToolHandler {
  return fn as unknown as ToolHandler;
}

const tools: Record<string, Tool> = {
  navigate: {
    description: 'navigate to a url',
    schema: navigation.navigateSchema,
    handler: wrapHandler(navigation.navigate),
  },
  reload: {
    description: 'reload the current page',
    schema: navigation.reloadSchema,
    handler: wrapHandler(navigation.reload),
  },
  go_back: {
    description: 'navigate back in browser history',
    schema: navigation.goBackSchema,
    handler: wrapHandler(navigation.goBack),
  },
  go_forward: {
    description: 'navigate forward in browser history',
    schema: navigation.goForwardSchema,
    handler: wrapHandler(navigation.goForward),
  },
  click: {
    description: 'click an element',
    schema: interaction.clickSchema,
    handler: wrapHandler(interaction.click),
  },
  type: {
    description: 'type text into an element',
    schema: interaction.typeSchema,
    handler: wrapHandler(interaction.type),
  },
  fill: {
    description: 'fill an input with a value (clears first)',
    schema: interaction.fillSchema,
    handler: wrapHandler(interaction.fill),
  },
  scroll: {
    description: 'scroll the page or an element into view',
    schema: interaction.scrollSchema,
    handler: wrapHandler(interaction.scroll),
  },
  wait_for_element: {
    description: 'wait for an element to reach a state',
    schema: interaction.waitForElementSchema,
    handler: wrapHandler(interaction.waitForElement),
  },
  hover: {
    description: 'hover over an element',
    schema: interaction.hoverSchema,
    handler: wrapHandler(interaction.hover),
  },
  select: {
    description: 'select an option from a dropdown',
    schema: interaction.selectSchema,
    handler: wrapHandler(interaction.select),
  },
  screenshot: {
    description: 'capture a screenshot (returns image)',
    schema: visual.screenshotSchema,
    handler: wrapHandler(visual.screenshot),
  },
  visual_diff: {
    description: 'compare two screenshots (returns diff image)',
    schema: visual.visualDiffSchema,
    handler: wrapHandler(visual.visualDiff),
  },
  list_screenshots: {
    description: 'list stored screenshots',
    schema: visual.listScreenshotsSchema,
    handler: wrapHandler(visual.listScreenshots),
  },
  get_console_logs: {
    description: 'get browser console logs',
    schema: consoleTool.getConsoleLogsSchema,
    handler: wrapHandler(consoleTool.getConsoleLogs),
  },
  clear_console: {
    description: 'clear the console log buffer',
    schema: consoleTool.clearConsoleSchema,
    handler: wrapHandler(consoleTool.clearConsole),
  },
  get_console_errors: {
    description: 'get console errors only',
    schema: consoleTool.getConsoleErrorsSchema,
    handler: wrapHandler(consoleTool.getConsoleErrors),
  },
  get_network_requests: {
    description: 'get captured network requests',
    schema: network.getNetworkRequestsSchema,
    handler: wrapHandler(network.getNetworkRequests),
  },
  get_response_body: {
    description: 'get the response body of a request',
    schema: network.getResponseBodySchema,
    handler: wrapHandler(network.getResponseBody),
  },
  clear_network: {
    description: 'clear the network request buffer',
    schema: network.clearNetworkSchema,
    handler: wrapHandler(network.clearNetwork),
  },
  wait_for_network_idle: {
    description: 'wait until network is idle',
    schema: network.waitForNetworkIdleSchema,
    handler: wrapHandler(network.waitForNetworkIdle),
  },
  get_dom_snapshot: {
    description: 'capture a dom snapshot',
    schema: dom.getDomSnapshotSchema,
    handler: wrapHandler(dom.getDomSnapshot),
  },
  dom_diff: {
    description: 'compare two dom snapshots',
    schema: dom.domDiffSchema,
    handler: wrapHandler(dom.domDiff),
  },
  get_element_info: {
    description: 'get info about an element',
    schema: dom.getElementInfoSchema,
    handler: wrapHandler(dom.getElementInfo),
  },
  list_dom_snapshots: {
    description: 'list stored dom snapshots',
    schema: dom.listDomSnapshotsSchema,
    handler: wrapHandler(dom.listDomSnapshots),
  },
  get_page_state: {
    description: 'quick summary of current page (url, title, errors, viewport)',
    schema: qa.getPageStateSchema,
    handler: wrapHandler(qa.getPageState),
  },
  verify_no_errors: {
    description: 'verify no console errors exist',
    schema: qa.verifyNoErrorsSchema,
    handler: wrapHandler(qa.verifyNoErrors),
  },
  verify_element: {
    description: 'verify element state and content',
    schema: qa.verifyElementSchema,
    handler: wrapHandler(qa.verifyElement),
  },
  verify_request_succeeded: {
    description: 'verify a network request returned expected status',
    schema: qa.verifyRequestSucceededSchema,
    handler: wrapHandler(qa.verifyRequestSucceeded),
  },
  verify_text_on_page: {
    description: 'verify text exists on the page',
    schema: qa.verifyTextOnPageSchema,
    handler: wrapHandler(qa.verifyTextOnPage),
  },
};

function zodToJsonSchema(schema: import('zod').ZodType): Record<string, unknown> {
  // Simple conversion for MCP - just get the shape
  const def = (schema as unknown as { _def: { shape?: () => Record<string, unknown> } })._def;
  if (def?.shape) {
    const shape = def.shape();
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldDef = (value as unknown as { _def: { typeName: string; description?: string; defaultValue?: unknown } })._def;
      const isOptional = fieldDef?.typeName === 'ZodOptional' || fieldDef?.typeName === 'ZodDefault';

      if (!isOptional) {
        required.push(key);
      }

      properties[key] = {
        type: 'string', // simplified
        description: fieldDef?.description,
      };
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  return { type: 'object' };
}

export function registerTools(server: Server) {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Object.entries(tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.schema),
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = tools[name];

    if (!tool) {
      return {
        content: [
          {
            type: 'text',
            text: `error: unknown tool "${name}"`,
          },
        ],
      };
    }

    try {
      const validated = tool.schema.parse(args);
      return await tool.handler(validated);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: 'text',
            text: `error: ${message}`,
          },
        ],
      };
    }
  });
}
