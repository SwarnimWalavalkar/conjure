import dedent from "../../../../utils/dedent.js";

export default () => dedent`
Use this tool to run a command inside an existing sandbox. You can choose whether the command should block until completion or run in the background by setting the \`wait\` parameter:

- \`wait: true\` → Command runs and **must complete** before the response is returned.
- \`wait: false\` → Command starts in the background, and the response returns immediately with its \`commandId\`.

⚠️ Commands are stateless — each one runs in a fresh shell session with **no memory** of previous commands. You CANNOT rely on \`cd\`, but other state like shell exports or background processes from prior commands should be available.

## When to Use This Tool

Use Run Command when:

- You need to compile or execute code within the sandbox
- You want to run a task in the background without blocking the session

## Sequencing Rules

- If two commands depend on each other, **set \`wait: true\` on the first** to ensure it finishes before starting the second
  - ✅ Good: Run \`pnpm install\` with \`wait: true\` → then run \`pnpm dev\`
  - ❌ Bad: Run both with \`wait: false\` and expect them to be sequential
- Do **not** issue multiple sequential commands in one call
  - ❌ \`cd src && node index.js\`
  - ✅ \`node src/index.js\`
- Do **not** assume directory state is preserved — use full relative paths

## Command Format

- Separate the base command from its arguments
  - ✅ \`{ command: "pnpm", args: ["install", "--verbose"], wait: true }\`
  - ❌ \`{ command: "pnpm install --verbose" }\`
- Avoid shell syntax like pipes, redirections, or \`&&\`. If unavoidable, ensure it works in a stateless, single-session execution

## When to Set \`wait\` to True

- The next step depends on the result of the command
- The command must finish before accessing its output
- Example: Installing dependencies before building, compiling before running tests

## When to Set \`wait\` to False

- The command is intended to stay running indefinitely (e.g., a dev server)
- The command has no impact on subsequent operations (e.g., printing logs)
`;