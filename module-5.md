# Developer - Accelerators and IP Contribution

## Packaging for Reuse

### Packaging a working build so the next engagement starts from an asset

You finished the prior modules with a build that runs: an agent loop, a configured MCP server, and an eval that proves the prompt works. The most time-consuming and expensive thing on a team is the engineering time spent rebuilding the same thing for the next customer.

### What an accelerator does: keep the reusable parts and separate out the rest

An accelerator is a solution packaged so future engagements start from a working foundation rather than from a blank repository. In blueprint terms, this is packaging for reuse: separating engagement-specific code from the reusable core and parameterizing the rest. Take a working build, separate the parts that are customer-specific, and expose them as parameters with documented defaults. The asset then configures rather than gets entirely rewritten. Packaging for reuse while the build is fresh is cheaper than reconstructing the intent months later, when the person who knew why a value was hardcoded has moved on.

Most reusable work falls into different asset types, and each one packages differently. Most reusable work falls into one of three categories used throughout this module: a template, a configurable server, or a portable eval. Each type holds a different kind of work and needs to be packaged in its own way. Reaching for the wrong type can make an asset look reusable while still making it difficult to apply.

| Asset type         | What it bundles                                                                             | What correct packaging requires                                                                                                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent Template     | The system prompt, the tool schemas, and the loop structure from a working agent.           | Pull the domain-specific values into configuration with documented defaults, so a new team sets the values rather than editing the loop.                                                                                                                                                                        |
| MCP Server Package | The tools the server exposes, with their inputs and the scope the installing team controls. | Document each tool input and let the installing team set the scope, so the server installs into a new environment without code edits.                                                                                                                                                                           |
| Eval Suite         | The graded test set and the judge rubric that prove the asset works.                        | Ship the dataset and rubric together so a new team can run them in their own context and confirm the asset still works there. The same eval suite also acts as the gate at deployment. When you promote a new model version to production, run it against a pinned baseline score before the version goes live. |

Shipping an agent as a set of loose scripts instead of a template is the most common version of the wrong approach. The scripts run, so they look reusable, but every customer-specific value is buried in a different file, and the next team copies and diverges them instead of configuring one asset.

### Document both the code and the assumptions

Code describes behavior. Documentation covers what a future builder cannot reliably infer from reading the source: the assumptions the asset makes about its environment, the inputs it expects, the failure modes it already handles, and the eval that defines whether it still works. Without this, the next team treats the asset as a black box and rebuilds it.

### Bundle the audit log as part of the package

A regulated customer's reviewer asks what data the asset touches, what identity it acts under, and what log it leaves. An accelerator without these passes a demo and stalls at the first security review. Treat the audit log as part of the package.

### The packaging checklist

Keep this checklist next to the build while you package it. Each column is a decision you make once per asset.

| Asset type     | What to parameterize                                                                                     | What to document                                                                                    | What to bundle for audit                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Agent template | Every value that changes per customer: prompts, paths, scopes, credentials by reference, and thresholds. | Environment assumptions, expected inputs, handled failure modes, and the eval that defines working. | The data touched, the identity acted under, and the log of what the asset did. |
| MCP Server     | Scopes, credentials by reference, and per-customer paths.                                                | Expected inputs per tool, scope boundaries, and handled failure modes.                              | The data touched, the identity acted under, and the log of what the asset did. |
| Eval Suite     | Thresholds and dataset paths that change per customer or environment.                                    | The rubric logic, what the scores mean, and the baseline the asset is pinned to.                    | The data touched, the identity acted under, and the log of what the asset did. |

### Decision guide

- Handles well: Parameterizing while the build is fresh turns one delivery into an asset the next engagement configures in hours.
- Adds cost or complexity: Separating generalizable from customer-specific parts and documenting assumptions adds real time to the first build.
- Use a different approach: For a one-off a customer will never reuse, packaging overhead is not worth it: ship the build and move on.

## Contributing back

### Moving an asset from private reuse into shared infrastructure a maintainer accepts

You have already done most of the work that makes an asset shareable. When you packaged it for your own team to reuse, you pulled out the parameters, wrote down the assumptions, and bundled the eval. The parameters show the asset can be configured rather than rewritten. The documented assumptions tell the maintainer what environment the asset expects. The bundled eval gives them a way to confirm it still works. An asset packaged for internal reuse is already close to what a maintainer needs to accept it.

The contribution channel is designed to receive that packaged asset. It carries the version, the installation steps, and the components as a single unit, so a team that never spoke to you can install it and get the same working setup.

### Match the contribution to the channel built for it

Contributing back means moving an asset from private reuse to shared infrastructure through a documented channel. Each channel is built for a specific kind of contribution. The Claude Cookbook is a GitHub repository of focused reference implementations. It is designed for self-contained single- or multi-pattern implementations demonstrated clearly and working end to end. Open-source MCP servers and tools each live in their own repository with their own contribution conventions. Sending a full multi-component application to the Cookbook is a mismatch. The repository is set up to review one focused pattern rather than an entire application, so a submission that large does not fit what reviewers are looking for and will stall. The first step is matching the contribution to the channel built for it. Putting a full application where a focused example belongs is one of the most common reasons a contribution never gets reviewed.

#### What makes verifying a contribution possible

A maintainer accepts a contribution they can verify. The bar is set by what they need to check, not by how clever the code is. Four things make that verification possible:

1. The code does one thing. A sprawling contribution forces a reviewer to reconstruct your intent before evaluating it.
2. An example shows it running. A reviewer should not have to build a harness to see the behavior.
3. A test proves it works. A test lets a maintainer verify the result without reproducing the reasoning themselves.
4. A short statement names the assumptions. Otherwise, the first failure becomes the maintainer's problem.

### Rights and attribution come before technical review

Licensing and attribution decide whether a contribution can be accepted at all, which is why they come before the technical review. Code carried in from a customer engagement may have constraints on where it can go. Confirming you have the right to contribute it, and attributing anything you built on, is a gate the contribution must pass first. Skipping this is what turns a contribution into a problem the legal team must unwind later.

The example worked here is the customer service agent case. A reusable conversation-handling pattern, built during an engagement, gets stripped of customer specifics and prepared as a general example for the Cookbook. The contribution-back motion is shared across all three roles in this curriculum. Your job as the Developer is technical readiness: the focused code, the example, the test, the assumptions, and the rights check. The engagement context comes from the broader team.

#### The contribution-readiness reference

| Channel | What a maintainer checks | Licensing and attribution | The example and test bar to clear |
| --- | --- | --- | --- |
| Cookbook | For a focused example, or the tool or server's own repository for a tool or fix. | Confirm that you have the right to contribute code from an engagement, with prior work attributed. | A runnable example plus a test that proves the behavior, not just a description of it. |

#### Handles well

A packaged asset needs only the example, test, and rights check to become shared infrastructure others build on.

#### Adds cost or complexity

Clearing the maintainer bar and the licensing gate is real work on top of making the code run for you.

#### Use a different approach

When code carries an engagement licensing constraint you cannot clear, do not contribute it: escalate to the owner instead.

## Requirements & Lifecycle

### From business requirements to functional and infrastructure requirements

The deployment-platform decisions that follow all assume the requirements already exist: the residency rule, the latency target, the identity model. This screen is where those requirements come from: turning a business problem into the functional and infrastructure requirements a deployment decision can be defended against.

#### Capturing functional requirements from a business problem

A functional requirement names what the system must do, stated with enough detail to check. A business problem (e.g. "help support agents answer faster") is not yet a requirement; the functional requirements derive from it (e.g. "classify each ticket into one of four queues; draft a reply citing the relevant policy; never auto-send without human approval"). The discipline is to write each as a checkable statement of behavior. A vague goal cannot be designed against or verified, while a specific one becomes a line in an eval and a criterion at review.

#### Deriving infrastructure requirements

Infrastructure requirements are the non-functional constraints the deployment must satisfy. Most of them are not stated in the business problem; instead, you derive them by asking the questions the business problem implies. Latency: how fast does a response need to be, measured where the user is? Scale: how many requests, and at what peak? Residency: where must the data be processed, and under which regulation? Identity: who acts, under what credentials, and what must be auditable? Latency, scale, residency, and identity are the infrastructure requirements that most often decide the deployment platform, and they are easiest to capture at the start, before a platform is chosen for other reasons.

#### Documenting requirements so a decision can be defended

Requirements are written down because the deployment decision will be reviewed by people who did not gather them. A short requirements record covering the functional behaviors, the infrastructure constraints, and the regulation each constraint comes from lets you defend a platform choice as following from the requirements rather than from familiarity. This record is the input the next screen's deployment decision reads from.

#### Handles well

Turning a business problem into checkable functional and infrastructure requirements before any platform is chosen.

#### Adds cost or complexity

Eliciting infrastructure constraints up front takes a scoping conversation the team is tempted to skip.

#### Use a different approach

For a throwaway prototype with no review and no regulated data, lightweight notes are enough.

### Systems lifecycle for Claude applications

The requirements you just captured are the first phase of a longer arc. This screen names that arc as the systems lifecycle, so the deployment, versioning, and boundary work in the rest of this module sits in the right phase rather than arriving as unrelated tasks.

#### The lifecycle phases applied to a Claude application

A Claude application moves through the same lifecycle as any engineered system, with the model work mapped onto it:

1Requirements: capture functional and infrastructure needs
2Design: choose the platform, the model, and the trust boundaries
3Build: write the agent, tools, and prompts
4Test: evals, unit, integration, and end-to-end checks
5Deploy: pin the version, gate promotion on the eval
6Operate: instrument cost, latency, and errors; enforce guardrails
7Iterate: feed production findings back into requirements
The phases are the same ones the earlier modules taught one at a time. Identifying them as a lifecycle is what shows how they connect.

#### Gating between phases

A gate is a decision to move from one phase to the next, and it is where a regulated engagement keeps control. You do not move from design to build until the platform satisfies the residency requirement; you do not move from deploy toward full production until the new version clears the eval against the pinned baseline. Placing engineering work in the right phase, and refusing to skip a gate, is what keeps a Claude application reviewable.

- **Handles well**
  Placing each piece of engineering work in the lifecycle phase it belongs to, with a defined artifact and gate.

- **Adds cost or complexity**

Gating between phases adds checkpoints a team under deadline is tempted to skip.

- **Use a different approach**

A one-off experiment may collapse phases, but a regulated deployment cannot.

## Deployment & Versioning

### Choosing where a Claude workload runs and versioning what ships

A packaged asset and a contributed one are both merely code until something runs them. The asset now faces a different question: where it runs and how to lock its version, so an upstream change does not become an untracked change in production. That platform decision is rarely about technical merit alone. In practice, it is usually shaped by where the customer already has cloud infrastructure, identity management, and compliance agreements in place. The first question is usually about which platform the customer already trusts and operates on.

### The customer's cloud usually determines the platform

The deployment platform is the environment where the Claude workload runs. The same model can run in several deployment environments, and the customer's existing cloud usually determines which one. The first-party Claude API is Anthropic's own environment and typically receives new features first. Claude Platform on AWS is accessed through the customer's AWS account using Anthropic's own model IDs and lifecycle; inference is Anthropic-operated, outside the AWS boundary. Amazon Bedrock offers two integrations: Claude in Amazon Bedrock uses the Messages API at /anthropic/v1/messages with broad feature parity; confirm any feature-specific requirements against the Bedrock documentation, as a features-not-supported list exists, while Claude on Amazon Bedrock (legacy) uses the InvokeModel/Converse APIs with ARN-versioned identifiers. Google Vertex AI does the same inside Google Cloud. Third-party platforms, such as Microsoft Foundry, embed Claude inside a product the customer already uses. Microsoft Foundry offers Claude in two hosting forms: Hosted on Azure (currently Claude Opus 4.8, Claude Sonnet 5, and Claude Haiku 4.5, with inference running end-to-end on Azure infrastructure, generally available) and Hosted on Anthropic (all other Foundry Claude models, with inference on Anthropic-operated infrastructure). Residency assumptions for regulated customers depend on the hosting form of the specific model. Confirm the hosting form and the current model split with Microsoft at build time.

#### Identity and data residency are important for security

Identity and data location are answered by the platform, not your code. Bedrock uses AWS identity and keeps data inside the customer's AWS boundary; Vertex uses Google Cloud identity and boundary. Both offer regional routing when residency is a constraint. Matching the platform to the customer's existing compliance agreement avoids a data-residency review from scratch.

#### Pin the version so an upstream model change is not a silent production change

Versioning is what keeps a model or prompt change from becoming a silent change in production. Every Claude model ID points to a specific model snapshot. Aliases such as Opus and Sonnet are convenient, but they evolve over time and may resolve to different versions across deployment platforms. A pinned full model ID resolves to a fixed snapshot. Pin the specific model version rather than the alias, so an upstream model update is a deliberate choice rather than a silent production change. Then version the prompt and the asset alongside the code. Finally, keep the prior version available so the regression can be rolled back. An unpinned deployment makes every upstream model update an untracked change to your output.

The first line follows a moving alias. The second pins the snapshot.

```python
# Pre-4.6 example: a convenience alias can resolve to a new
# version without you knowing
model = "claude-haiku-4-5"

# Pre-4.6 pinned snapshot: the version is fixed until you change this line
model = "claude-haiku-4-5-20251001"
```

For Claude 4.6 and later, the model ID alone pins to a specific snapshot; for earlier models, the ID plus a date suffix is required. Verify the current convention at platform.claude.com at build time.

#### Promote a version through the eval

Gate promotion on the eval suite. Send a new version to a portion of traffic, compare against the pinned baseline, and promote or roll back on the result. This is where the eval stops being a one-time test and becomes the deployment gate.

#### The deployment-platform decision table

| Platform | Identity and data model | When to choose it | How versioning is pinned |
| --- | --- | --- | --- |
| First-party Claude API | Anthropic identity and terms. | The customer has no binding cloud or residency constraint and wants the newest capabilities. | Pin the full model ID and keep the prior snapshot. |
| Claude Platform on AWS | Anthropic identity and terms, accessed through the customer's AWS account; inference is Anthropic-operated outside the AWS boundary. | The customer is on AWS but wants Anthropic model IDs, lifecycle, and feature parity with the first-party API. | Pin using the same model ID format as the Claude API (for example, claude-opus-4-8). Lifecycle follows Anthropic's schedule. (Confirm at publish time.) |
| Claude in Amazon Bedrock | Messages API at /anthropic/v1/messages, broad feature parity with the first-party API; confirm feature-specific requirements against the Bedrock documentation. Data stays inside the customer's configured AWS boundary. | The customer is on AWS, wants broad feature parity with the first-party API (confirm feature-specific requirements), and holds a compliance posture there. | Pin the full model ID using the anthropic. prefix format. Partner retirement dates differ from Anthropic's schedule. Confirm at publish time. |
| Claude on Amazon Bedrock (legacy) | AWS identity and billing, InvokeModel/Converse APIs with ARN-versioned model identifiers. | The customer is on an existing Bedrock integration using InvokeModel or Converse and has not migrated to the Messages API. | Pin via ARN-versioned model identifiers per Bedrock's versioning controls. |
| Google Vertex AI | Google Cloud identity, Identity and Access Management (IAM), and billing, with regional or global endpoints for residency. | The customer is on Google Cloud and holds a compliance posture there. | Pin the full model ID before rollout using Vertex's model ID format. Partner retirement dates differ from Anthropic's schedule. |
| Third-party platform | The wrapping product's identity and billing model. Note: Claude in Microsoft Foundry offers two hosting forms: Hosted on Azure (currently Opus 4.8, Sonnet 5, and Haiku 4.5; inference end-to-end on Azure) and Hosted on Anthropic (all other Foundry Claude models). | The customer already runs the platform that embeds Claude. | Pin per the platform's versioning controls. |

- Handles well: Matching the platform to the customer cloud and pinning the version keeps a migration reviewable and a rollback possible.

Adds cost or complexity
Pinning, retaining prior versions, and gating promotion on the eval add release-process overhead to every deployment.

Use a different approach
For a throwaway prototype that never touches production, a moving alias is fine: pinning is for what ships.

## Comparing Platforms

### Measure latency from the customer's region

Latency depends on where the platform runs relative to the customer and on how access to new features is routed. A platform running in the customer's own cloud region can reduce round-trip time compared to a first-party endpoint located farther away. The trade-off is timing of access: the first-party API typically receives new capabilities before they reach other platforms. The number is only accurate when you measure it from the customer's actual region against their actual payload. A measurement from your laptop hides the round-trip penalty that appears once the workload runs where the customer is. Within Bedrock specifically, the choice between global and regional endpoints is also the primary residency control and can affect cost. You should measure from the customer's actual region against both options before committing.

### Compliance often determines the platform

Compliance is often the dimension that ends the debate. A customer who already holds a certification on one cloud is unlikely to re-certify on another. Data residency is a rule that a customer's data must be processed in a specific country or region. Available compliance certifications and who can audit access differ by platform, and a regulated financial or healthcare customer treats these as pass-or-fail rather than as tradeoffs to balance. The first-party Claude API may not offer EU data residency; confirm current regional coverage at platform.claude.com, since EU-only residency typically requires Bedrock or Vertex AI; on third-party platforms such as Microsoft Foundry, hosting is per-model: Azure-hosted Foundry models run inference end-to-end on Azure infrastructure, while Anthropic-hosted Foundry models do not satisfy EU regional residency requirements. Residency must be confirmed per model and deployment with Microsoft. Raise the compliance constraint during scoping, or it surfaces at contract review after the work is done.

### What drives total cost beyond the per-token rate

Per-token rates are broadly aligned across platforms; total cost moves on egress, platform fees, and integration effort. A lower token price can cost more in total once data transfer and integration are factored in. Instrument cost per call for each platform. Confirm the current pricing pages at scoping.

#### The cross-platform comparison reference

| Dimension | How it differs by platform | How to measure it | Where each platform wins |
| --- | --- | --- | --- |
| Latency | A platform in the customer's region shortens the round trip, while the first-party API may reach new features first. | From the customer's actual region against their actual payload. | An in-region cloud platform wins on round-trip latency, while the first-party API is advantaged on earliest feature access. |
| Compliance | Data residency, certifications, and audit controls are determined by the deployment platform. | Against the customer's existing certification and residency requirements during scoping. | The cloud platform the customer has already certified wins, because it needs no re-certification. |
| Cost | Token price, data egress, platform fees, and integration effort all vary. | Total cost per call per platform, including egress and integration, rather than token price alone. | The platform with the lowest total cost for the actual workload wins, which is not always the cheapest token. |

- Handles well: Measuring all three dimensions per platform turns a placement into one a procurement team will sign off on.
- Adds cost or complexity: Instrumenting latency, compliance, and cost across platforms requires real measurement work before any code ships.
- Use a different approach: When the customer's compliance requirement is already pass-or-fail, skip the full comparison. That constraint determines the placement on its own.

## Trust Boundaries

### Coordinating several Claude deployments with the trust boundaries holding under review

The accelerators, deployments, and tradeoffs now come together in a single application. Connecting components multiplies the places where identity, secrets, and untrusted input can cross. The discipline is to identify every boundary before connecting anything.

### Map which component does what before you connect them

A multi-component app coordinates more than one Claude capability into a single workflow. An API request might trigger a Claude Code task, which then reaches a customer system through an MCP server. Each component contributes a capability the others do not have. The challenge is that every connection between them creates a place where identity, secrets, and untrusted input can cross. Map which component does what before connecting anything.

### The trust boundary is where data moves

The trust boundary is the point where data or instructions move from one deployment environment to another. It is exactly where the injection and access controls from the prior module apply. Content fetched by a Claude Code task is untrusted when it reaches the next component. The receiving component should treat it as data, rather than as instructions, following the same principle used throughout the security module. The core discipline here is to identify every seam as a boundary. Don't assume a component is trusted simply because it worked correctly on its own.

### Least privilege applies to the whole application

Identity and least privilege, which means giving each component only the access its task needs and nothing more, apply to the application as a whole. Each component operates under an identity. The application is only as contained as its most privileged seam, which means a single component scoped too broadly becomes the weak point even when every other component is properly scoped. You scope each component to the least privilege its role in the workflow requires. This is what keeps a steered component from reaching beyond its intended task.

### Scoping for a regulated review pulls the module together

A regulated review requires justifying audit logging, data-residency decisions, and permission controls across the full application. For regulated deployments, Bedrock and Vertex AI are typically the platforms that satisfy regional residency constraints. Confirm ZDR and HIPAA BAA eligibility for each component against the Anthropic Trust Center and platform.claude.com before scoping.

#### The multi-component integration map

| Component | What it contributes | The trust boundary at its seam | The control that enforces it |
| --- | --- | --- | --- |
| First-party API | Orchestrates the workflow and holds the entry point. | The request entering the app from outside. | Input validation and the identity the call runs under. |
| Claude Code task | Runs the agentic work and may fetch external content. | Content it fetched, which is untrusted downstream. | Treat fetched content as data at the next seam. |
| MCP server | Reaches a customer system to read or act. | The system access it holds on the app's behalf. | Scope the server to least privilege and log the access. |

- Handles well: Naming every seam as a boundary and scoping each component to least privilege makes a multi-component app deployable under review.

Adds cost or complexity
Mapping seams, enforcing controls at each, and logging boundary crossings adds design and audit work to every integration.

Use a different approach
When a seam cannot be secured, do not ship around it: escalate to a human owner.
