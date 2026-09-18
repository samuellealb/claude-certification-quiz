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
