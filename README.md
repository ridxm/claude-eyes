# claude-eyes

[![npm version](https://img.shields.io/npm/v/claude-eyes)](https://www.npmjs.com/package/claude-eyes)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Give Claude Code eyes.**

An MCP server that lets Claude see screenshots, read console errors, and verify its own frontend fixes autonomously.

<p align="center">
  <img src="assets/claude-eyes.png" alt="claude-eyes in action" width="800">
</p>

---

## The Problem

Claude Code writes frontend code. But it can't see what it built.

Every time Claude makes a UI change, you become the middleman:

- *"Does the button show up?"*
- *"Is there a console error?"*
- *"Did the layout break?"*

You check the browser, copy-paste errors, describe what you see. Claude guesses what went wrong. Repeat.

**This back-and-forth shouldn't exist.**

## The Solution

claude-eyes gives Claude actual vision:

- **Screenshots** it can see (not file paths - actual images)
- **Console logs** it can read
- **Network requests** it can inspect
- **Page interactions** it can perform

Now when you say *"fix the login button"*, Claude writes the code, opens the browser, clicks the button, checks for errors, and confirms it works. One message. Done.

---

## Install

1. Install Playwright's browser:
```bash
npx playwright install chromium
```

2. Add to your `.mcp.json`:
```json
{
  "mcpServers": {
    "claude-eyes": {
      "command": "npx",
      "args": ["claude-eyes"]
    }
  }
}
```

3. Restart Claude Code.

---

## What Claude Can Do

| Capability | Tools |
|------------|-------|
| **See** | `screenshot`, `visual_diff` |
| **Read** | `get_console_logs`, `get_network_requests`, `get_page_state` |
| **Interact** | `click`, `type`, `scroll`, `hover`, `navigate` |
| **Verify** | `verify_no_errors`, `verify_element`, `verify_request_succeeded` |

26 tools total for autonomous visual QA.

---

## Example

**Without claude-eyes:**
```
You: "Fix the login button"
Claude: *writes code*
Claude: "I've updated the button. Can you check if it works?"
You: *opens browser, clicks around*
You: "There's a console error"
Claude: "Can you paste it?"
... 5 more messages ...
```

**With claude-eyes:**
```
You: "Fix the login button"
Claude: *writes code, takes screenshot, clicks button, checks console*
Claude: "Fixed. Button renders correctly, click triggers POST /api/auth (200), no console errors."
```

---

## How It Works

claude-eyes runs a headless Chromium browser via Playwright. When Claude calls a tool like `screenshot`, it captures the actual page and returns it as an image that Claude can see and reason about.

The key insight: Claude receives **actual image data**, not file paths. It can look at your UI, notice visual bugs, and verify fixes without you lifting a finger.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## License

MIT
