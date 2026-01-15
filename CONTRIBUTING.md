# Contributing to claude-eyes

Thanks for considering a contribution! This guide will help you get started.

## Setup

```bash
git clone https://github.com/ridxm/claude-eyes.git
cd claude-eyes
npm install
npx playwright install chromium
npm run build
```

To verify everything's working:

```bash
npx tsx tests/integration/test-tools.ts
```

You should see all 16 tests pass.

## Project Structure

```
src/
├── index.ts              # MCP server entry point
├── session/
│   ├── manager.ts        # Browser lifecycle, state management
│   └── types.ts          # TypeScript interfaces
├── tools/
│   ├── index.ts          # Tool registration
│   ├── navigation.ts     # navigate, reload, go_back, go_forward
│   ├── interaction.ts    # click, type, fill, scroll, hover, select
│   ├── visual.ts         # screenshot, visual_diff
│   ├── console.ts        # get_console_logs, clear_console
│   ├── network.ts        # get_network_requests, get_response_body
│   ├── dom.ts            # get_dom_snapshot, dom_diff
│   └── qa.ts             # verify_*, get_page_state
└── utils/
    └── result.ts
```

If you're exploring the codebase, `src/session/manager.ts` is a good starting point for understanding how browser state works. From there, any tool file will show you the pattern we follow.

## Adding a Tool

New tools are a great way to contribute. Here's the general approach:

1. Add your schema and handler to the appropriate file in `src/tools/`:

```typescript
export const myToolSchema = z.object({
  param: z.string().describe('description for claude'),
});

export async function myTool(args: z.infer<typeof myToolSchema>) {
  const page = await sessionManager.ensureBrowser();
  // ... do stuff
  return {
    content: [{ type: 'text' as const, text: 'result' }]
  };
}
```

2. Register it in `src/tools/index.ts`
3. Add a test in `tests/integration/test-tools.ts`

For tools that return images (like screenshots or diffs), we use MCP image content blocks so Claude can actually see them:

```typescript
return {
  content: [
    { type: 'image' as const, data: base64, mimeType: 'image/png' },
    { type: 'text' as const, text: 'description' }
  ]
};
```

## Commits

We use conventional commits, enforced by commitlint.

Format: `type: description`

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`

A few rules: lowercase, no period at the end, imperative mood ("add" not "added").

```bash
git commit -m "feat: add wait_for_network tool"
git commit -m "fix: handle timeout in screenshot"
```

The pre-commit hook will let you know if something's off with the format.

## Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes and run tests
3. Open a PR against `main`

We prefer PRs that focus on one thing at a time, and including tests for new functionality is always appreciated.
