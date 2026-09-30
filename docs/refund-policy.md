# Refund policy

Version: **2026-09-30.v1**. Currency: **USD**. This is a fictional store policy for the assessment, not legal advice or a statement of consumer rights.

The requested amount is the complete order total, stored as integer cents. The API does not accept an amount or replacement order facts from the customer or model.

Rules are evaluated in this order:

1. **Deny excluded orders.** An already-refunded order, a final-sale item, or an order more than 30 × 24 hours past its recorded delivery time is ineligible. Exactly 30 days remains eligible. These exclusions take priority over all later checks.
2. **Check delivery.** Missing, future, or unconfirmed delivery goes to human review.
3. **Check request consistency.** Suspicious instructions or conflicting claims go to human review. Detection is imperfect; it is a tripwire, not a guarantee that all manipulation is caught.
4. **Check value.** Amounts above $500 require human review. Exactly $500 is within the automatic limit.
5. **Reconcile the reason.** Damaged, incorrect and change-of-mind requests can qualify. The classification must agree with the selected reason and have confidence of at least 0.8. Other, uncertain, failed or refused classifications go to human review.
6. **Approve the eligible request.** Approval is a recorded eligibility decision. No payment is issued.

A support specialist can approve or deny an escalated request with a note of at least 12 characters. The server rechecks hard exclusions at review time, so a request that has aged beyond the window cannot be approved. This deliberately strict assumption could be changed to use the submission date in a real store. A support approval for unconfirmed delivery assumes the reviewer has checked delivery independently and records that in the note.

Every order can have one request, including a denied one. Corrections and appeals would require a separately designed reopen flow; they are not silently created as new refunds. Decisions already completed cannot be edited. The original decision, policy checks, classification and human review notes remain in the request record.

The offline classifier is a conservative keyword demonstration, not an LLM. Its mode is visible. When a configured AI provider fails, the app escalates; it does not silently switch to keyword approval.
