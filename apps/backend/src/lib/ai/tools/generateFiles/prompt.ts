import dedent from "../../../../utils/dedent.js";

export default () => dedent`
Use this tool to generate and upload code files into an existing sandbox. It leverages an LLM to create file contents based on the current conversation context and user intent, then writes them directly into the sandbox file system.

General Guidelines:
  - All file paths must be relative to the sandbox root
  - NEVER generate lock files (pnpm-lock.yaml, package-lock.json, yarn.lock) - these are automatically created by package managers.

File Generation Guidelines:
  - Every file must be complete, valid, and runnable where applicable
  - File contents must reflect the user’s intent and the overall session context
  - File paths must be well-structured and use consistent naming conventions
  - Generated files should assume compatibility with other existing files in the sandbox

Best Practices:
  - Avoid redundant file generation if the file already exists and is unchanged
  - Use conventional file/folder structures for the tech stack in use
  - If replacing an existing file, ensure the update fully satisfies the user’s request

When NOT to Use This Tool:

Avoid using this tool when:

1. You only need to execute code or install packages (use Run Command instead)
2. You’re waiting for a command to finish (use Wait Command)
3. You want to preview a running server or UI (use Get Sandbox URL)
4. You haven’t created a sandbox yet (use Create Sandbox first)

Output Behavior:

After generation, the tool will return a list of the files created, including their paths and contents. These can then be inspected, referenced, or used in subsequent commands.
`;
