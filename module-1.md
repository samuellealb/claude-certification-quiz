# MSO Foundations

## How LLMs behave: tokens, context, sampling, non-determinism

### Tokens: the unit of input, output, and cost

Claude does not read characters or words directly. It reads tokens, and the characters-per-token average depends on the tokenizer of the model at hand and differs between model generations. Treat any chars-per-token rule of thumb as model-dependent and confirm current tokenizer behavior at build time. Everything the model processes is counted in tokens: your prompt, the conversation history, tool definitions, tool results, and the response the model generates. Tokens are the unit of both pricing and budget, so when you estimate what a feature costs or whether an input fits, you are counting tokens, not words. A useful habit is to think in tokens, since that is the unit the API bills in and the context window measures.

### The context window: a fixed budget

The context window is the total number of tokens the model can take in for a single request. It holds everything at once: the system prompt, the full conversation so far, any documents you inject, every tool result, and the model output. It is a fixed budget with two distinct edge behaviors. A request whose input is already larger than the window is rejected with a validation error before generation begins. A request that fits on input can still reach the ceiling during generation. Current models then stop and return the output generated so far with a model_context_window_exceeded stop reason rather than raising an error. Either way, keeping a long session running requires the application to trim or summarize history before each call. In development, the window rarely fills because test inputs are short. In production, on the other hand, longer inputs and more turns fill the window faster. This is the failure Module 2 explores in detail.

### Sampling: why the same prompt can give different answers

A language model does not pick one fixed next token. At each step it produces a probability distribution over possible next tokens and then samples from it. Settings, such as temperature, shape that distribution: a lower temperature concentrates probability on the most likely tokens and makes output more repeatable, while a higher temperature spreads it out and makes output more varied. Because the choice is sampled rather than fixed, the same prompt run twice can return different wording even when both answers are correct. This is a property of how the model generates. Note that sampling controls are model-dependent: the newest Claude models do not accept non-default sampling parameters. Setting temperature, top_p, or top_k returns a 400 error, and behavior on those models is steered through prompting instead. Even where temperature is accepted, temperature 0 makes outputs more repeatable but does not guarantee identical outputs across calls. Confirm current parameter support in the API reference at build time.

### Non-determinism: what it means for testing and evals

Non-determinism is the primary consequence of sampling: identical inputs do not guarantee identical outputs. That changes how you test a Claude feature. A test that asserts the exact text of a response will be inconsistent, because the model can express the same correct answer many ways. Instead, assert on the property that must hold: a required field is present, a value is in range, the structure parses. When you need to judge meaning rather than structure, use an eval with a model-graded judge. This is why the course treats evals as the standard for knowing a feature is correct, and why Module 3 builds that capability.

## Model options and reasoning modes

### The Claude model family

Claude is a family of models that currently spans four tiers: Fable, Opus, Sonnet, and Haiku. Each model represents a different tradeoff across cost, latency, and capability. Sonnet is the balanced default for most production workloads. Haiku is built for speed and cost efficiency on tasks that fit its capability envelope. Opus handles demanding work above the Sonnet envelope, and Fable is the most capable tier, built for the most demanding reasoning, coding, and agentic work where maximum intelligence is the priority. The practical default is to start with Sonnet, move up a tier only when an eval shows the current tier missing your quality bar, and move down to Haiku only when an eval shows the quality drop is acceptable for the task. Confirm the current model lineup and identifiers against platform.claude.com/docs at build time, since the Claude family is evolving.

### Reasoning modes are a separate setting from model choice

Choosing which model to run is one decision. Whether the model reasons before answering is a separate decision you make per call. On current models the reasoning mode is adaptive thinking: the model decides when and how much to think, and you tune depth with an effort setting rather than a fixed token budget (the older budget_tokens control is deprecated and, on the newest model generations, returns a 400 error). Thinking content is omitted from responses by default on the newest models. Request summarized display when you need to show it. Reasoning earns its cost on hard, multi-step problems and is wasted on lookups and classification. The key point for this module is that the two levers compose: model choice picks the family member, while the reasoning mode is configured per request. Per-model defaults differ (some of the newest models think adaptively by default or always), so confirm the current thinking defaults for your model at build time.

### How the two work together

Because model choice and reasoning mode are independent, each can be set separately. A capable model with reasoning off is fast and direct, while a smaller model with reasoning on spends more tokens to think. The most demanding tasks pair a capable model with a higher effort setting. Module 2 teaches the mechanics of enabling reasoning and handling the thinking blocks it returns. The decision of which model to run, weighed against cost, latency, and quality, is taken up in Module 4.

## Prompting modes: zero-shot, one-shot, multi-shot

### The three modes

Separate from how you word a prompt is how many worked examples you give the model inside it. Zero-shot gives the instruction and no examples: you describe the task and ask for the result. One-shot adds one example of the input paired with the desired output. Multi-shot, also called few-shot, includes several such examples. The examples are not training data; they sit in the prompt and show the model the exact shape of the answer you want, which a description alone often fails to pin down.

### The cost and quality trade-off

Each example you add costs tokens on every call and consumes context budget, so the choice trades quality against cost. Reach for zero-shot when the task is simple and the output shape is obvious. Move to one-shot or multi-shot when the output has a specific structure, casing, or edge case that a description keeps missing. Often one or two correct examples usually fix the issue faster than another paragraph of instructions. The general discipline, which Module 2 reinforces, is to add the smallest amount of prompt that produces a reliable result.

### Mode choice interacts with model choice

Prompting mode and model choice are related levers. A more capable model often succeeds zero-shot on a task where a smaller model needs a few examples to match the structure, so adding examples can let a cheaper model do the job. The two decisions are worth making together: try the simplest model and the fewest examples that meet your eval, and add capability or examples only where the eval says you need them.

## The technical substrate: SDKs, REST, streaming, async

### How a developer reaches Claude: SDK versus raw REST

At its core, Claude is reached over an HTTP REST API: your code sends a request to an endpoint with your API key and a JSON body, and reads a JSON response back. You can call that endpoint directly with any HTTP client. More commonly you use an official SDK, available for Python and TypeScript among others, which is a thin convenience layer over the same REST API. It handles authentication, request construction, retries, and response parsing so you write less boilerplate. The SDK and raw REST reach the same API and the same model. The SDK saves you from assembling requests by hand. Module 2 builds against the SDK and the Messages API, which sits on this same foundation.

### Synchronous, streaming, and real-time responses

A synchronous request is the simplest pattern: you send the request and wait for the complete response to come back in one piece, then act on it. That is fine for short responses and backend jobs where no one is waiting. When a response is long or a user is watching, streaming sends the response in pieces as the model generates it. Output appears immediately rather than after a blank-screen wait, and your code reassembles the pieces into the final message. Claude exposes streaming over the same HTTP connection using server-sent events. Module 2 teaches how to consume a stream safely and recover when it is interrupted.

### Asynchronous patterns for high-volume work

Two patterns address high-volume work, and they solve different problems.

The Python SDK exposes an async client (AsyncAnthropic) that uses non-blocking async/await to make API calls without tying up your application thread. In the TypeScript SDK the standard Anthropic client is Promise-based, so you await calls directly. There is no separate async client class. Either way the request still returns in real time, but your application can handle other work while it waits. This is the right pattern when you need concurrency without blocking.

The Message Batches API is a separate pattern for bulk offline workloads. You submit a large set of requests in one call, receive an identifier, and poll for completion. Batch jobs can take up to 24 hours to complete and run at a lower per-token cost in exchange for that latency. This suits offline pipelines, evaluation runs, and bulk jobs where no user is waiting on each result and cost matters more than turnaround time.

## LLM Fundamentals — model specifications

**Supplementary section — sourced from Anthropic documentation, not part of the original course material.** Source: [Models overview](https://platform.claude.com/docs/en/models/overview), retrieved 28 September 2026. Model-specific numbers move between releases; treat the shape of each distinction as the durable part and re-check the figures against the live page before you rely on them.

### Context window and maximum output are two separate ceilings

A model's context window is the total budget for everything the model processes in a request. Its maximum output is a separate, smaller cap on what one response may generate. Claude Fable 5.1, Claude Opus 5.5, and Claude Sonnet 5 carry a 1M-token context window and a 128K-token maximum output; Claude Haiku 4.5 carries a 200K-token window and a 64K-token maximum output. The maximum-output figure is the synchronous Messages API limit — on the Message Batches API several models accept a beta header that raises the ceiling to 300K output tokens.

Two consequences follow. A request can fit comfortably inside the context window and still be truncated because generation hit the output cap, which is a different failure from an oversized request rejected before generation. And a model with the larger window is not automatically the model with the larger response budget.

### Tokens are not words, and the ratio moved

On the tokenizer introduced with Claude Opus 4.7, 1M tokens is roughly 555k words or 2.5M Unicode characters. Models that predate that tokenizer fit roughly 750k words into the same 1M tokens. A capacity estimate written against an older model therefore over-counts how much text fits on a current one, and any budget calculation carried forward from an earlier generation needs re-measuring rather than scaling.

### Reliable knowledge cutoff is not the training data cutoff

Each model publishes two dates. The training data cutoff is the broader range of data the model saw. The reliable knowledge cutoff is the earlier date through which the model's knowledge is most extensive and dependable. For Claude Haiku 4.5 these differ by several months. When a design depends on the model knowing something without retrieval, the reliable knowledge cutoff is the date to plan against, not the training data cutoff.

### Adaptive thinking replaced the manual thinking budget

Adaptive thinking lets the model decide how much to think, steered by the `effort` parameter. It is always on for Claude Fable 5.1 and Claude Opus 5.5. Extended thinking — the manual `thinking.type: "enabled"` plus `budget_tokens` mode — is deprecated on Claude Opus 4.6 and Claude Sonnet 4.6 and is not accepted on later models. Each model also carries its own default effort, so the same request sent to two models can reason to different depths without any explicit setting.

### Every current model ID is a pinned snapshot

From the 4.6 generation onward, the dateless model ID is itself a pinned snapshot rather than a moving pointer. For earlier models the alias was a convenience pointer that resolved to a dated ID, which is where the classic unpinned-deployment risk came from. The `capabilities` object and the `max_input_tokens` and `max_tokens` fields returned by the Models API let an application read these limits at runtime instead of hardcoding them.

## Technical Fundamentals — rate limits and spend limits

**Supplementary section — sourced from Anthropic documentation, not part of the original course material.** Source: [Rate limits](https://platform.claude.com/docs/en/api/rate-limits), retrieved 28 September 2026.

### Two different limits produce two different failures

Spend limits cap what an organization can spend in a calendar month. Rate limits cap how many requests or tokens it may use over a short window. Both stop traffic, but they are not the same failure and they do not recover the same way.

A rate limit returns HTTP 429 with a `retry-after` header saying how long to wait. A tier spend cap also returns HTTP 429 with error type `rate_limit_error` — but it carries no `retry-after` header, and retrying, including an SDK's automatic retries, keeps failing until access resumes at the start of the next month or the organization moves to a higher tier. The field that tells the two apart on the Messages API is `error.details.error_code`, which is `enforced_spend_limit_reached` for the spend cap.

A spend limit the organization set for itself behaves differently again: it returns HTTP 400 with error type `invalid_request_error`, not a 429 at all.

### Rate limits are measured on three axes, per model, per organization

Messages API rate limits are expressed as requests per minute (RPM), input tokens per minute (ITPM), and output tokens per minute (OTPM), and they apply separately to each model class. Using two models simultaneously draws on two independent budgets. Limits are set at the organization level and assigned by usage tier, and capacity is replenished continuously by a token-bucket algorithm rather than reset at a fixed interval — which is why a short burst can trigger a limit error even when the per-minute average looks safe.

The Message Batches API, the Files API, and Managed Agents endpoints each carry their own separate limits.

### Cached input usually does not count toward ITPM

For most current models only *uncached* input counts toward the input-tokens-per-minute limit:

| Field | Counts toward ITPM? |
| --- | --- |
| `input_tokens` — tokens after the last cache breakpoint | Yes |
| `cache_creation_input_tokens` — tokens being written to the cache | Yes |
| `cache_read_input_tokens` — tokens read from the cache | No, for most models |

Total input is the sum of all three, so `input_tokens` alone understates a request's real size whenever caching is in play: a 200k-token cached document with a 50-token question reports `input_tokens: 50`. Because cache reads are exempt, prompt caching raises effective throughput without any change to the configured limit — a 2,000,000 ITPM limit at an 80% cache hit rate processes roughly 10,000,000 total input tokens per minute. Claude Haiku 3.5 is the documented exception that does count cache reads toward ITPM.

OTPM is evaluated in real time against tokens actually produced, so `max_tokens` does not factor into it. Raising `max_tokens` carries no rate-limit penalty.

### The response headers report the binding constraint

Every response carries `anthropic-ratelimit-*` headers for the request, token, input-token, and output-token limits, each with a limit, a remaining count, and an RFC 3339 reset time. The `anthropic-ratelimit-tokens-*` family reports whichever limit is currently most restrictive, so if a workspace limit is binding those headers describe the workspace limit rather than the organization's. Workspace limits exist to stop one workspace from consuming an organization's whole budget; organization-wide limits always apply on top, even when the workspace limits sum to more.
