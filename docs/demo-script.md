# Three-minute walkthrough

1. **Introduce the product (15 seconds).** “This is Returnly, my refund-support assessment. It has a customer portal and a support desk, backed by a persistent order database. All 15 customers and 30 orders are synthetic.” Show the browser URL and the running Compose services.
2. **Customer flow (35 seconds).** Select Alex Morgan and the $38 ceramic mug. Explain that it arrived cracked, then submit. Show the approval and expand its policy checks. “The order amount and delivery date come from the server, not the message.”
3. **Policy denial (20 seconds).** Select Alex’s final-sale headphones and submit another damaged-item explanation. Show the denial. “The final-sale rule cannot be overridden by a confident AI classification.”
4. **Human review (45 seconds).** Switch to Jamie Chen, choose the $749 display and report a cracked screen. Show the escalation. Open the support desk, select that request, inspect the classification, checks and audit entries, then add a review note and approve. Return to the customer portal and show the updated result.
5. **AI and architecture (40 seconds).** “React calls an Express API. A small service loads the order, asks the model for a structured classification, runs a pure policy function, and stores the result and audit in SQLite. I used the OpenAI Responses API with a strict schema, a timeout and runtime validation. The model has no tools and cannot change prices or decide policy. Errors and ambiguous outputs go to human review.” If offline, explicitly say the recording uses the labelled keyword demo and distinguish it from the implemented API path.
6. **Trade-offs and verification (25 seconds).** “This is deliberately a single-order refund demo. It does not move money or verify damaged goods. The public customer switch and shared support key need real authentication before deployment. Tests cover boundaries, duplicate requests, concurrency, access control, AI failure, and the end-to-end UI.” Show the repository and test commands.

Use your own words and be ready to explain the code. Avoid claiming the offline classifier is an LLM or that an approved request issued a payment.

## Questions to prepare for

- **Why no agent framework?** One bounded classification call and deterministic rules are sufficient. A framework would add orchestration without a useful extra responsibility.
- **Why SQLite?** One process and a small synthetic dataset do not require an independent database server. Named-volume persistence and constraints make it reproducible. PostgreSQL would be appropriate for multiple backend instances and richer reporting.
- **What happens on retry?** The same customer/key/body returns the stored request; altered key reuse or another request for the same order conflicts. A database uniqueness constraint handles races after the asynchronous AI call.
- **Is it prompt-injection proof?** No classifier proves that. The important boundary is that the model cannot edit trusted order facts, execute actions or override hard policy. Suspicion flags and escalation add defense in depth.
- **What would you build next?** Real customer/staff identity, return-evidence workflow, individual audit actors, payment-provider idempotency, appeals, observability and a larger multilingual evaluation set.
