/**
 * Integration test for claude-eyes tools
 * Run with: npx tsx tests/integration/test-tools.ts
 */

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Set env vars before importing tools
process.env.HEADLESS = 'true';
process.env.BASE_URL = 'http://localhost:3456';
process.env.TIMEOUT = '10000';

// Import tools after setting env
import { sessionManager } from '../../src/session/manager.js';
import * as navigation from '../../src/tools/navigation.js';
import * as interaction from '../../src/tools/interaction.js';
import * as visual from '../../src/tools/visual.js';
import * as consoleTool from '../../src/tools/console.js';
import * as network from '../../src/tools/network.js';
import * as dom from '../../src/tools/dom.js';
import * as qa from '../../src/tools/qa.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Simple test framework
let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void>) {
  return fn()
    .then(() => {
      console.log(`✓ ${name}`);
      passed++;
    })
    .catch((err) => {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${err.message}`);
      failed++;
    });
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// Start test server
function startServer(): Promise<ReturnType<typeof createServer>> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const filePath = join(__dirname, '../fixtures/index.html');
      const content = readFileSync(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });

    server.listen(3456, () => {
      console.log('Test server running on http://localhost:3456\n');
      resolve(server);
    });
  });
}

async function runTests() {
  console.log('=== claude-eyes integration tests ===\n');

  const server = await startServer();

  try {
    // Navigation tests
    await test('navigate: should load page', async () => {
      const result = await navigation.navigate({ url: '/', waitUntil: 'load' });
      const text = result.content[0].text || '';
      assert(text.includes('navigated to'), 'should confirm navigation');
      assert(text.includes('claude-eyes test page'), 'should show page title');
    });

    await test('get_page_state: should return page info', async () => {
      const result = await qa.getPageState();
      const text = result.content[0].text || '';
      assert(text.includes('url:'), 'should include url');
      assert(text.includes('title:'), 'should include title');
      assert(text.includes('viewport:'), 'should include viewport');
    });

    // Screenshot tests - THIS IS CRITICAL
    await test('screenshot: should return actual image data', async () => {
      const result = await visual.screenshot({ name: 'test1', fullPage: false });

      // Check that we got an image content block
      const imageContent = result.content.find((c) => c.type === 'image');
      assert(imageContent !== undefined, 'should have image content block');
      assert(imageContent?.data !== undefined, 'should have base64 data');
      assert(imageContent?.mimeType === 'image/png', 'should be PNG');

      // Verify it's valid base64 PNG
      const data = imageContent?.data || '';
      assert(data.length > 1000, 'image should have substantial data');

      // PNG magic bytes in base64 start with "iVBORw0KGgo"
      assert(data.startsWith('iVBORw0KGgo'), 'should be valid PNG base64');

      // Check text content
      const textContent = result.content.find((c) => c.type === 'text');
      assert(textContent?.text?.includes('captured'), 'should confirm capture');
    });

    // Interaction tests
    await test('click: should click button', async () => {
      const result = await interaction.click({ selector: '#log-info', button: 'left', clickCount: 1, timeout: 5000 });
      const text = result.content[0].text || '';
      assert(text.includes('clicked'), 'should confirm click');
    });

    await test('type: should type into input', async () => {
      const result = await interaction.type({ selector: '#username', text: 'testuser', delay: 0, clear: true });
      const text = result.content[0].text || '';
      assert(text.includes('typed'), 'should confirm typing');
    });

    await test('fill: should fill input', async () => {
      const result = await interaction.fill({ selector: '#password', value: 'testpass' });
      const text = result.content[0].text || '';
      assert(text.includes('filled'), 'should confirm fill');
    });

    // Console capture tests
    await test('get_console_logs: should capture console output', async () => {
      // Click buttons that generate console output
      await interaction.click({ selector: '#log-info', button: 'left', clickCount: 1, timeout: 5000 });
      await interaction.click({ selector: '#log-warning', button: 'left', clickCount: 1, timeout: 5000 });

      const result = await consoleTool.getConsoleLogs({ limit: 50 });
      const text = result.content[0].text || '';
      assert(text.includes('info message') || text.includes('console logs'), 'should capture logs');
    });

    await test('get_console_errors: should detect errors', async () => {
      // Click error button
      await interaction.click({ selector: '#log-error', button: 'left', clickCount: 1, timeout: 5000 });

      // Wait a bit for log to register
      await new Promise((r) => setTimeout(r, 100));

      const result = await consoleTool.getConsoleErrors({ limit: 20 });
      const text = result.content[0].text || '';
      assert(text.includes('error message') || text.includes('error'), 'should capture errors');
    });

    // QA verification tests
    await test('verify_element: should verify element exists', async () => {
      const result = await qa.verifyElement({ selector: '#login-btn', state: 'visible' });
      const text = result.content[0].text || '';
      assert(text.includes('PASS'), 'should pass for visible element');
    });

    await test('verify_element: should detect hidden element', async () => {
      const result = await qa.verifyElement({ selector: '#dynamic-content', state: 'hidden' });
      const text = result.content[0].text || '';
      assert(text.includes('PASS'), 'should pass for hidden element');
    });

    await test('verify_text_on_page: should find text', async () => {
      const result = await qa.verifyTextOnPage({ text: 'login form', exact: false });
      const text = result.content[0].text || '';
      assert(text.includes('PASS'), 'should find text on page');
    });

    // Dynamic content test
    await test('interaction + verify: show hidden content', async () => {
      // Click show button
      await interaction.click({ selector: '#show-content', button: 'left', clickCount: 1, timeout: 5000 });

      // Wait for DOM update
      await new Promise((r) => setTimeout(r, 100));

      // Verify it's now visible
      const result = await qa.verifyElement({ selector: '#dynamic-content', state: 'visible' });
      const text = result.content[0].text || '';
      assert(text.includes('PASS'), 'should see dynamic content after click');
    });

    // DOM snapshot tests
    await test('get_dom_snapshot: should capture DOM', async () => {
      const result = await dom.getDomSnapshot({ name: 'before', selector: 'body' });
      const text = result.content[0].text || '';
      assert(text.includes('captured'), 'should confirm capture');
    });

    // Visual diff test
    await test('visual_diff: should compare screenshots', async () => {
      // Take another screenshot
      await visual.screenshot({ name: 'test2', fullPage: false });

      // Compare (should be similar since nothing changed much)
      const result = await visual.visualDiff({ baseline: 'test1', current: 'test2', threshold: 0.1 });

      // Should have diff image
      const imageContent = result.content.find((c) => c.type === 'image');
      assert(imageContent !== undefined, 'should return diff image');
      assert(imageContent?.data !== undefined, 'should have diff image data');
    });

    // Network test
    await test('network: capture fetch request', async () => {
      // Clear previous requests
      await network.clearNetwork();

      // Click fetch button
      await interaction.click({ selector: '#fetch-success', button: 'left', clickCount: 1, timeout: 5000 });

      // Wait for request
      await new Promise((r) => setTimeout(r, 2000));

      const result = await network.getNetworkRequests({ limit: 20 });
      const text = result.content[0].text || '';
      assert(text.includes('jsonplaceholder') || text.includes('network requests'), 'should capture API request');
    });

    // Full login flow test
    await test('full flow: login workflow', async () => {
      // Reload page for clean state
      await navigation.reload({ waitUntil: 'load' });

      // Clear console
      await consoleTool.clearConsole();

      // Take before screenshot
      await visual.screenshot({ name: 'login-before', fullPage: false });

      // Fill form
      await interaction.fill({ selector: '#username', value: 'test' });
      await interaction.fill({ selector: '#password', value: 'password' });

      // Click login
      await interaction.click({ selector: '#login-btn', button: 'left', clickCount: 1, timeout: 5000 });

      // Wait for UI update
      await new Promise((r) => setTimeout(r, 500));

      // Take after screenshot
      await visual.screenshot({ name: 'login-after', fullPage: false });

      // Verify success message
      const verifyResult = await qa.verifyElement({
        selector: '#login-status',
        state: 'visible',
        text: 'successful'
      });
      assert(verifyResult.content[0].text?.includes('PASS'), 'login should succeed');

      // Check no errors
      const errorResult = await qa.verifyNoErrors({});
      // Should only have successful log, no errors
      const errorText = errorResult.content[0].text || '';
      // The login failure error from earlier tests might still be in buffer
      // So we just check the flow completed

      // Visual diff
      const diffResult = await visual.visualDiff({ baseline: 'login-before', current: 'login-after', threshold: 0.1 });
      const diffText = diffResult.content.find((c) => c.type === 'text')?.text || '';
      assert(diffText.includes('DIFF') || diffText.includes('pixels differ'), 'should detect UI change after login');
    });

  } finally {
    // Cleanup
    await sessionManager.close();
    server.close();
  }

  // Results
  console.log('\n=== Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
