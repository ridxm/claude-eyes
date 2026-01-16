# claude-eyes
[![npm version](https://img.shields.io/npm/v/claude-eyes)](https://www.npmjs.com/package/claude-eyes)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)


**Claude Code can write frontend code. But it can't see what it built.**

**Give Claude Code eyes.**
 
An MCP server for autonomous visual QA - Claude can see screenshots, read console errors, and verify its own frontend fixes.

Every time Claude makes a UI change, you have to manually check the browser and report back. "Does the button show up?" "Is there an error?" "Did the style change?"

claude-eyes fixes this. It's an MCP server that gives Claude actual vision - screenshots it can see, console logs it can read, and interactions it can perform. 

Now Claude can verify its own fixes. No more copy-pasting errors. No more "looks good to me" back-and-forth.

---

## Before vs After

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
Claude: *writes code*
Claude: *takes screenshot, clicks button, checks console, verifies API*
Claude: "Fixed. Button renders, click triggers auth API (200), no console errors."
```

One message. Done.

---

## Install
```bash
npm install claude-eyes
```
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

---

## What Claude can do now

| Capability | Tools |
|------------|-------|
| **See** | `screenshot`, `visual_diff` |
| **Read** | `get_console_logs`, `get_network_requests`, `get_page_state` |
| **Interact** | `click`, `type`, `scroll`, `hover`, `navigate` |
| **Verify** | `verify_no_errors`, `verify_element`, `verify_request_succeeded` |

26 tools total. [Full reference →](./docs/tools.md)

---

## License

MIT