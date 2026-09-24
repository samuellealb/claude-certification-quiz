# Claude Code, MCP & Integration

## Claude Code agent loop, permission modes, settings, and where a human gate goes

Module 2 established how the agent loop works at the API level: the model calls tools, gets results back, and continues until the task is done.

Claude Code runs that same loop in your terminal but adds an additional layer: a permission system that gates every action the agent wants to take. Before you can configure anything, you need to understand how the loop runs and what the permission modes control.

### How Claude Code works through a task: explore, plan, and code

When you hand Claude Code a task, it does not start writing immediately. It reads files, traces the relevant logic, and builds a picture of the codebase first; this is the exploration phase. Then, once it understands enough to propose a change, it creates a plan. A plan is a structured description of the edits it intends to make. Only after you review and approve the plan does it move into the code phase, where it writes and executes the changes.

This sequence matters for two reasons. First, it produces better output: Claude Code understands the codebase before touching anything, so it makes fewer assumptions and catches more downstream effects. Second, it is where the permission modes plug in: plan mode holds Claude Code in the explore phase, blocking all file edits and shell commands until you release it, making it a useful default for unfamiliar codebases or high-stakes work.

### Permission modes: approvals, gates, and constraints

Permission modes control how often Claude Code stops to ask for confirmation. Each mode makes a different tradeoff between speed and oversight. The right choice depends on how well you know the codebase and how reversible the changes are.

Compare the modes by what they auto-approve, what they still gate, and their limitations.

| Mode | Auto-approves | Still gates | Limitations |
| --- | --- | --- | --- |
| `default` | Reads only. Prompts before nearly every edit or command. | All file edits and shell commands require confirmation. | Safe but slow on trusted work. The baseline for any new project or unfamiliar codebase. |
| `acceptEdits` | Reads, file edits, and common filesystem commands (mkdir, touch, rm, rmdir, mv, cp, and sed) inside the working directory. Auto-approval is scoped to paths inside the working directory, and protected paths still prompt. | All other shell commands; writes outside the working directory; writes to protected paths. | Trusted local work where shell execution still needs a human eye. Not appropriate if the agent must run scripts. |
| `plan` | Reads only. Research and proposes; makes no edits. | All file edits and shell commands until you approve a plan. | Exploration and planning on sensitive or unfamiliar codebases. Not appropriate for tasks that must write output. |
| `auto` | Everything, but a separate classifier reviews each action first and blocks anything that escalates beyond your request, targets unrecognized infrastructure, or appears driven by hostile or inappropriate content. | Production deploys and migrations, mass deletes, credential exfiltration, and force-push to main are blocked by default. | Reduces prompts but does not guarantee safety; this is a research preview, not a substitute for reviewing sensitive operations. Availability depends on plan, model version, and admin settings. Always verify current requirements before build. |
| `dontAsk` | Only tools you pre-approved in an allow rule, plus read-only commands. Auto-DENIES everything else. | Every tool call not on the allow list is denied. There is no queue for confirmation. | Built for locked-down CI and scripts. It restricts well, but it is not a way to reduce friction on local interactive work. |
| `bypassPermissions` | All tool calls. No confirmation prompts and no safety checks. | Nothing in normal operation. The standard permission checks are bypassed; only catastrophic delete commands such as rm -rf / and rm -rf ~ still trigger a last-resort prompt. | Only inside an isolated container or VM where the environment is disposable. Never on a developer workstation against a live codebase. |

### Where does the configuration live and who it applies to

Settings can be placed at several levels, and each level determines the scope of the rules it contains.

- **User level (`~/.claude/settings.json`)**: Applies to every project on the machine. This is the right place for preferences that should follow you everywhere, such as a preferred default mode for exploration work.
- **Project level (`.claude/settings.json`, committed to the repo)**: Applies to everyone who clones the repository. This is the right place for team-wide conventions, allow rules for the tools your project uses, and deny rules for paths that should not be touched.
- **Local project level (`.claude/settings.local.json`)**: Personal overrides for one project, automatically git-ignored. This is the right place for your own preferences that should not be committed to the whole team.
- **Enterprise level (`managed-settings.json`, set by administrators)**: Cannot be overridden by users or project files. The right place for organization-wide security controls such as denying edits to environment files or blocking specific shell commands across all projects.

Allow and deny rules layer on top of the selected mode. A deny rule always wins over an allow rule, regardless of the mode in effect. The most durable governance control is an enterprise-level deny rule: it cannot be removed by any individual developer and applies even when a bypass mode is set.

### Where a human still has to look: placing the review gate by worst-case cost

Permission modes and deny rules decide what the agent can do without asking. They do not decide where you, the human, still need to look before an action lands. That decision rests on one question, the same one that separates a safe mode from a risky one: what is the worst outcome if this action runs without a person checking it? The lower the cost of being wrong, the more you can let through. The higher the cost, and the harder it is to undo, the more a step needs a human gate before it executes.

That same worst-case question places the gate whether the agent is writing code or running unattended in an automated step such as a bot that comments on or blocks a pull request. Three placements follow from it:

- **Let low-stakes, reversible actions through without a gate.** A formatting fix or an edit confined to the working directory carries little cost if it is wrong, so requiring a human to approve each one buys oversight you do not need and slows the work. This is the case `acceptEdits` is built for.
- **Gate any action that is hard to undo or reaches a sensitive path.** A write outside the working directory, a destructive shell command, or an edit to a security-relevant or protected file has a high cost if it is wrong, so the agent should pause and surface the action for a person before it runs. A deny rule enforces this deterministically, and `default` or `plan` mode keeps the prompt in place while you decide.
- **Never let the agent be the only gate on a change to code your team has marked sensitive.** There the agent’s work is an input to a human decision, not a replacement for one, so a person must review the change before it merges no matter how confident the agent or its own review sounds.

The placement of the gate and the choice of permission mode are the same decision viewed from two sides. The mode sets the default for a whole session, and the gate is where you override that default for the one action whose cost is too high to leave to the default; both come from asking what breaks if this runs unchecked.

### Cost, complexity, and risk

- Cost: Running in default mode on trusted work adds prompt latency to every tool call, and this accumulates on a long refactor.
- Complexity: Multiple levels of settings and files with an override hierarchy require consistent care. A deny rule at the enterprise level that contradicts an allow rule at the project level needs to be understood by everyone maintaining the project config.
- Risk: The risk lies in using the wrong mode for the context. For example, a bypass mode set out of impatience on a non-isolated machine removes every safety prompt between the agent and your live files, and, unlike the other modes, also removes the protected-path guard.

## Durable Project Context

### Durable project context with CLAUDE.md, rules files, hooks, and subagents

Previously we saw how Claude Code gates actions through permission modes and settings files. That configuration layer controls what the agent is allowed to do.

This cluster builds on top of it: now you’ll learn how to configure what the agent knows and how it behaves, so the rules and project context you define in a session are still in effect at the start of the next one.

### CLAUDE.md: the project file that loads into every session

Every time Claude Code starts in a project directory, it looks for a file named CLAUDE.md at the root and reads it. The contents are appended to your prompt before any message from you arrives. This means every convention, constraint, and command you put in CLAUDE.md is present from the first prompt of every session, without you having to re-state it.

The /init command scans your codebase and generates a starter CLAUDE.md. The generated file is a great baseline but should be validated before using. Refine it to hold the rules that control the outcome of your prompts: your testing commands, your framework conventions, the paths the agent should not touch, and the style decisions that differ from defaults.

Size is the main failure mode. A CLAUDE.md that keeps growing with every new instruction can dilute the rules that matter most. A larger file consumes more of the context window, which makes any single instruction a smaller fraction of what loads, and that reduces the chance that the agent follows the one rule that catches a real mistake. Hold CLAUDE.md to the constraints that change behavior and move everything else into Skills that load on demand.

### Rules instruction files: scoping guidance to where it applies

In the previous section, we established that CLAUDE.md loads into every session and should hold the instructions that apply across the whole project. The next question is what to do with guidance that matters only in one part of the codebase. That is where rules instruction files come in: they let you apply instructions only where they are relevant, instead of loading them into every session.

CLAUDE.md is always on, and rules files add a narrower layer on top of that baseline. They live in the project’s .claude/rules/ directory and can be scoped to specific paths using a paths glob in their YAML frontmatter. A rule scoped this way loads into context only when Claude Code works with files matching the pattern, this allows a rule to be applied to one part of the codebase without cluttering the rest of the context.

Note that the scoping comes from the frontmatter, not from file placement. Rules files can be organized into subdirectories of .claude/rules/ (e.g., .claude/rules/database/), but that structure is organizational only; a rules file without a paths field loads unconditionally at launch, with the same priority as CLAUDE.md, no matter where it sits inside .claude/rules/.

In practice, put broad project memory and universal constraints in CLAUDE.md, and put narrow, path-specific guidance in rules files scoped with paths. A constraint like “never modify the database schema” lives in CLAUDE.md because it applies everywhere. A constraint like “all SQL in the database module must include an explicit transaction boundary” lives in .claude/rules/database.md with frontmatter such as:

```yaml
paths:
  - "src/db/**/*.sql"
```

so it enters context only when Claude is working with those files.

### Hooks: running your own scripts at fixed points in the lifecycle

A Hook allows you to intercept and control tool calls before or after they execute. When you write a specific rule in CLAUDE.md telling the agent to run Prettier after every file edited, the agent will follow it most of the time. Alternatively, a hook makes it happen every single time without exceptions because the hook fires independently of what the model decides to do.

Hooks are defined in settings files and configured using the /hooks command. Each hook is bound to a lifecycle event, an optional matcher that scopes it to specific tool types, and a command that runs when the event fires. The core events for most guardrail and automation use cases are:

- **PreToolUse**: Runs before a tool call executes. Because it runs first, a PreToolUse hook can examine the tool call and exit with code 2 to block it, writing the reason to stderr as feedback the agent sees. This is how you enforce access controls at the configuration layer rather than hoping the agent respects a `CLAUDE.md` instruction.
- **PostToolUse**: Runs after a tool call completes. Since the call has already happened, this event cannot block it, which makes it the right place for automated side effects: running a code formatter after an edit, triggering tests after a file change, or logging the operation for an audit trail.
- **UserPromptSubmit**: Runs when you submit a prompt, before the model processes it. Use it when you need to inject context or validate the request before any work starts.
- **Stop**: Runs when the model finishes responding. Use it for follow-up actions that belong at the end of a turn, such as notifications, cleanup tasks, or committing the audit log.
- **Notification**: Runs when Claude Code sends a notification, which occurs when Claude needs permission to use a tool or after Claude Code has been idle for 60 seconds. Use it to route those signals to an external channel or logging system.
- **SessionStart**: Runs when a session starts or resumes. Use it to initialize state, validate environment variables, or confirm required services are reachable before the agent begins work.
- **SessionEnd**: Runs when a session ends. Use it for teardown tasks, final audit writes, or notifications that the session has closed.

A hook that blocks edits to a production configuration path using a PreToolUse event enforces that constraint at every tool call during every session, regardless of permission mode. That is the difference between a guardrail and a convention.

### Subagents: delegating work to an isolated context

A subagent is a specialized assistant that Claude Code can delegate tasks to, and each assistant runs a task in its own separate context and returns only its output. It does not inherit your main conversation history, the files you have accumulated in context, or your current session state. When you send a task to a subagent, it starts from a clean slate, does the work, and hands back the result.

The built-in subagents differ in what they load at startup; this difference determines how your project rules apply. Always check the current list in the Claude Code docs, because the set has grown over time, but know that the specific split that affects your project rules holds across versions. The Explore and Plan built-in subagents skip CLAUDE.md and git status to keep research fast and cheap. They are optimized for speed, so project-level rules and repository state defined in CLAUDE.md are not in their context when they run. The general-purpose subagent loads both. If you delegate a task to Explore or Plan and a rule from your CLAUDE.md applies, it’s because that context was not loaded. For tasks where your project constraints must be respected, use the general-purpose subagent or a custom subagent that explicitly loads the rules it needs.

Custom subagents also do not automatically see your skills. If you define a custom subagent in .claude/agents and it needs a specific skill, you must explicitly list that skill in the agent’s front matter. Built-in agents do not have preloaded skills. If a built-in agent needs skill-backed behavior, the correct path is to create a custom subagent with those skills listed in its configuration.

The map below names each mechanism, what it loads, when it runs, its context cost, and what belongs in it. Use it to decide which mechanism carries a specific piece of project knowledge, since each one makes a different tradeoff between how much context it costs and how reliably it applies.

| Mechanism | What it loads or runs | When it applies | Context cost | What belongs in it |
| --- | --- | --- | --- | --- |
| `CLAUDE.md` | Project instructions appended to the prompt before the first user message. | Every session in the project. | Always consumes context, so growth can dilute important rules. | Broad project memory, testing commands, universal constraints, and conventions that change outcomes. |
| Rules files | Additional instructions from `.claude/rules/`, optionally selected by a `paths` glob. | When Claude works with matching files; rules without `paths` load unconditionally. | Scoped rules consume context only where relevant; unscoped rules have the same always-on cost as `CLAUDE.md`. | Narrow guidance for a specific part of the codebase, such as transaction requirements for SQL files. |
| Hooks | Commands bound to lifecycle events such as `PreToolUse`, `PostToolUse`, `SessionStart`, or `Stop`. | Deterministically when the configured event and optional matcher fire. | Runs outside the model’s decision process rather than relying on prompt context. | Enforced guardrails, formatters, tests, audit logging, initialization, cleanup, and notifications. |
| Subagents | A separate task context that returns only its output. Built-in agents differ in whether they load `CLAUDE.md`, git status, or skills. | When Claude delegates an isolated research or implementation task. | Keeps intermediate work out of the main context, but the subagent needs required rules and skills explicitly. | Self-contained tasks; use a general-purpose or custom subagent when project constraints or skills must apply. |

## Packaging Workflows

### Packaging a workflow as a plugin: skills, custom commands, and marketplace install

Previously, we covered the mechanisms that give Claude Code durable context and enforce behavior: CLAUDE.md for always-on project memory, rules files for scoped guidance, hooks for deterministic guardrails, and subagents for isolated task delegation.

These mechanisms live in your .claude directory and are version-controlled with the project. Now we turn to the next question: how can you package that setup so a teammate can install it simply in one step instead of repeating your manual configuration by hand?

### Skills are reusable workflows the agent loads on demand

A skill is a portable Markdown file (SKILL.md file) placed in .claude/skills. The front matter identifies the skill and describes when it applies, and the body holds the steps. The same skill can run in Claude Code, be invoked through Messages API, or be loaded by the Agent SDK. What changes across the three isn’t the file itself; it’s where the skill runs, how it gets loaded, and what it’s allowed to touch. A developer who has only ever seen skills in Claude Code may assume things that don’t hold true on the API, so this section outlines the differences.

#### Claude Code

- **How the skill loads**: Discovered from `.claude/skills` on the filesystem. Loads on a description match or when you invoke it by name.
- **Where the steps run**: In your terminal session, against your local files, under the active permission mode and deny rules.
- **What you need to know**: It’s filesystem-based and is governed by the settings layer.

#### Messages API

- **How the skill loads**: Sent along with the request and run inside the code execution container, not your application’s environment. Requires code-execution and skills beta headers.
- **Where the steps run**: Inside Anthropic’s code execution container, not on your machine. The skill’s filesystem and tool access are whatever that container provides.
- **What you need to know**: A skill that assumes local files or local tools won’t behave the same way here, because it isn’t running where those files are.

#### Agent SDK

- **How the skill loads**: Loaded by the agent the SDK runs, but whether filesystem settings (`CLAUDE.md`, skills) load is controlled by the `settingSources` configuration. Do not rely on a default: always set it explicitly to the sources you intend, and confirm current default behavior against the Agent SDK reference at build time. You set it through `settingSources` (TypeScript) / `setting_sources` (Python).
- **Where the steps run**: In the process the SDK runs, which is your environment, once you’ve told it to load filesystem sources.
- **What you need to know**: The common surprise is that a skill that worked in Claude Code does nothing under the SDK because `settingSources` was never set, so the skill never loaded.

#### Claude Managed Agents

- **How the skill loads**: Defined once as an API resource that names the model, system prompt, tools, MCP servers, and skills. Anthropic loads the skill server-side when the agent runs, so there is no filesystem discovery step on your side.
- **Where the steps run**: Inside a sandbox Anthropic provisions and runs, not your environment. Your application sends user events and reads streamed results back. The skill has access to whatever that managed sandbox provides, not your local files.
- **What you need to know**: Currently a public beta that requires the `managed-agents-2026-04-01` beta header, and sessions are stored server-side, which means Managed Agents are not currently eligible for Zero Data Retention or HIPAA BAA coverage. Skills are attached when defining the agent resource, not at session time. Update the agent definition to change which skills are available.

### Three portability rules

- **Write the description as the matching criterion.** The model loads a skill by comparing your request to its description, so a description that identifies when the skill applies works in every runtime, but a vague one fails to load in all of them.
- **Don’t assume a local filesystem or local tools exist inside the skill body.** A skill that shells out to a local command works in Claude Code but breaks on the Messages API, where it runs in a container without a command. Keep the skill’s steps confined to what the runtime is guaranteed to provide, or document the dependency.
- **Remember that subagents don’t inherit skills.** This was true in Module 2, and is still true here: a subagent starts clean, so a skill the parent relied on has to be listed for the subagent explicitly, in every runtime that supports subagents.

The practical takeaway is that you can author a skill once and reuse it, but you must specifically design for the ability to use it across terminals. A skill that’s scoped to a clear description and free of local-environment assumptions ports cleanly across runtimes, but one that assumes a specific local environment does not.

### Giving a workflow an explicit entry point

A custom command is a shortcut for a defined procedure. In current Claude Code, skills are the recommended format for both explicit and automatic invocation: you invoke a skill directly with /skill-name, or Claude loads it automatically when relevant. The older .claude/commands/ directory format still works but is a legacy process. Use skills with disable-model-invocation: true in the frontmatter when you want a workflow that only runs when you explicitly call it.

Plugin commands are namespaced automatically: the plugin’s name becomes the prefix, so a run-tests command in a plugin named payments is invoked as /payments:run-tests. This is why two plugins can both ship a run-tests command without colliding. Authors should treat the plugin name as part of the interface, since it prefixes every command you ship, and be aware that renaming the plugin renames them all.

### The packaging layer that makes a setup installable

A plugin bundles skills, hooks, subagents, and MCP servers into a single installable unit. Plugins can be packaged and distributed through a marketplace, which is a catalog of plugins that someone else has created and shared. The official Anthropic marketplace is available automatically when you start Claude Code, and you can add third-party marketplaces hosted in a GitHub repository with a command like `/plugin marketplace add <owner/repo>`. Teammates can then run one simple install command to get the same setup. The plugin replaces a page of manual setup steps with a versioned, auditable install. The plugin places components as follows:

- Skills go in a skills directory.
- Hooks, subagents, and settings go in their respective locations.
- The plugin manifest describes the bundle, and the install command wires it into the target installation. Plugins can be downloaded by individuals or at an enterprise-wide level.

Enterprise administrators can deploy plugins organization-wide through managed settings. A managed marketplace allowlist gates which marketplace sources users are permitted to add, so the organization controls where plugins can come from. The allowlist restricts what users can add but does not register marketplaces automatically. If you would like to push a marketplace to all users without requiring them to run the add command themselves, pair the allowlist setting with extraKnownMarketplaces in managed settings. The precedence comes from the deployment scope: because managed settings sit above user and project settings in the configuration hierarchy, a plugin deployed at managed scope takes priority and cannot be overridden by users or project files. Review the reference layer for the exact setting names.

### The packaging decision table

The table below identifies each layer, who it is for, and when to reach for it.

| Layer | What it is | Who it is for | When to reach for it |
| --- | --- | --- | --- |
| Skill | A Markdown file in `.claude/skills` that loads when its description matches the task or when invoked by name. | An individual developer or team using Claude Code interactively. | Reach for a skill when a task-specific procedure should stay out of context until it is needed, such as a PR review or a deployment checklist that only loads when the work calls for it. |
| Custom command | A named shortcut that runs a defined procedure when you invoke it explicitly. | Developers who want a predictable, explicit entry point for high-frequency procedures. | Reach for a custom command when the procedure has a clear name and you want to trigger it directly rather than relying on the description to match the task. |
| Plugin | A versioned bundle of skills, hooks, subagents, and MCP servers distributed through a marketplace. | A team that wants one-step installation of a shared, versioned setup. | Reach for a plugin when a working setup currently lives on one machine and needs to be shared, versioned, and kept consistent across a team. |

#### Packaging cost · complexity · risk

- **Cost**: Skills add context cost upon activation, but a plugin adds installation and maintenance overhead. The question to ask is whether you want to pay the setup cost once, as you do with a plugin install, or repeatedly, as you do when every developer runs the same manual steps by hand.

- **Complexity**: A plugin that hard-codes absolute paths in its skills will install correctly for the author and fail for everyone else, because any path or environment assumption baked into a skill or hook command is the thing most likely to break across machines.

- **Risk**: A plugin carries the components it bundles into every install. It’s important to remember that a deny rule or hook the author relied on locally is not included unless it is explicitly listed as part of the bundle. If the skills or hooks are tied to a guardrail that is not included in the bundle, then the protection does not carry over to a teammate’s machine.

## MCP Servers

### Building and configuring an MCP server: transport, scope, and the GitHub server

Prior sections introduced plugins as the packaging layer that bundles skills, hooks, subagents, and MCP servers into a single installable unit.

This section further explains what MCP server bundles are and how to build them. An MCP server is the layer that exposes tools to Claude from outside your codebase. When building an MCP server, one of the first decisions is determining the appropriate transport mechanism and defining the server’s scope.

### What is an MCP server and why is it different from wiring a tool directly?

When wiring a tool directly into an application, you are responsible for defining the tool’s schema and its functionality. Both live in that application’s code. If three different applications need access to the same external service, each one maintains its own integration. Model Context Protocol, or MCP, separates tool definitions from individual applications and turns them into a process called a server.

An MCP server is a process that exposes tools, resources, and prompts that MCP clients can use. Claude Code has a built-in MCP client. When you connect to an MCP server, Claude Code discovers the tools it provides and can invoke them during a session. With an MCP server, you build the capability once, and every MCP client that connects to it gets access without re-implementing the integration.

### MCP servers also expose resources and prompts

An MCP server exposes tools, resources, and prompts. We’ve already learned about tools: actions the model can call. The other two cover cases where a tool call won’t give you what you need.

A resource is read-only data the server exposes for the client to fetch and place into context directly, rather than the model calling a tool to get it. The client requests a resource by its address, and the server returns the data. Resources come in two forms: a direct resource has a fixed address for data that takes no parameters, such as a list of available documents, and a templated resource puts a parameter in the address, such as a document address that takes a document identifier. Reach for a resource when you want known data to be in context from the start of a turn. You want this when pulling a resource in directly is cheaper and more predictable than using a tool call to go get it. Resource support varies across MCP clients; verify that your client has a mechanism to inject resources into context before relying on this pattern.

A prompt is a pre-written instruction template the server exposes so a client can invoke a vetted prompt by name instead of asking each user to write their own. A user can already ask the model to do most tasks in their own words, so a prompt is useful when specific wording is needed: a task where a carefully built instruction produces materially better results than whatever a user would type, and where you want every client to get the same quality. Packaging the instruction on the server means the prompt is maintained in one place and reused everywhere the server is connected.

### Transport: how Claude Code talks to the server

Transport is the communication channel between the MCP client and the MCP server. The right transport depends on where the server runs.

| Transport | How it works | When to use it | Limitation |
| --- | --- | --- | --- |
| stdio | Runs the server as a local subprocess on the same machine as the client and communicates through standard input and output. | A local tool, personal script, or development server running on your machine. | It does not work for a server you want to share across your team or host remotely. |
| HTTP | Connects to a server on another machine over a standard HTTP connection. You register the server by providing its URL. | Any non-local server, including shared team servers and hosted integrations. | The server must be reachable over the network. |
| SSE | Uses the older Server-Sent Events transport that predates the current HTTP transport. | Existing configurations or documentation that still rely on it. | HTTP has superseded it, so SSE is not recommended for new servers. |

### Context cost

Each connected MCP server contributes tool definitions that would occupy the context window if loaded upfront. By default, Claude Code defers these definitions rather than loading them upfront, and it uses a search step to discover and load the relevant tools only when a task calls for them. Only the tools called for enter context.

An opt-in mode loads tool definitions upfront when they fit within roughly 10 percent of the context window, deferring only when that limit is exceeded. Either way, connecting only the servers you need keeps each request lean, because every connected server adds to the pool of definitions the model has to account for.

### Prompt caching: paying once for reusable requests

The context-cost problem you just saw with MCP servers has both a cost and window dimension. Every request reprocesses its input from scratch, including the parts that were identical on the last request, meaning that you pay for reprocessing each time. Prompt caching can stop you from paying twice for the same stable content.

Caching stores the processing work done on a stable prefix of your request so a follow-up request can reuse it instead of reprocessing the same tokens. The first request writes the prefix to the cache, and follow-up requests send identical content up to the same point in the cache at a fraction of the cost. The content must match exactly: a single changed character before the cache point invalidates that cache and forces a fresh write. That is why the strongest candidates for caches are the parts of a request that rarely change, such as a long system prompt, a large set of tool definitions, or a reference document you ask several questions about.

You turn on caching by marking a cache breakpoint; there is no global setting that turns caching on. In the Messages API you add a cache_control field of type ephemeral to the last block you want cached; this caches everything up to and including that block. You can place up to four breakpoints. The request is processed in a fixed order of tools, system prompt, and messages, so a breakpoint after the tools caches the tool definitions while keeping the messages dynamic.

The cache has a time limit. The default cache lifetime is five minutes from the last read. An opt-in one-hour lifetime is available by setting a ttl of 1h on the breakpoint. The five-minute default suits a back-and-forth model where requests arrive every few minutes, since each read resets the clock. The one-hour option suits a workload with longer gaps between requests, such as an agent that pauses between steps, where the five-minute window would expire before the next request. If the window expires before the next request, you are left paying the write cost again for no read benefit. Please note that caching only applies above a minimum token threshold (1,024 tokens for most current models) so short prompts will not be cached even if a breakpoint is set.

### Retrieval-augmented generation: how Claude pulls in only the knowledge a request needs

The context-cost problem you just saw with MCP servers is the same one a large body of reference material creates. A model reads everything in its context window for every request, so the more documents you load up front, the more context is used, and the less room is left for the work. Retrieval-augmented generation, usually shortened to RAG, is the pattern that resolves this. Instead of loading every document into context, the system stores the material outside the context window, finds the parts most relevant to the current request, and supplies only those parts to the model at request time. The model then generates its answer from that retrieved slice rather than from the whole library.

RAG comes in two forms:

Classical RAG does the hard work upfront. Before anyone asks a question, the source material gets split into chunks, and each chunk is converted into a set of numbers (called an embedding) that captures its meaning mathematically. Those numbers are stored in a database. When a user asks a question, the system converts the question into the same type of numbers, then finds whichever chunks have the most similar numbers. Think of it like a librarian who, before the library opens, has already read every book and written a precise summary card for every chapter, so when you arrive with a question, they can pull the right cards instantly.

Agentic search skips the upfront indexing entirely. There’s no pre-built database. Instead, the model figures out what it needs the moment you ask, then goes and fetches it: searching live sources, reading documents on demand, pulling in results as the task unfolds. Think of it like a researcher who, when you ask a question, goes and finds the answer themselves rather than consulting pre-prepared cards.

You may have already encountered agentic search without knowing its name. In Claude Code, when you’re connected to many external tools (MCP servers), Claude doesn’t load every tool definition up front; that would be too much to hold at once. Instead, it discovers and loads only the tools it needs for the current task. Claude.ai Projects works the same way for uploaded documents: when a project’s knowledge base grows larger than can fit in the active window, it surfaces only the document sections most relevant to each question rather than loading everything.

Both approaches do the same fundamental thing; they both find a relevant slice of material and generate from it. The difference is timing: classical RAG finds the slice by matching against an index built in advance; agentic search finds it by searching at the moment of need.

Two properties of retrieval are worth understanding before you reach for it:

It scales. As your source material grows, the cost of each request stays flat, because the model only ever receives the slice relevant to that question, not the entire library. A knowledge base can grow to thousands of documents and a single question still pulls back roughly the same amount of text. That’s what lets retrieval work at scale: the source can keep growing without the request growing with it.
It’s only as good as what it finds. The model reasons over the slice it receives. If the retrieval step misses the document you needed, the model never sees it. This means that how you organize your material is important: files with vague names (“notes_final_v3.pdf”) are harder to surface than files with descriptive ones (“Q3 refund policy, updated August 2024”). Grouping related files together helps too. Good retrieval starts with a well-organized source.

### Configuration scope: who loads the server

The scope determines which users and projects load the server. Each scope corresponds to a different configuration location.

Local scope stores the server configuration in ~/.claude.json under the current project’s path. It applies only to the project you are currently working on and is not shared with teammates. This is the right scope for a server tied to a specific project context that you are not ready to commit to the repository, or for tooling that only makes sense in one project.
User scope stores the server configuration in your personal Claude settings and makes it available across all your projects. It is still personal: teammates do not see it, and it is not written into the repository. This is the right scope for a personal utility you use in every project, such as a local database tool or a script you rely on regardless of which codebase you are working on.
Project scope writes the server configuration to a .mcp.json file at the root of the repository. When that file is committed to version control, everyone who clones the repository gets the same server automatically. This is the right scope for a server the whole team can access, because the configuration travels with the code. One thing to keep in mind: a project-scoped server runs from each teammate’s machine. For a stdio server, the committed configuration stores the launch command, and every clone spawns its own local subprocess, so each teammate needs the runtime (such as Node for an npx-launched server) installed locally.
Enterprise scope deploys through a centrally managed configuration controlled by an administrator. Administrators can push servers to all users in the organization without individual configuration steps. This is the right scope for shared internal services, security tooling, or any server that must be present across the organization and cannot be left to individual developers to configure.

### Permission rules that target a single MCP tool, not the whole server

Connecting a server exposes its full tool list, but you rarely want the agent to reach every one of those tools without checking. The permission layer from the permission-modes section extends to MCP tools, and the rules can name an individual tool rather than the whole server.

An MCP tool is identified in a permission rule by its server and tool name: mcp**server**tool. An allow rule on mcp**github**create_issue lets that one tool run without a prompt while every other tool on the GitHub server still prompts. A deny rule on a write-capable tool blocks it while read-only tools on the same server stay available. This is how you connect a broad server but keep the agent inside a narrow slice of what it can do. A deny on one tool overrides an allow on the server.

The API MCP connector is another useful control. If you are reaching the server through the API MCP connector, an mcp_toolset object lets you set an enabled flag per tool. This enabled flag lets you register a server but expose only the specific tools you want the model to see. A permission rule decides whether an exposed tool may run; the enabled flag decides whether the model sees the tool at all. The first is a governance control, the second is a context-cost and scope control. These controls are often used together. Always verify the exact rule syntax and the connector beta header against the documentation before publishing.

### The GitHub MCP server: transport, scope, and authentication in a concrete example

The GitHub MCP server is a remote server maintained by GitHub that exposes tools for repository management including reviewing pull requests, opening issues, searching code, and more. By walking through the connection process, you can see how transport, scope, and authentication work together in a server maintained by someone else.

The GitHub server uses HTTP transport because it is hosted remotely by GitHub. You register it by providing the server URL, and the client connects over the network. For scope, choose project scope when your whole team needs access to the same repository tooling, and local scope when only you need access to the server.

Authentication for the GitHub MCP server uses a Personal Access Token. You generate the token in GitHub, then pass it as a Bearer token in the request header of your MCP configuration. The token must be supplied through an environment variable and referenced in the configuration file. It must not be committed inline to .mcp.json, because a token written directly into a committed file enters repository history and cannot be removed by overwriting the file in a later commit.

OAuth is a different authentication mechanism, used by servers where the service authenticates individual users through a browser-based sign-in flow. Linear is an example of a server that uses this pattern. When you connect to a Linear MCP server for the first time, the client redirects to Linear’s sign-in page. After you approve access, a token is issued and stored automatically. No credential is copied or managed by hand. OAuth is the right pattern for any integration where the service’s authorization model is tied to user identity.

GitHub MCP uses a service credential you generate and store; Linear MCP initiates a sign-in flow that handles the credential for you. Both are remote HTTP servers, and both follow the same transport and scope logic. The authentication step is what differs.

### The MCP setup reference

The table below captures transport and scope decisions for each deployment context.

| Context | Transport | Scope | Config location | Secrets handling |
| --- | --- | --- | --- | --- |
| Personal local tool (runs on your machine only) | stdio | Local | `~/.claude.json` (per-project entry) | Environment variables only. Never in config file. |
| Shared team server (all teammates connect to same service) | HTTP | Project (`.mcp.json`) | `.mcp.json` committed to repo root | OAuth or environment variables. API keys must never be committed to `.mcp.json`. |
| Personal experiment (not ready to share) | stdio or HTTP | Local | Personal Claude settings | Environment variables only. |
| Organization-wide deployment (admin-managed) | HTTP | Enterprise | Managed settings (admin-controlled) | Secrets managed by administrator. Config locked to prevent override. |

#### MCP cost · complexity · risk

- **Cost**: Each connected MCP server adds its tool definitions to the context window. The more servers connected, the larger every request. Load only the servers a given task needs.

- **Complexity**: Transport and scope are independent decisions, but they interact: a stdio server cannot be project-scoped for sharing because it runs only on one machine. Match transport to where the server runs before choosing scope.

- **Risk**: Committing an API key inside `.mcp.json` to version control is the most common mistake in this section. The key travels into repository history where rotating later is not sufficient to remove the exposure. Secrets go in environment variables. The configuration file holds only the server address.

- **Handles well**: A reusable integration you want to use across multiple Claude Code sessions and share with the team, where the capability is stable enough to maintain as a separate process. The GitHub server is a great example.
- **Adds cost or complexity**: Teams that are not managing environment secrets carefully should be watched closely. Adding MCP servers increases the number of places a secret could be mishandled. The risk concentrates on the `.mcp.json` file, which is committed to the repository.
- **Use a different approach**: A one-off task where the tool logic can live directly in the codebase and does not need to be reused across sessions or applications. For a single-project integration used by one person, wiring the tool directly in the API call may be simpler than maintaining a server.

## Enterprise Integration

### Connecting Claude to enterprise systems and authenticating it securely

Earlier the module covered how to build an MCP server and configure its transport and scope. For a server used only by your team on an internal project, the GitHub personal-access-token example covers the authentication pattern.

This section covers what changes when the integration must work in a regulated environment: the identity, secret-handling, and data-residency questions that a prototype usually ignores become requirements that must be answered in the production deployment.

### Why enterprise integration is different from a working prototype

A prototype that connects Claude to an internal service answers one question: does the connection work? A production enterprise integration must answer several additional questions: Who is the model acting as, and is that identity auditable? What data can it access, and where does that data leave the organization? Can an administrator lock the configuration so no individual developer can change the authentication setup? Can the access be logged in a way that satisfies a compliance audit?

These questions are not new to enterprise software; they have the same identity, access, and compliance requirements that apply to any external system touching regulated data. Treating them as part of the integration design is what separates a demo from something deployment-ready.

### Authentication patterns by service type

The right authentication mechanism depends on where the service runs and what identity model it supports.

| Service type | Authentication pattern | How it works | Key constraint |
| --- | --- | --- | --- |
| Remote service with user identity | OAuth | The server returns a 401 Unauthorized, the client starts a browser-based sign-in flow, and a token is issued and stored after approval. This is the expected pattern for cloud services, SaaS tools, and integrations where user identity is part of authorization. | No one copies a secret by hand. Linear MCP uses this pattern; GitHub MCP instead uses a personal access token passed as a header. |
| Remote service with service identity | API key through an environment variable | The key identifies the service account and is injected into the environment at execution time. In an Agent SDK CI pipeline, the runner injects it as a secret. | Never commit the key to a configuration file or bake it into code. |
| Local service with file-system access | stdio with no network authentication | The file-system permission model provides the security boundary. | A deny rule in the settings files is the governance layer. |

Managing the secret itself is the other half of secure authentication. A credential never travels with the configuration that references it: the config file holds only a variable reference, and the value lives in an environment variable or a managed secret store injected at the point of execution. Store service-account keys in a secret manager rather than in files, and rotate them on a schedule and immediately after any suspected exposure. If a key is leaked, you must rotate it, but remember, you cannot rotate a value baked into committed code. Scope each credential to the narrowest access its task needs, so a compromised key reaches only what that one integration required.

### Managing the secret after authentication: storage, rotation, and separation from config

Choosing the right authentication pattern establishes the connection, but keeping it is a separate problem. The MCP key leak mentioned earlier was not a bad choice of auth method, it was a credential that lived in the wrong place and could not be cleaned up once it spread. Three practices keep that from happening, and each one addresses a specific way a credential gets exposed.

The first practice is separation: a credential never travels with the configuration that references it. The configuration file holds a variable reference, and the value lives somewhere the file does not. This is the rule the leaked-key failure broke. The reason it matters is mechanical: configuration files get committed, shared, and cloned. A value written inline rides along with every one of those copies, and a committed value enters repository history in a way that overwriting does not remove. If you keep the value out of the file, then the file stays safe to share.

The second practice is where the value goes once it is out of the file. For a value that lives only on one machine or in one pipeline run, an environment variable injected at the point of execution is enough: the CI runner sets it as a secret, the configuration reads it by name, and nothing is written to disk. For a value that several services or people need, a secret store is better. A secret store is a managed service that holds credentials, returns them to authorized callers at runtime, and records who read what. It centralizes the value so a single rotation updates every consumer at once, and it removes the copies that accumulate when each service keeps its own credential in its own file. Reach for an environment variable when the secret is local and short-lived, and a secret store when the secret is shared or must be audited.

The third practice is rotation: replacing a credential with a new one on a schedule and immediately after any suspected exposure. Rotation is the only appropriate response to a leaked key, because a key that has been exposed cannot be made secret again. You must issue a new one. This is why the inline-credential pattern is so costly: a value baked into committed code cannot be rotated cleanly, since the old value stays in history and every consumer hardcoded to it breaks upon change. A credential read from a secret store or an environment variable rotates without touching the code that uses it, because the code references the value by name and the name does not change when the value behind it does.

Two habits can make rotation cheaper: scope each credential to the narrowest access its task needs, so a key that leaks reaches only what that integration required. Keep a record of which services use each credential, so a rotation does not surface its consumers.

The leaked-key failure earlier in the module identified the mistake: a credential written inline to a committed file. To prevent this from happening, apply these three practices: separation keeps the value out of the file, a secret store or environment variable gives the value a home that the file does not share, and rotation can help with recovery only when the first two are held.

### What regulated industries add on top of working authentication

A financial services or healthcare customer asks more questions than “does authentication work?” They ask where data is processed, how access is logged, and whether an administrator can lock the configuration so a developer cannot change the auth setup during an audit window.

The enterprise managed configuration from earlier sections answers the last question: an administrator-deployed server configuration that cannot be overridden by individual users means the auth setup is consistent across the organization and does not depend on each developer’s settings file being correct.

Audit hooks answer the logging question: a PostToolUse hook that logs every tool call and its parameters to an audit store provides the record a compliance review needs. The hook fires deterministically for every call, regardless of what the model decides, and the log is not something the model can skip.

Data residency answers the processing question: a server configured with an HTTP endpoint in a specific region, combined with a platform deployment that pins processing to that region, gives a compliance reviewer a checkable answer to where data goes. This is why the infrastructure requirement and the platform choice from earlier in the module matter at audit time, not just at build time.

### Code modernization: applying the full module to legacy change

Code modernization is a useful test case for everything this module covers, because it concentrates on the risks each tool was designed to manage. Large-scale changes to an unfamiliar legacy codebase carry high blast radius, unpredictable dependencies, and limited reversibility. The tools from this module address each of those risks directly when you apply them before the work starts. The explore, plan, and code loop is the core workflow for this type of work. Plan mode holds the agent in the read-only explore phase while you build confidence in its changes. You can review the proposed edits, identify anything that touches paths you did not expect, and push back before a single file is modified. Hooks enforce guardrails that prevent edits to specific paths during the most sensitive phases. CLAUDE.md carries the conventions for the new target patterns, so the agent applies them consistently across the full scope of changes rather than drifting back to the legacy patterns it reads in the surrounding code.

A responsible scoping approach for high-risk work addresses three questions before the session starts.

- **What is the blast radius if something goes wrong?** Which systems depend on the code being changed, and what breaks downstream if an edit is wrong?
- **How are changes audited?** Is there a PostToolUse hook logging every tool call, and does that log satisfy whoever needs to review what the agent touched?
- **Who approves each phase before the next one begins?** Plan mode enforces the boundary between exploration and execution, but the approval decision itself is yours to define and document before work begins.

These questions are not specific to modernization work. They apply to any high-risk agentic task. Code modernization surfaces them clearly because the scope is large, the codebase is unfamiliar, and the cost of getting it wrong is high.

### Enterprise integration cost · complexity · risk

- **Cost**: OAuth flows add a one-time setup step per user per service. API key management requires a secret rotation process, and audit logging through PostToolUse hooks adds a small overhead to every tool call.

- **Complexity**: Regulated environments add requirements that don’t appear in a prototype. Identifying them during scoping is the discipline that keeps integrations on schedule.

- **Risk**: The risk concentrates when a prototype moves toward production. A system that uses hardcoded credentials, has no audit log, and cannot be centrally locked will not pass a regulated customer’s security review. The fixes are not hard, but they require attention before the review.

- **Handles well**: Any integration that touches data a regulated customer cares about, where the same tooling already supports enterprise managed settings and audit hooks. Scoping the security requirements up front adds little overhead and prevents the integration from stalling at the final review.
- **Adds cost or complexity**: Teams that are not familiar with OAuth flows or enterprise secrets management. These patterns require coordination with security or IT teams in most regulated organizations, and the timeline needs to account for that.
- **Use a different approach**: A prototype or proof of concept that will never see production data. The full enterprise integration checklist is not warranted for a demo-only integration but applying the environment variable habit for secrets costs nothing and is good practice.
