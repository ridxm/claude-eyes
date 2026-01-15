/**
 * Debug test to inspect actual tool output
 */

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

process.env.HEADLESS = 'true';
process.env.BASE_URL = 'http://localhost:3457';
process.env.TIMEOUT = '10000';

import { sessionManager } from '../../src/session/manager.js';
import * as navigation from '../../src/tools/navigation.js';
import * as visual from '../../src/tools/visual.js';
import * as interaction from '../../src/tools/interaction.js';
import * as qa from '../../src/tools/qa.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function debug() {
  // Start server
  const server = createServer((req, res) => {
    const filePath = join(__dirname, '../fixtures/index.html');
    const content = readFileSync(filePath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  });

  await new Promise<void>((resolve) => server.listen(3457, resolve));
  console.log('Server running on http://localhost:3457\n');

  try {
    // Test navigate
    console.log('=== NAVIGATE ===');
    const navResult = await navigation.navigate({ url: '/', waitUntil: 'load' });
    console.log('Content:', JSON.stringify(navResult.content, null, 2));
    console.log();

    // Test screenshot
    console.log('=== SCREENSHOT ===');
    const ssResult = await visual.screenshot({ name: 'debug', fullPage: false });
    console.log('Content types:', ssResult.content.map(c => c.type));
    if (ssResult.content[0]?.type === 'image') {
      const data = (ssResult.content[0] as { data: string }).data;
      console.log('Image data length:', data?.length);
      console.log('Image data starts with:', data?.substring(0, 50));
    }
    console.log('Text content:', ssResult.content.find(c => c.type === 'text'));
    console.log();

    // Test click
    console.log('=== CLICK ===');
    const clickResult = await interaction.click({ selector: '#login-btn', button: 'left', clickCount: 1, timeout: 5000 });
    console.log('Content:', JSON.stringify(clickResult.content, null, 2));
    console.log();

    // Test verify_element
    console.log('=== VERIFY ELEMENT ===');
    const verifyResult = await qa.verifyElement({ selector: '#login-btn', state: 'visible' });
    console.log('Content:', JSON.stringify(verifyResult.content, null, 2));
    console.log();

    // Test get_page_state
    console.log('=== PAGE STATE ===');
    const stateResult = await qa.getPageState();
    console.log('Content:', JSON.stringify(stateResult.content, null, 2));

  } finally {
    await sessionManager.close();
    server.close();
  }
}

debug().catch(console.error);
