import dedent from "../../../../utils/dedent.js";

export default () => dedent`
Use this tool to create ephemeral sandboxes where you can execute commands, install and run CLI applications, and create, modify, and execute Python and Node.js scripts. this tool provisions isolated environments for short-lived experimentation, debugging, and runtime evaluation.

Capabilities:
  - Create a fully isolated sandbox and return a unique 'sandboxId' that can be used by other tools to upload files, run commands, and access exposed ports.
  - Accept an optional 'timeout' (TTL) in milliseconds that determines how long the sandbox remains active before automatic shutdown and destruction. If not provided, a safe default TTL will be applied.
  - Provide clear status updates during creation (e.g., 'loading', 'done', 'error') and include helpful error messages on failure.

After creation, the sandbox allows you to:
- Upload and manage files via \`Generate Files\`
- Execute shell commands with \`Run Command\` and \`Wait Command\`

The base system for the sandbox is Amazon Linux 2023 with the following additional packages:

\`\`\`
bind-utils bzip2 findutils git gzip iputils libicu libjpeg libpng ncurses-libs openssl openssl-libs pnpm procps tar unzip which whois zstd
\`\`\`

You can install additional packages using the \`dnf\` package manager. You can NEVER use port 8080 as it is reserved for internal applications. When requested, you need to use a different port.

Constraints and Safety:
  - The sandbox is ephemeral: all state, files, running processes, and network exposures are destroyed when the TTL expires or when the sandbox is explicitly terminated. Do not assume persistence beyond the sandbox's lifetime.
  - Treat the sandbox as an isolated, untrusted runtime. Avoid assuming access to credentials, production services, or long-term storage.
  - Limit resource usage and prefer short-running commands; do not attempt to run indefinite background processes. Respect the 'timeout' parameter.
  - When returning information to the caller, never expose internal debugging details or secrets from the host environment.

Best Practices:

- Use this tool only once per session
- Track and reuse the sandbox ID throughout the session
- Do not create a second sandbox unless explicitly instructed
- If the user requests an environment reset, you may create a new sandbox **after confirming their intent**

Do not attempt to create long-lived persistence, and treat this environment as disposable and isolated.
`;
