Halverson Supply's assistant exposes both search_catalog and check_location_inventory. Both descriptions mention the words inventory and availability without distinguishing scope, and either call validates against the arguments a picker supplies. After someone added the system-prompt line always confirm product details before answering any inventory question, bay-level stock checks started landing on the catalog-wide search even more often. What design problem is creating this failure?
A
The API may merge the definitions and expose only the first tool with that parameter signature
B
Selection becomes dependent on definition order, with the later tool taking precedence whenever both schemas validate
C
If their names and descriptions also overlap, Claude lacks a clear routing boundary and may choose the wrong tool
D
Both calls execute whenever the shared argument shape validates, even if Claude selected only one tool
E
Claude will route by comparing parameter types, so matching schemas make descriptions less important but do not affect accuracy

=====================

Every misrouted bay check at Halverson Supply ends the same way: someone adds another paragraph to check_location_inventory explaining when to prefer it over search_catalog. Four rewrites in, the boundary is still hard to state in a sentence, and edge cases such as a partially received pallet still route inconsistently. What does the need for increasingly elaborate disambiguation signal about the tool design?
A
That the tools should merge into one tool with a type parameter rather than more separating text
B
That the exclusion conditions belong in the system prompt, where they apply before selection begins
C
That one tool should be withdrawn and its behavior folded into the surrounding application code
D
That parallel tool calling should be disabled so a wrong choice cannot compound within one turn
E
That the input schemas should diverge, since parameter types are what break a tie between descriptions

=====================

A workload can cache a long prefix, but writing that prefix costs more than ordinary input while later cache reads cost much less. One workload reuses the prefix repeatedly within its lifetime; another changes or expires it before reuse. Given those billing mechanics, when does prompt caching actually reduce total spend?
A
When reads outnumber writes, since a write costs a premium over input and a read only a fraction
B
When the prefix is short, since the write premium scales with the number of tokens stored
C
When the cached prefix changes rarely, since a write is billed at the same rate as ordinary input
D
Whenever caching is left on, since the system amortizes each write across every later request
E
When the breakpoint sits after the user message, so the whole request including the question is reused

=====================

Verity's extraction pipeline has two independent contracts: the trial database parses the final answer and requires a fixed JSON shape, and the dosage-reconciliation function must never receive malformed arguments from the model. An engineer proposes writing the extraction schema once and assuming it protects both boundaries. What configuration is actually required to guarantee each contract?
A
A response format constraint alone, since tool arguments are validated against the input schema already
B
The strict flag alone, since a strictly validated tool call also constrains the response that follows
C
Neither, since a schema constraint applies to one request and cannot hold across a multi-step loop
D
Both: a response format constraint for the answer, and the strict flag on the tool definition
E
One JSON schema supplied once, since a single constraint governs both responses and tool arguments

=====================

