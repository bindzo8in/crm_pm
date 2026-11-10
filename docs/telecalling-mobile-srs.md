# Mobile Telecalling CRM - Software Requirements Specification

**Version:** 0.1  
**Status:** Proposed requirements for review  
**Date:** 2026-11-10

## 1. Purpose

Specify a mobile-first telecalling workspace integrated with the existing CRM. Agents need to work assigned prospects, make and log calls, capture consent before recording, review transcripts and AI-generated conversation signals, and schedule the next action. Supervisors need operational call and follow-up reporting.

The requested “customer mood” analysis is specified as a **tentative conversation-tone signal**. It must not be presented as a verified emotional state, diagnosis, or standalone basis for a sales or eligibility decision.

## 2. Current-system context

The CRM has customer and contact records, user roles, proposals, projects, and reporting. The existing `Customer` model does not provide a lead pipeline or store call records, recording permissions, transcripts, or AI analysis. The mobile UI delivered with this specification is a design prototype using sample data; it does not place calls, record audio, persist leads, or call an AI service.

## 3. Product goals and measures

- Give agents one mobile queue for assigned leads and due follow-ups.
- Reduce missing call outcomes and untracked next steps.
- Make consent status and recording state understandable before any audio capture.
- Make AI output reviewable, evidence-linked, confidence-qualified, and correctable.
- Give supervisors reliable operational metrics without treating inferred tone as ground truth.

Candidate pilot measures: percentage of calls with a saved disposition, percentage of qualified leads with a next action, follow-up completion rate, and agent correction rate for generated summaries. Baselines and targets must be agreed before pilot.

## 4. Users and permissions

| User | Core permissions |
|---|---|
| Telecalling agent | View assigned leads, call/log activity, capture consent, review and correct generated summaries, schedule follow-ups |
| Supervisor | View team queue and aggregate call/follow-up metrics; access individual recordings only when explicitly authorized |
| CRM administrator | Configure integrations, roles, retention, consent copy, and supported lead stages |

All server operations must enforce authentication, authorization, assignment/team boundaries, and audit logging. Hiding a control in the mobile client is not authorization.

## 5. Scope

### MVP scope

- Mobile-first responsive interface / installable web app integrated into the existing CRM.
- Lead queue, lead details, search/filter, assignment, priority, and lifecycle status.
- Call initiation through a selected telephony provider, plus manual call-result logging where calls are made outside the app.
- Consent capture and a no-recording path.
- Call metadata, recording storage where consent and applicable rules permit it, transcript, human-editable summary, follow-up, and audit trail.
- AI-generated summary, requested next step, extracted topics/objections, and tentative tone signal with confidence and transcript evidence.
- Agent correction and supervisor reporting.

### Not in MVP

- Autonomous AI calls or AI making promises, pricing, qualification, or eligibility decisions.
- Biometric identity verification or voiceprints.
- Inferring protected/sensitive traits, personality, deception, health status, or a customer's “true mood.”
- Social-media publishing, omnichannel inbox, predictive lead scoring, offline audio recording, or native OS call interception.

## 6. Assumptions and decisions required before build

1. Start with a responsive PWA in the existing Next.js CRM. A native iOS/Android client is a separate choice if background calling, OS-level dialer integration, or offline operation is required.
2. Choose a telephony provider, supported countries, caller-ID rules, and whether calls use in-app VoIP or the device dialer.
3. Confirm supported languages, dialects, and transcription quality targets.
4. Legal/privacy owners approve recording notice, consent evidence, permitted regions, retention periods, access, and deletion/export processes before enabling recording.
5. Select an AI/transcription provider and approve whether audio/transcript may be sent to that provider, including its retention and model-training terms.
6. Confirm lead stages, duplicate-matching rules, dispositions, team hierarchy, and conversion rules.
7. Treat AI tone analysis as optional and disable it where local policy or law does not allow it.

## 7. Functional requirements

### Lead queue and profile

- **FR-01:** Show an agent's assigned leads, overdue follow-ups, due-today count, and next-call action.
- **FR-02:** Search leads by name, company, phone, stage, and assigned owner; filter by stage, priority, source, and due date.
- **FR-03:** Create and update a lead with contact details, source, owner, stage, priority, notes, consent/opt-out status, and timestamps.
- **FR-04:** Detect likely duplicates using normalized phone/email and show a review action before creating another record.
- **FR-05:** Display the lead timeline, previous call outcomes, proposals, follow-up tasks, and customer conversion link.
- **FR-06:** Enforce soft deletion/archival and preserve lead/call audit history.

### Calls and recording

- **FR-07:** Start a call from a lead using the configured telephony integration, or log an external call manually.
- **FR-08:** Before recording, present the approved notice and capture consent outcome, timestamp, actor, policy/version, and channel. If consent is refused, unavailable, or required notice cannot be delivered, do not record; allow a non-recorded call log when permitted.
- **FR-09:** Clearly display recording state. Do not start recording until the required consent state is recorded and provider controls confirm recording is enabled.
- **FR-10:** Save call direction, provider reference, participants, start/end time, duration, outcome/disposition, recording state, and associated lead.
- **FR-11:** Provide access to an authorized recording through short-lived private access; do not expose public or guessable audio URLs.
- **FR-12:** Apply configurable retention and deletion/export rules to recordings, transcripts, and derived insights; record completion in an audit trail.

### Transcription and AI assistance

- **FR-13:** Produce a transcript only for an eligible call. Identify speakers where supported and show timestamps; mark low-quality or uncertain segments.
- **FR-14:** Generate a concise summary, customer-stated needs, objections/questions, requested callback time, and proposed next action.
- **FR-15:** If enabled, provide a tentative conversation-tone indicator with confidence and supporting transcript excerpts. Label it as an AI estimate, never as a fact about the customer's internal state.
- **FR-16:** Display source evidence for extracted claims and allow the agent to edit, reject, or mark an insight incorrect. Retain the original AI output and human correction for audit.
- **FR-17:** Do not use tone or AI output to automatically change lead status, send a proposal, set pricing, deny service, rank people, or trigger customer-facing messages.
- **FR-18:** Clearly label missing audio, failed transcription, unsupported language, low confidence, or model-service failure. Preserve call metadata and offer manual note entry rather than fabricating a successful analysis.

### Follow-up, conversion, and reporting

- **FR-19:** Create a dated follow-up task from a call outcome; display overdue and upcoming tasks in the agent queue.
- **FR-20:** Convert a qualified lead into the existing CRM customer record without losing lead history, call history, source, or consent evidence.
- **FR-21:** Provide supervisor reporting for calls attempted/connected, disposition, lead stage movement, follow-up completion, and conversion. Filter by date, team, and agent according to permissions.
- **FR-22:** Exclude raw audio/transcripts from aggregate dashboards by default. Allow access only to roles and purposes explicitly approved by policy.
- **FR-23:** Log reads of recordings and changes to consent, retention, assignment, call outcome, transcript, AI output, and lead conversion.

## 8. Proposed user flows and screen inventory

1. **Today / queue:** assigned work, due follow-ups, lead search, and compact workload signals.
2. **Lead profile:** contact methods, stage, history, notes, proposal/customer relationship, and call action.
3. **Pre-call consent:** approved notice, consent outcome, recording toggle/state, and a clear no-recording route.
4. **Call workspace:** call controls/provider state, elapsed duration, lead context, and optional note capture. The actual controls depend on provider capabilities.
5. **Post-call review:** transcript with timestamps, editable summary, evidence-linked AI suggestions, confidence, and correction controls.
6. **Follow-up:** outcome, next action, due date/time, and save confirmation.
7. **Insights:** agent and supervisor metrics with date/team filters and access controls.

The prototype route `/dashboard/telecalling` demonstrates these interaction states with sample data only. It is not a production telephony or AI integration.

## 9. Data and integration requirements

Recommended bounded entities (final names/schema subject to repository conventions):

- `Lead`: contact and company data, stage, source, assignment, priority, opt-out, timestamps, optional conversion reference.
- `CallActivity`: lead, agent, provider ID, direction, timing, outcome, duration, recording/consent state, audit metadata.
- `CallConsent`: call/lead, consent result, time, actor, notice version, channel, and evidence reference.
- `RecordingAsset`: private storage key, provider reference, content metadata, retention/delete state; never a public URL.
- `CallTranscript`: language, version, timestamped speaker segments, processing status, and source recording reference.
- `CallInsight`: model/provider/version, generated time, summary and extracted fields, evidence offsets, confidence, human edits, and processing status.
- `FollowUp`: owner, due time, status, call/lead reference, and completion audit.

Integrations: telephony provider webhooks/call control, private recording storage, speech-to-text/AI processing, push notifications, and existing CRM customer/user records. Use provider interfaces behind server-side adapters; never expose provider secrets in browser code.

## 10. Non-functional requirements

- **Privacy and security:** TLS in transit, encrypted private storage, least privilege, signed short-lived media access, validated webhooks, rate limits, secure secret management, and auditable data access.
- **Consent:** Recording remains off until the configured jurisdictional consent and notice requirements are met. Non-recorded calling must remain usable where possible.
- **AI transparency:** Show provenance, processing status, confidence/uncertainty, and agent correction. Do not claim emotion detection is objectively true.
- **Reliability:** A telephony or AI outage must not erase the lead, call metadata, or agent-entered notes. Retries must be idempotent and failures visible.
- **Performance target:** Lead queue and profile render within 2 seconds at the 95th percentile on supported mobile networks, excluding third-party telephony/AI latency. Validate with pilot telemetry.
- **Accessibility:** WCAG 2.2 AA target, screen-reader labels, keyboard operation, visible focus, sufficient contrast, and controls usable with one hand.
- **Mobile:** Support current iOS Safari and Android Chrome at small phone widths; respect safe areas, network changes, and responsive text. Background calling/offline recording are not assumed.
- **Localization:** Store timestamps consistently and display in the user's configured timezone. Language and number formatting must be explicit per region.
- **Retention:** Admin-configurable, policy-approved retention. Deletion must cover associated audio, transcript, and derived data according to policy and provider guarantees.

## 11. Acceptance criteria

- An agent can find an assigned lead, view its history, record a call outcome, and schedule a follow-up on a phone viewport.
- A call cannot enter a recording state before the applicable consent process completes; refusal results in no recording.
- A failed AI job remains visibly failed and permits manual notes; it cannot display fabricated transcript or summary data.
- Every displayed AI claim can be traced to source transcript evidence or marked as unsupported/uncertain.
- An agent can correct a summary or insight, and the UI distinguishes generated content from the human-edited result.
- A lead can be converted to a CRM customer while preserving the original lead and call history.
- Unauthorized users cannot access another team's lead, recording, transcript, or call analysis by changing client-side identifiers.
- Supervisor reports show only authorized data and do not expose raw audio/transcript by default.
- Recording access and changes to consent, lead stage, call outcome, and AI correction are auditable.

## 12. Delivery phases and effort

| Phase | Deliverable | Indicative effort |
|---|---|---:|
| Discovery and vendor/privacy decisions | Provider selection, language, consent and retention approval, acceptance examples | 2-4 person-days |
| Lead model and workflow | Validated lead lifecycle, queue, assignment, duplicate checks, customer conversion | 4-6 person-days |
| Call integration and consent | Call initiation/logging, provider webhooks, consent and recording controls | 4-6 person-days |
| Transcript and AI review | Processing states, transcript, evidence-backed summary/insights, human correction | 4-6 person-days |
| Follow-ups, reporting, and hardening | Tasks, permissions, audit, mobile testing, failure cases, release checks | 6-8 person-days |
| **Indicative MVP total** | Assumes selected vendor APIs and access are ready | **20-30 person-days** |

These are planning estimates, not measured durations or a delivery commitment. Vendor onboarding, legal review, provider limitations, and language accuracy can materially change the schedule. The current responsive UI prototype is not counted as production feature implementation.

## 13. Risks and open questions

- Which countries and languages will be supported in the first release?
- Which telephony and transcription/AI vendors are approved?
- What consent notice, opt-out, retention, access, and deletion rules apply?
- Should agents use in-app calling or the native dialer?
- Is a PWA sufficient, or are native call/background capabilities required?
- Which lead stages, call dispositions, and conversion criteria match the sales process?
- Who may access recordings and transcripts, and for what purpose?
- What is the approved use of conversation-tone analysis, and should it be enabled at all in the pilot?

