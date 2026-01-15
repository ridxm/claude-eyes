#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';
import { sessionManager } from './session/manager.js';

const server = new Server(
  {
    name: 'claude-eyes',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

registerTools(server);

process.on('SIGINT', async () => {
  await sessionManager.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await sessionManager.close();
  process.exit(0);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('claude-eyes server started');
}

main().catch((err) => {
  console.error('fatal error:', err);
  process.exit(1);
});
