# Enterprise Client Request / Ticket Workflow Plan

## 1. Current PMS Baseline

The PMS already contains a safe starting point:

- Backend route: `server/src/routes/v1/modules/tickets.routes.js`
- Controller: `server/src/controllers/tickets.controller.js`
- Service: `server/src/services/ticket.service.js`
- Model: `server/src/models/Ticket.js`
- Frontend page: `client/src/pages/requests/RequestPortal.tsx`
- Client service: `ticketsService` in `client/src/services/api.ts`
- Route: `/requests`

Existing ticket support already includes basic ticket fields, inline comments, inline activities, SLA timestamps, assignment, status changes, and task creation on approval.

The enterprise implementation must extend this system instead of replacing it. Existing `/api/v1/tickets` endpoints remain backward compatible.

## 2. Target Workflow

```text
Client raises ticket
Auto classification and duplicate suggestion
Priority and SLA calculation
Manager review
Approval / rejection / hold
Impact analysis
Task, subtasks, sprint/milestone linking
Team leader and developer assignment
Development
Internal QA review
Staging deployment
Client verification
Revision loop when needed
Final approval
Production release / delivery
Closure
Feedback collection
```

Primary workflow statuses:

```text
DRAFT
OPEN
TRIAGED
UNDER_REVIEW
IMPACT_ANALYSIS
APPROVED
REJECTED
ON_HOLD
PLANNED
IN_PROGRESS
DEV_COMPLETE
QA_IN_PROGRESS
QA_FAILED
QA_APPROVED
STAGING_READY
STAGING_DEPLOYED
CLIENT_REVIEW
REVISION_REQUIRED
CLIENT_VERIFIED
FINAL_APPROVED
RELEASE_READY
RELEASED
CLOSED
```

Keep current statuses as accepted legacy aliases and map them internally:

- `TESTING` -> `QA_IN_PROGRESS`
- `COMPLETED` -> `CLIENT_VERIFIED` or `FINAL_APPROVED`, depending on context
- `CLOSED` stays `CLOSED`

## 3. Safe Migration Strategy

Use additive migrations only:

1. Keep the current `Ticket` collection and fields.
2. Add nullable fields to `Ticket` for enterprise metadata.
3. Move high-volume or security-sensitive data into new collections:
   - comments
   - files
   - activities
   - approvals
   - QA reviews
   - deployments
   - revisions
   - SLA events
4. Preserve inline `comments`, `activities`, and `attachments` for compatibility during phase 1.
5. Backfill new collections from inline arrays with an idempotent script.
6. Read from new collections first; fallback to legacy embedded arrays.
7. After validation, stop writing new inline records except for minimal compatibility summaries.

Recommended rollout:

- Phase 1: Add schemas, indexes, permissions, and compatibility services.
- Phase 2: Add enterprise APIs behind existing auth and RBAC.
- Phase 3: Upgrade React page into split dashboard/detail workflow.
- Phase 4: Backfill legacy tickets.
- Phase 5: Enable SLA jobs and notification automation.
- Phase 6: Add analytics dashboards.

## 4. Existing PMS Integration Strategy

Do not modify existing project/task behavior directly. Integrate through references:

- `Ticket.projectId` references existing `Project`.
- `Ticket.taskId` remains for the primary generated task.
- New `RequestTaskLink` records can store multiple linked tasks/subtasks.
- Generated tasks use existing `Task` model and statuses.
- Project sprint/milestone linking should use existing timeline/phase fields where possible: `phaseId`, `subcategoryId`, `dependencies`, `startDate`, `dueDate`.
- Notifications use existing `Notification` collection with added ticket notification types.
- Activity uses existing `ActivityLog` plus ticket-specific `RequestActivity`.
- RBAC uses existing role/custom permission services.
- Client visibility uses `Project.clientId`, `Project.visibleToClient`, `Ticket.creatorId`, and client membership context.

## 5. Database Schema Design

### Extend `Ticket`

Add nullable fields:

```js
module: String
environment: enum ['PRODUCTION', 'STAGING', 'DEVELOPMENT', 'UAT', 'OTHER']
impactLevel: enum ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
dueDate: Date
browserDevice: String
stepsToReproduce: String
expectedResult: String
actualResult: String
classification: {
  suggestedType: String,
  suggestedPriority: String,
  duplicateTicketIds: [ObjectId],
  relatedTicketIds: [ObjectId],
  suggestedTeamId: ObjectId,
  confidence: Number,
  signals: [String]
}
assignment: {
  managerId: ObjectId,
  teamLeaderId: ObjectId,
  developerIds: [ObjectId],
  qaIds: [ObjectId],
  watcherIds: [ObjectId],
  teamId: ObjectId
}
workflow: {
  currentStage: String,
  revisionCount: Number,
  finalApprovedAt: Date,
  closedAt: Date
}
clientVerification: {
  status: String,
  reviewedBy: ObjectId,
  reviewedAt: Date,
  note: String
}
```

### New Collections

`RequestType`

- tenantId, workspaceId
- key, label, description
- color, icon
- isActive, isDefault
- slaPolicyId
- defaultTeamId

`RequestComment`

- tenantId, workspaceId, ticketId
- content, contentFormat
- visibility: `INTERNAL` or `CLIENT_VISIBLE`
- authorId, authorRoleSnapshot
- attachmentIds
- editedAt, deletedAt

`RequestFile`

- tenantId, workspaceId, ticketId
- taskId optional
- name, url, storageProvider, objectKey
- mimeType, size, checksum
- category: screenshot, video, pdf, zip, apk, build, voice, other
- visibility: `INTERNAL` or `CLIENT_VISIBLE`
- version, uploadedBy

`RequestActivity`

- tenantId, workspaceId, ticketId
- actorId
- action
- fromValue, toValue, details
- visibility
- ipAddress, userAgent
- createdAt

`RequestApproval`

- tenantId, workspaceId, ticketId
- stage: manager, impact, final, deployment
- status: pending, approved, rejected, changes_requested, held
- approverId
- comments
- decidedAt

`RequestImpactAnalysis`

- tenantId, workspaceId, ticketId
- estimatedHours
- resourceImpact, sprintImpact, timelineImpact, costImpact, dependencyImpact
- risks
- internalNotes
- estimatorIds
- approvedBy, approvedAt

`RequestQAReview`

- tenantId, workspaceId, ticketId, taskId optional
- checklist
- status: pending, passed, failed
- comments
- attachmentIds
- reviewedBy, reviewedAt

`RequestDeployment`

- tenantId, workspaceId, ticketId
- environment
- version
- previewUrl
- buildFileIds
- releaseNotes
- buildNotes
- status
- deployedBy, deployedAt
- approvedBy, approvedAt

`RequestRevision`

- tenantId, workspaceId, ticketId
- revisionNumber
- requestedBy
- reason
- clientCommentId
- reopenedTaskIds
- status
- createdAt, resolvedAt

`RequestSLAEvent`

- tenantId, workspaceId, ticketId
- policy snapshot
- dueAt
- breachedAt
- escalationLevel
- notificationSentAt
- status

Recommended indexes:

```js
Ticket: { tenantId: 1, workspaceId: 1, status: 1, priority: 1, createdAt: -1 }
Ticket: { tenantId: 1, projectId: 1, status: 1 }
Ticket: { tenantId: 1, creatorId: 1, createdAt: -1 }
Ticket: { tenantId: 1, ticketId: 1 }, unique
RequestComment: { tenantId: 1, ticketId: 1, createdAt: 1 }
RequestComment: { tenantId: 1, ticketId: 1, visibility: 1, createdAt: 1 }
RequestFile: { tenantId: 1, ticketId: 1, visibility: 1, createdAt: -1 }
RequestActivity: { tenantId: 1, ticketId: 1, createdAt: -1 }
RequestSLAEvent: { tenantId: 1, status: 1, dueAt: 1 }
```

## 6. API Architecture

Keep existing endpoints:

```text
GET    /api/v1/tickets
POST   /api/v1/tickets
GET    /api/v1/tickets/:id
PATCH  /api/v1/tickets/:id/status
POST   /api/v1/tickets/:id/comments
PATCH  /api/v1/tickets/:id/assign
```

Add enterprise endpoints:

```text
GET    /api/v1/tickets/types
POST   /api/v1/tickets/types
PATCH  /api/v1/tickets/types/:id

POST   /api/v1/tickets/drafts
PATCH  /api/v1/tickets/drafts/:id
POST   /api/v1/tickets/:id/submit

POST   /api/v1/tickets/:id/classify
POST   /api/v1/tickets/:id/impact-analysis
POST   /api/v1/tickets/:id/approve
POST   /api/v1/tickets/:id/reject
POST   /api/v1/tickets/:id/hold

POST   /api/v1/tickets/:id/tasks
POST   /api/v1/tickets/:id/subtasks
POST   /api/v1/tickets/:id/assignments
POST   /api/v1/tickets/:id/watchers

GET    /api/v1/tickets/:id/comments
POST   /api/v1/tickets/:id/comments
GET    /api/v1/tickets/:id/files
POST   /api/v1/tickets/:id/files

POST   /api/v1/tickets/:id/qa-reviews
POST   /api/v1/tickets/:id/deployments
POST   /api/v1/tickets/:id/client-verification
POST   /api/v1/tickets/:id/revisions
POST   /api/v1/tickets/:id/final-approval
POST   /api/v1/tickets/:id/release
POST   /api/v1/tickets/:id/close

GET    /api/v1/tickets/:id/timeline
GET    /api/v1/tickets/analytics/summary
GET    /api/v1/tickets/analytics/sla
GET    /api/v1/tickets/analytics/workload
```

Use idempotency keys for create/submit/approve/task/deployment/release endpoints.

## 7. Express Backend Structure

```text
server/src/models/
  Ticket.js
  RequestType.js
  RequestComment.js
  RequestFile.js
  RequestActivity.js
  RequestApproval.js
  RequestImpactAnalysis.js
  RequestQAReview.js
  RequestDeployment.js
  RequestRevision.js
  RequestSLAEvent.js

server/src/controllers/
  tickets.controller.js
  ticketTypes.controller.js
  ticketWorkflow.controller.js
  ticketAnalytics.controller.js

server/src/services/tickets/
  ticket.repository.js
  ticketWorkflow.service.js
  ticketClassification.service.js
  ticketPriority.service.js
  ticketSla.service.js
  ticketVisibility.service.js
  ticketTaskIntegration.service.js
  ticketNotification.service.js
  ticketAnalytics.service.js

server/src/middleware/
  ticketPermission.middleware.js
  ticketVisibility.middleware.js

server/src/validations/
  ticket.validation.js
  ticketWorkflow.validation.js
```

Register all new models in `server/src/config/tenantDb.js`.

## 8. RBAC Integration

Add permission keys:

```text
tickets.read
tickets.read_all
tickets.create
tickets.update
tickets.delete
tickets.comment_client
tickets.comment_internal
tickets.approve
tickets.reject
tickets.hold
tickets.assign_manager
tickets.assign_team
tickets.assign_developer
tickets.qa_review
tickets.deploy_staging
tickets.deploy_production
tickets.client_verify
tickets.final_approve
tickets.close
tickets.manage_types
tickets.view_analytics
```

Role mapping:

- Client: create, read own/project-visible, client comments, client verification.
- Manager: read all scoped, approve/reject/hold, impact analysis, priority, escalation, team assignment.
- Team leader: assign developers, manage development flow, review progress.
- Employee: view assigned, update progress, add work logs, upload builds.
- QA: QA checklist, QA approval, QA attachments.
- Admin: full tenant/workspace control.
- Super admin: platform control.

Backend authorization must be enforced in services and middleware, not only in React.

## 9. Visibility System

Visibility values:

```text
INTERNAL
CLIENT_VISIBLE
```

Rules:

- Clients can never create `INTERNAL` comments/files/activities.
- Clients can never receive `INTERNAL` records from API responses.
- Staff must explicitly choose visibility when adding comments or files.
- Default staff comments should be `INTERNAL`; default client comments should be `CLIENT_VISIBLE`.
- Timeline responses must filter activities by visibility.
- File download endpoints must re-check ticket access and file visibility.

Implement `filterTicketForViewer(ticket, userContext)` and collection-level query filters:

```js
if (isClient) {
  commentQuery.visibility = 'CLIENT_VISIBLE';
  fileQuery.visibility = 'CLIENT_VISIBLE';
  activityQuery.visibility = 'CLIENT_VISIBLE';
}
```

## 10. Notification Architecture

Extend `Notification` types with:

```text
ticket_created
ticket_triaged
ticket_priority_changed
ticket_approved
ticket_rejected
ticket_on_hold
ticket_assigned
ticket_comment_added
ticket_internal_comment_added
ticket_qa_completed
ticket_client_review_pending
ticket_revision_requested
ticket_final_approved
ticket_released
ticket_closed
ticket_sla_breached
ticket_escalated
```

Notification recipients:

- Creator/client users
- Project manager/owner/lead
- Assigned manager
- Team leader
- Assigned developers
- QA users
- Watchers
- Admins for escalations

Real-time support can use the existing notification polling first, then add Socket.IO/SSE later without changing API contracts.

## 11. Auto Classification and Priority

Phase 1 rule engine:

- Keywords: crash, down, login, payment, security, slow, API, UI, feature.
- Environment: production increases priority.
- Impact level: critical/high increases priority.
- Security type defaults to `CRITICAL` or `BLOCKER`.
- Duplicate detection: text index over title/description plus same project/module/type.
- Team suggestion: project linked team, module owner, historical assignee.

Phase 2 AI-ready adapter:

```js
class TicketClassifier {
  async classify(ticketDraft) {
    return {
      type,
      priority,
      impactLevel,
      duplicateTicketIds,
      relatedTicketIds,
      suggestedTeamId,
      confidence,
      explanation
    };
  }
}
```

Keep AI optional and behind feature flags.

## 12. QA Workflow

QA stages:

```text
DEV_COMPLETE -> QA_IN_PROGRESS -> QA_APPROVED -> STAGING_READY
DEV_COMPLETE -> QA_IN_PROGRESS -> QA_FAILED -> IN_PROGRESS
```

QA review fields:

- Checklist items
- Result: pass/fail
- Comments
- Attachments
- Tested environment
- Browser/device
- Reviewed by/date

On QA failure:

- Add activity
- Notify developer/team leader
- Reopen linked task to `in_progress`
- Increment defect/rework counters

## 13. Deployment Workflow

Staging deployment:

- Version number
- Preview link
- APK/build file
- Build notes
- Release notes
- Deployment logs
- Approval state

Production deployment:

- Allowed only after client verification and final approval.
- Requires production deployment permission.
- Creates release activity.
- Can close ticket automatically after delivery confirmation.

## 14. Revision Workflow

When client requests revision:

1. Create `RequestRevision`.
2. Increment `Ticket.workflow.revisionCount`.
3. Move ticket to `REVISION_REQUIRED`.
4. Reopen linked task(s) to `in_progress`.
5. Notify manager, team leader, developers, QA.
6. Require QA and client verification again.

Preserve full revision history with requester, reason, linked comments/files, reopened tasks, and resolved timestamp.

## 15. Analytics Architecture

Backend aggregation endpoints:

- Open tickets by status/type/priority/project.
- SLA breaches and upcoming breaches.
- Average first response time.
- Average resolution time.
- Developer workload from linked tasks.
- QA pass/fail ratio.
- Revision count and rework rate.
- Client satisfaction and feedback score.

Store lightweight denormalized counters on `Ticket` only when needed; otherwise use MongoDB aggregation with indexed fields.

## 16. React Frontend Structure

```text
client/src/pages/requests/
  RequestPortal.tsx
  RequestDashboard.tsx
  RequestCreateModal.tsx
  RequestDetailDrawer.tsx
  RequestKanbanView.tsx
  RequestTableView.tsx
  RequestTimeline.tsx
  panels/
    ApprovalPanel.tsx
    ImpactAnalysisPanel.tsx
    AssignmentPanel.tsx
    QAReviewPanel.tsx
    StagingDeploymentPanel.tsx
    ClientVerificationPanel.tsx
    RevisionHistoryPanel.tsx
    AnalyticsPanel.tsx
  components/
    RequestStatusBadge.tsx
    RequestPriorityBadge.tsx
    RequestTypeBadge.tsx
    VisibilityToggle.tsx
    AttachmentDropzone.tsx
    RichTextEditor.tsx
    SLAIndicator.tsx
```

Request form sections:

- Ticket title
- Rich description
- Request type
- Priority with auto suggestion
- Project
- Module
- Environment
- Due date
- Impact level
- Screenshots
- Screen recording
- Browser/device
- Steps to reproduce
- Expected result
- Actual result

Draft and auto-save:

- Save draft server-side every 15-30 seconds when dirty.
- Use local fallback in `localStorage` for network failure.
- Use `DRAFT` status until submitted.

## 17. Activity and Audit Log

Every workflow event writes a `RequestActivity` record:

- Ticket created/submitted
- Classification suggested/applied
- Priority changed
- Status changed
- Approval decision
- Impact analysis saved
- Assignment changed
- Task/subtask created
- QA started/passed/failed
- Deployment created/approved
- Client verified/rejected/revision requested
- Final approval
- Release
- Closure

Capture:

- actorId
- action
- before/after values
- timestamp
- visibility
- IP address
- user agent

Write activity from service methods, never from the controller alone.

## 18. Security Best Practices

- Enforce tenantId and workspaceId on every query.
- Do not trust request body tenant/workspace values.
- Validate project visibility before ticket creation.
- Validate client access against project/client mapping.
- Prevent clients from setting internal fields: priority override, assignment, internal visibility, approval, QA, deployment.
- Use allow-listed file MIME types and size limits.
- Store object keys, not raw file paths, in records.
- Re-check authorization before file download.
- Escape/sanitize rich text.
- Rate-limit ticket creation and comment uploads.
- Add idempotency to workflow transitions.
- Add transition guards to prevent invalid status jumps.

## 19. Performance Optimization

- Keep comments/files/activities in separate collections to avoid growing `Ticket` documents indefinitely.
- Use paginated comments and timeline.
- Index by tenant/workspace/status/priority/project/createdAt.
- Use projection for list pages.
- Populate only required fields.
- Batch notification inserts.
- Use background jobs for SLA checks and email sending.
- Cache request types and SLA policies per tenant/workspace.
- Prefer aggregation endpoints for analytics instead of loading all tickets into Node.

## 20. Production Implementation Plan

### Milestone 1: Foundation

- Add new models and tenant model registration.
- Add enterprise validation schemas.
- Add permission and visibility middleware.
- Add request type seed data.
- Add indexes.

### Milestone 2: Workflow APIs

- Implement draft submit flow.
- Implement classification and priority service.
- Implement impact analysis and manager approval APIs.
- Implement assignment/watchers APIs.
- Implement task/subtask integration using existing `Task`.

### Milestone 3: Secure Collaboration

- Move comments/files to separate collections.
- Add visibility filtering.
- Add secure uploads.
- Add timeline API.
- Backfill legacy inline comments/activities/attachments.

### Milestone 4: QA, Staging, Verification

- Add QA review API and panels.
- Add deployment API and panels.
- Add client verification API.
- Add revision loop.
- Add final approval and release flow.

### Milestone 5: Notifications and SLA

- Extend notification enum.
- Add ticket notification service.
- Add SLA event scheduler.
- Add escalation rules.
- Add email templates.

### Milestone 6: Analytics and Polish

- Add analytics aggregation APIs.
- Add dashboard cards/charts.
- Add filters/search/sorting.
- Add Kanban/table/timeline switching.
- Add automated tests for RBAC, visibility, transitions, and task creation.

## 21. Test Coverage Required

Backend:

- Client cannot see internal comments/files/activities.
- Client cannot create internal comments.
- Client sees only own or project-visible tickets.
- Manager can approve/reject/hold.
- Employee cannot approve manager review.
- QA can pass/fail QA stage.
- Approval creates task without breaking existing task APIs.
- Revision reopens linked task.
- SLA breach job creates notifications once.
- Legacy ticket responses still work.

Frontend:

- Request creation validation.
- Draft auto-save.
- Visibility toggle hidden from clients.
- Status transitions shown by role.
- Client verification flow.
- QA and deployment panels hidden by role.

## 22. Compatibility Contract

The following must remain true:

- `/requests` route continues to load.
- `ticketsService.getAll/create/getById/updateStatus/addComment/assign` continues to work.
- Existing `Task`, `Project`, `Notification`, `ActivityLog`, `Client`, and RBAC models are not replaced.
- Existing dashboards, chats, files, notifications, projects, and task routes are not renamed.
- Current task statuses remain valid.
- New workflow data is optional for legacy records.

