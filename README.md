# claude-eyes

MCP server that gives Claude Code "eyes" for frontend development.

## What it does

Claude Code can write frontend code, but it can't see what rendered. This MCP server provides browser automation tools so Claude can:

- Take screenshots and actually see the UI
- Read console logs and catch errors
- Inspect network requests
- Click, type, scroll to test interactions
- Compare before/after to verify fixes

## Installation

```bash
npm install claude-eyes
```

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "claude-eyes": {
      "command": "npx",
      "args": ["claude-eyes"],
      "env": {
        "HEADLESS": "true",
        "BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `navigate` | Go to a URL |
| `screenshot` | Capture what's on screen |
| `click` | Click an element |
| `type` | Type into an input |
| `get_console_logs` | Get browser console output |
| `get_network_requests` | See API calls |
| `verify_no_errors` | Check for console errors |
| `verify_element` | Check if element exists/visible |
| `visual_diff` | Compare two screenshots |
| `get_page_state` | Quick summary of current page |

## Example

```
You: "I fixed the login button, verify it works"

Claude:
1. Navigates to /login
2. Takes screenshot
3. Clicks login button
4. Checks for console errors
5. Verifies API call succeeded
6. Takes another screenshot
7. Reports: "Login button works - no errors, API returned 200"
```

## License

Apache-2.0
