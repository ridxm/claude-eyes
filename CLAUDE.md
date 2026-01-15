# claude-eyes

MCP server providing browser automation tools for Claude Code.

## Project structure

```
src/
├── index.ts           # entry point
├── server.ts          # mcp server setup
├── session/
│   ├── manager.ts     # browser lifecycle, state storage
│   └── types.ts       # typescript interfaces
├── capture/
│   ├── console.ts     # console log buffer
│   ├── network.ts     # request/response capture
│   ├── screenshot.ts  # screenshot storage
│   └── dom.ts         # dom snapshots
├── diff/
│   ├── visual.ts      # pixelmatch integration
│   └── dom.ts         # diff-dom integration
├── tools/
│   ├── index.ts       # tool registration
│   ├── navigation.ts  # navigate, reload
│   ├── interaction.ts # click, type, scroll, wait
│   ├── visual.ts      # screenshot, visual_diff
│   ├── console.ts     # get_console_logs, clear
│   ├── network.ts     # get_requests, get_response
│   ├── dom.ts         # get_dom, dom_diff
│   └── qa.ts          # verify_*, get_page_state
└── utils/
    ├── errors.ts      # structured error handling
    └── result.ts      # result type with suggestions
```

## Key patterns

### tool return types
screenshots return MCP image content blocks so claude can actually see:
```typescript
return {
  content: [
    { type: 'image', data: base64, mimeType: 'image/png' },
    { type: 'text', text: 'screenshot captured' }
  ]
};
```

### error handling
all tools return structured errors with suggestions:
```typescript
{ success: false, error: "element not found", suggestion: "use wait_for_element first" }
```

### session state
single browser instance persists across tool calls. state stored in memory:
- console logs buffer
- network requests
- named screenshots
- dom snapshots

## Commands

```bash
npm run build    # compile typescript
npm run dev      # watch mode
npm test         # run tests
```

## Commit convention

```
feat: new feature
fix: bug fix
docs: documentation
chore: maintenance
refactor: code restructure
test: tests
```
lowercase, no period
