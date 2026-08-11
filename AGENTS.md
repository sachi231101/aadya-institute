# AGENTS.md

# Aadya Institute Management & AI Automation Platform

## 1. PROJECT IDENTITY

Project: Aadya Institute Management & AI Automation Platform

Current objective:

Build a production-ready web application for Aadya Institute that automates academy operations and reduces repetitive manual work for:

- Admin
- Center Managers
- Counsellors
- Faculty
- Students

The current product is being developed ONLY for Aadya Institute.

Do not build generic SaaS/multi-tenant functionality unless explicitly requested.

The architecture should remain clean and extensible for future SaaS expansion, but current implementation must follow Aadya Institute's actual requirements.

---

# 2. PRODUCT VISION

The system is an Academy Operating System combining:

Institute Management

- Student Management
- Faculty Management
- Classroom Operations
- Attendance
- Scheduling
- Assignments
- Feedback
- Recordings
- WhatsApp Automation
- AI Calling
- Counsellor Follow-up
- Reports

The long-term goal is:

Human Work
↓
Automation
↓
AI Agents
↓
Less Manual Work
↓
Time & Cost Savings
↓
Better Academy Operations

---

# 3. CURRENT DEVELOPMENT PRIORITY

Always prioritize the current Phase 1 requirements.

Development order:

1. Project Foundation
2. Database
3. Authentication
4. RBAC
5. Institute / Branch
6. Students
7. Faculty
8. Courses
9. Modules
10. Admissions
11. Batches
12. Scheduling
13. Class Sessions
14. Attendance
15. Assignments
16. Feedback
17. Recordings
18. Notifications
19. WhatsApp Automation
20. AI Calling
21. Counsellor Tasks
22. Dashboards
23. Reports

Do not jump to AI features before the core academy data model is stable.

---

# 4. TECHNOLOGY STACK

## Frontend

Use:

- React
- Vite
- TypeScript
- React Router
- Tailwind CSS
- shadcn/ui
- Axios
- TanStack Query
- React Hook Form
- Zod
- Lucide React
- Recharts

Do NOT introduce:

- Next.js
- Angular
- Vue
- React Native

unless explicitly requested.

---

# 5. BACKEND

Use:

- Node.js
- Express.js
- TypeScript
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Zod
- JWT
- bcrypt

Backend architecture:

Route
↓
Controller
↓
Service
↓
Repository
↓
Prisma
↓
PostgreSQL

Controllers must not contain business logic.

Repositories must handle database access.

Services must contain business rules.

---

# 6. DATABASE

Primary database:

PostgreSQL

ORM:

Prisma

PostgreSQL is the source of truth.

Never use MongoDB, Supabase, Firebase or another database unless explicitly requested.

Use Prisma migrations.

Development:

npx prisma migrate dev

Production:

npx prisma migrate deploy

Always review database schema changes before creating migrations.

Use:

- Foreign keys
- Unique constraints
- Indexes
- Enums where appropriate
- createdAt
- updatedAt
- Proper relations

Do not create unnecessary tables.

Do not duplicate data unnecessarily.

---

# 7. PROJECT ARCHITECTURE

## Backend

backend/

    src/
        config/
        middlewares/
        modules/
        integrations/
        queues/
        jobs/
        webhooks/
        utils/
        routes/

    prisma/
        schema.prisma
        seed.ts
        migrations/

## Frontend

frontend/

    src/
        app/
        assets/
        components/
        layouts/
        pages/
        features/
        services/
        hooks/
        store/
        types/
        utils/
        constants/
        styles/

Follow the existing project structure.

Do not create alternative architectures.

---

# 8. BACKEND MODULE STRUCTURE

Every business module should normally follow:

module/
module.controller.ts
module.service.ts
module.repository.ts
module.routes.ts
module.validation.ts
module.types.ts

Example:

students/

    student.controller.ts
    student.service.ts
    student.repository.ts
    student.routes.ts
    student.validation.ts
    student.types.ts

Responsibilities:

### Controller

Responsible for:

- HTTP request
- HTTP response
- Calling service
- Passing errors to middleware

Do not put business rules here.

### Service

Responsible for:

- Business logic
- Business rules
- Transactions
- Calling repositories
- Calling integration services

### Repository

Responsible for:

- Prisma queries
- Database operations

### Validation

Responsible for:

- Request body validation
- Query validation
- Parameter validation

Use Zod.

---

# 9. FRONTEND ARCHITECTURE

Frontend flow:

Page
↓
Feature
↓
Hook
↓
Service
↓
Axios
↓
Backend API

Use TanStack Query for server state.

Use React Hook Form + Zod for forms.

Do not manually duplicate API loading/caching logic throughout components.

---

# 10. UI/UX PRINCIPLES

The application is an internal professional academy management platform.

UI must be:

- Clean
- Professional
- Modern
- Simple
- Fast
- Responsive
- Easy for non-technical staff

Prioritize:

- Clear navigation
- Search
- Filters
- Tables
- Forms
- Status badges
- Dashboards
- Notifications
- Empty states
- Loading states
- Error states
- Confirmation dialogs

Use existing components before creating new components.

Do not create visually different components for the same purpose.

---

# 11. USER ROLES

Primary roles:

ADMIN
CENTER_MANAGER
COUNSELLOR
FACULTY
STUDENT

Authorization must be enforced on the backend.

Frontend route protection is not sufficient.

---

# 12. ADMIN

Admin has full access.

Admin can manage:

- Students
- Faculty
- Courses
- Modules
- Admissions
- Batches
- Scheduling
- Attendance
- Assignments
- Recordings
- Feedback
- WhatsApp
- AI Calling
- Reports
- Branches
- Users

---

# 13. CENTER MANAGER

Center Manager has branch-level access.

Can:

- Manage admissions
- View students
- Manage batches
- View schedules
- View attendance
- View branch reports

A Center Manager must not access another branch's private data.

---

# 14. COUNSELLOR

Counsellors can:

- View assigned leads/students
- View AI call results
- View call summaries
- Manage follow-up tasks
- Add notes
- View relevant schedules

Counsellors must not have unrestricted administrative access.

---

# 15. FACULTY

Faculty can:

- View own schedule
- View assigned batches
- View assigned students
- Mark attendance
- Create assignments
- Review submissions
- View permitted recordings
- View feedback

Faculty cannot access unrelated branches or batches.

---

# 16. STUDENT

Students can:

- View own profile
- View own course
- View own batch
- View own schedule
- View own attendance
- View permitted recordings
- View assignments
- Submit assignments
- Submit feedback

Students must never access another student's private information.

---

# 17. AUTHENTICATION

Authentication:

JWT Access Token

- Refresh Token

Passwords:

bcrypt

Never:

- Store plaintext passwords
- Return password hashes
- Hardcode JWT secrets
- Put secrets in frontend code

Authentication flow:

Login
↓
Validate credentials
↓
Generate access token
↓
Generate refresh token
↓
Frontend authenticated
↓
Protected routes

---

# 18. RBAC

Use:

Role

- Permission

Authentication answers:

"Who is this user?"

Authorization answers:

"What can this user do?"

Example:

POST /api/v1/students

Requires:

student.create

Never rely only on frontend permissions.

---

# 19. BRANCH ISOLATION

The application contains multiple Aadya branches.

Every branch-sensitive resource must respect:

instituteId

- branchId

Never trust branchId directly from the frontend.

Always determine allowed branch access from the authenticated user.

Example:

Branch A Center Manager

must NOT access:

Branch B Students
Branch B Faculty
Branch B Batches
Branch B Attendance

---

# 20. API DESIGN

Base API:

/api/v1

Examples:

GET /api/v1/students

POST /api/v1/students

GET /api/v1/students/:id

PATCH /api/v1/students/:id

DELETE /api/v1/students/:id

Response format:

{
"success": true,
"message": "Student created successfully",
"data": {}
}

Error:

{
"success": false,
"message": "Student not found"
}

Keep API responses consistent.

---

# 21. VALIDATION

All external input must be validated.

Use Zod.

Validate:

- Request body
- Query parameters
- Route parameters

Never rely only on frontend validation.

Backend validation is mandatory.

---

# 22. PAGINATION

List APIs must support pagination.

Do not return thousands of records by default.

Typical API:

GET /students?page=1&limit=20

Support:

- Search
- Filter
- Sort
- Pagination

Use database indexes where appropriate.

---

# 23. STUDENT MANAGEMENT

Student lifecycle:

Lead
↓
Admission
↓
Course
↓
Batch
↓
Classes
↓
Attendance
↓
Assignments
↓
Feedback
↓
Completion

Student records should contain only required information.

Avoid collecting unnecessary personal data.

---

# 24. ADMISSION

Admission flow:

Student
↓
Admission
↓
Course
↓
Batch
↓
Modules
↓
Schedule

Admission should create appropriate relationships.

Do not duplicate student data across multiple tables unless required.

---

# 25. BATCHES

A batch can contain:

- Course
- Modules
- Faculty
- Students
- Schedule
- Class Sessions

Supported schedule patterns include:

- MWF
- TTS
- Weekend
- Custom schedules

Do not hardcode only MWF/TTS.

The scheduling model must support future schedule types.

---

# 26. CLASS SESSIONS

A class session represents an actual scheduled class.

Class Session can contain:

- Batch
- Course
- Module
- Faculty
- Date
- Start time
- End time
- Attendance
- Recording
- Assignment
- Feedback

Attendance and recording should reference the class session.

---

# 27. ATTENDANCE

Attendance statuses:

PRESENT
ABSENT
LEAVE

One student should have only one attendance record per class session.

Faculty can mark attendance.

Admin can correct attendance according to permissions.

Students can only view their attendance.

---

# 28. AUTO-DISCONTINUATION

Business rule:

If a student misses 3 consecutive theory classes, trigger the discontinuation workflow.

Example:

Monday: ABSENT
Wednesday: ABSENT
Friday: ABSENT

Then:

3 consecutive theory absences
↓
Discontinuation workflow

IMPORTANT:

Approved LEAVE does not count as ABSENT.

Do not implement this logic directly inside a controller.

Implement in a dedicated service/business-rule layer.

---

# 29. ASSIGNMENTS

Faculty can:

- Create assignment
- Assign assignment
- Set due date
- Review submissions
- Enter marks
- Provide feedback

Students can:

- View assignment
- Submit assignment
- View marks
- View feedback

Assignment events may trigger notifications.

---

# 30. FEEDBACK

After class:

Class Session
↓
Feedback Request
↓
Student
↓
Rating
↓
Comment

Feedback can be used to calculate:

- Faculty rating
- Class rating
- Course feedback

Do not expose private feedback data to unauthorized users.

---

# 31. CLASS RECORDINGS

Class recordings are different from AI call recordings.

Class recording:

Faculty
↓
Class Session
↓
Recording
↓
Storage
↓
Student viewing
↓
Automatic expiration
↓
Deletion

Default retention:

1 month

Students:

- Can view
- Cannot download directly

PostgreSQL stores recording metadata.

Object/file storage stores actual video/audio.

Never store large media files directly inside PostgreSQL.

---

# 32. RECORDING CLEANUP

Use a background job.

Flow:

Scheduled Job
↓
Find expired recordings
↓
Delete storage object
↓
Update database
↓
Log result

Do not rely on manual deletion.

---

# 33. WHATSAPP AUTOMATION

WhatsApp automation events include:

### Class Reminder

Approximately 2 hours before class.

### First Class

Send:

- Rules
- Regulations
- Instructions

### New Module

Send module-start message.

### Absence

Send absence notification.

### Feedback

Send feedback link after class.

Architecture:

API
↓
Queue
↓
Worker
↓
WhatsApp Provider

Do not block API requests while waiting for WhatsApp provider responses.

Provider-specific logic belongs in:

backend/src/integrations/whatsapp/

---

# 34. AI CALLING

AI calling is a separate automation subsystem.

Flow:

Lead / Student Number
↓
AI Calling Job
↓
Telephony Provider
↓
Sarvam AI Voice Agent
↓
Conversation
↓
Call Recording
↓
Transcript
↓
AI Summary
↓
Interest Status
↓
Counsellor
↓
Follow-up

Possible statuses:

- INITIATED
- RINGING
- ANSWERED
- COMPLETED
- FAILED
- BUSY
- NO_ANSWER
- CALLBACK_REQUESTED

---

# 35. AI CALL DATA

Where available, store:

- Call ID
- Lead/student ID
- Phone number
- Status
- Start time
- End time
- Duration
- Recording reference
- Transcript reference
- AI summary
- Interest status
- Callback request
- Counsellor notes
- Provider response
- Error information

Do not store unnecessary sensitive information.

---

# 36. AI INTEGRATIONS

Keep provider-specific code isolated.

Structure:

backend/src/integrations/

    sarvam/
    telephony/
    whatsapp/
    storage/
    email/

The business modules must not directly depend on provider-specific APIs.

Good:

AI Calling Service
↓
Telephony Client
↓
Provider

Bad:

Controller
↓
Direct provider API call

This allows providers to be changed later.

---

# 37. REDIS

Use Redis for:

- Queues
- Background jobs
- Temporary caching
- Rate limiting where required
- Job state

Do not use Redis as the primary source of truth.

PostgreSQL remains the primary database.

---

# 38. BULLMQ

Use BullMQ for:

- WhatsApp messages
- Class reminders
- Feedback messages
- Absence notifications
- AI calling
- Recording cleanup
- Notifications
- Scheduled automation

Never perform long-running tasks directly inside HTTP requests.

---

# 39. BACKGROUND JOB PATTERN

Bad:

HTTP Request
↓
External API
↓
Wait
↓
Response

Good:

HTTP Request
↓
Database
↓
Queue
↓
Immediate Response

Worker
↓
Process job
↓
External API
↓
Update database

---

# 40. WEBHOOKS

Webhook flow:

Provider
↓
Webhook
↓
Verify
↓
Validate
↓
Store/update
↓
Queue processing
↓
Fast response

Never perform heavy processing directly in webhook handlers.

Validate provider authenticity where supported.

---

# 41. ERROR HANDLING

Use centralized error handling.

Do not create random error response formats.

Use:

- HTTP status
- Safe message
- Optional error code
- Safe metadata

Never expose:

- Stack traces
- Database internals
- Secrets
- API credentials

in production responses.

---

# 42. LOGGING

Use structured logging.

Log:

- API failures
- Authentication failures
- Background job failures
- Webhook failures
- Integration failures
- Important business events

Never log:

- Passwords
- JWT secrets
- API keys
- Access tokens
- Sensitive personal information

---

# 43. SECURITY

Always:

- Validate input
- Authenticate protected APIs
- Authorize protected APIs
- Hash passwords
- Use Helmet
- Configure CORS
- Protect webhooks
- Rate-limit sensitive endpoints
- Keep secrets in environment variables
- Restrict production access

Never:

- Hardcode credentials
- Trust frontend authorization
- Return password hashes
- Expose internal errors

---

# 44. ENVIRONMENT VARIABLES

Use:

.env

Provide:

.env.example

Never commit:

.env

Frontend environment variables must not contain secrets.

Only public configuration should be exposed through:

VITE\_\*

Never place:

- API secret
- Database password
- JWT secret
- Provider secret

in frontend environment variables.

---

# 45. TESTING

Important business rules must have automated tests.

Backend:

- Unit tests
- Integration tests
- API tests

Frontend:

- Component tests
- End-to-end tests where appropriate

Important tests:

- Login
- Invalid login
- RBAC
- Branch isolation
- Student creation
- Admission
- Batch assignment
- Attendance
- 3 consecutive absence rule
- Leave handling
- Assignment submission
- Feedback
- WhatsApp job
- AI call status updates

---

# 46. CODE QUALITY

Use:

- TypeScript strict mode
- ESLint
- Prettier
- Clear naming
- Small functions
- Reusable components
- Proper error handling
- Proper types

Avoid:

- any
- duplicated logic
- giant controllers
- giant components
- hardcoded business rules
- unnecessary abstractions

Use `any` only when absolutely necessary and document why.

---

# 47. AI CODING RULES

AI coding agents include:

- Antigravity
- OpenCode
- Claude Code
- Other compatible agents

All agents must follow this AGENTS.md.

Before coding:

1. Read AGENTS.md.
2. Read relevant documentation.
3. Inspect existing code.
4. Inspect database schema.
5. Inspect related modules.
6. Inspect existing components.
7. Reuse existing code.

Do not blindly generate code.

---

# 48. PLAN BEFORE BUILD

For every medium or large feature:

PLAN
↓
Review
↓
BUILD
↓
TEST
↓
REVIEW
↓
COMMIT

Do not immediately implement large features without understanding the existing architecture.

---

# 49. AI AGENT BEHAVIOR

When asked to implement a feature:

First:

- Inspect
- Understand
- Plan

Then:

- Implement
- Test
- Fix
- Report

Do not:

- Rewrite the entire project
- Change frameworks
- Change database technology
- Create duplicate modules
- Modify unrelated files
- Delete working functionality
- Invent business rules

---

# 50. FILE CHANGE RULE

Before changing files, identify:

### Files to create

### Files to modify

### Files to delete

Do not delete files unless explicitly required.

Prefer minimal changes.

---

# 51. DATABASE CHANGE RULE

If a feature requires database changes:

1. Inspect existing Prisma schema.
2. Determine whether existing models can be reused.
3. Add only required fields/models.
4. Check relations.
5. Add indexes where appropriate.
6. Validate migration.
7. Test migration.
8. Update seed if necessary.

Never silently make destructive schema changes.

---

# 52. API CHANGE RULE

When adding an API:

Document:

- Method
- URL
- Authentication
- Permission
- Request
- Response
- Errors

Example:

POST /api/v1/students

Authentication:
Required

Permission:
student.create

---

# 53. FRONTEND FEATURE RULE

Every important screen should support:

- Loading
- Empty
- Error
- Success
- Permission denied
- Responsive layout

Don't build only the happy path.

---

# 54. UI COMPONENT RULE

Before creating a component:

Search existing:

components/ui/
components/common/
components/forms/
components/tables/

If an existing component can be reused, reuse it.

Do not create:

StudentTable
StudentTable2
StudentDataTableNew

when one reusable table can handle the requirement.

---

# 55. API CLIENT RULE

All frontend API calls should go through:

frontend/src/services/

Do not directly call Axios from random components.

Good:

Component
↓
Hook
↓
API Service
↓
Axios

Bad:

Component
↓
axios.get(...)

---

# 56. SERVER STATE RULE

Use TanStack Query for:

- Students
- Faculty
- Courses
- Batches
- Attendance
- Assignments
- Feedback
- AI calls
- Notifications

Do not duplicate server state in multiple local stores unnecessarily.

---

# 57. FORM RULE

Use:

React Hook Form

- Zod

for forms.

Examples:

- Student admission
- Student edit
- Faculty creation
- Course creation
- Batch creation
- Schedule creation
- Assignment
- AI calling campaign

---

# 58. STATE MANAGEMENT

Use local React state for local UI state.

Use TanStack Query for server state.

Use a global store only for genuinely global state such as:

- Authentication
- UI preferences
- Notifications

Do not put all API data into global state.

---

# 59. PERFORMANCE

Backend:

- Pagination
- Indexes
- Efficient Prisma queries
- Select only required fields
- Avoid N+1 queries

Frontend:

- Lazy load large modules where useful
- Avoid unnecessary renders
- Paginate large tables
- Avoid loading unnecessary data

Media:

- Use object storage
- Stream/view recordings
- Do not load entire recordings into memory

---

# 60. MODULAR MONOLITH

The backend should initially be a modular monolith.

Do NOT introduce:

- Microservices
- Kubernetes
- Multiple databases
- Event-driven architecture everywhere

unless explicitly required.

Recommended:

React +
Node.js Modular Monolith +
PostgreSQL +
Redis/BullMQ

This is the correct complexity level for the current Aadya project.

---

# 61. INTEGRATION RULE

All external providers must be isolated behind integration clients.

Examples:

backend/src/integrations/

    sarvam/
    telephony/
    whatsapp/
    storage/
    email/

If provider changes:

Old Provider
↓
New Provider

Business logic should not need a complete rewrite.

---

# 62. SKILLS.SH USAGE

The project may use skills from skills.sh.

Recommended categories:

- React
- TypeScript
- Vite
- shadcn/ui
- React Hook Form
- Zod
- Prisma
- PostgreSQL
- Testing
- API Security
- Redis
- BullMQ
- AI Agents
- MCP
- Voice AI
- Docker
- CI/CD

Do not install unnecessary skills.

Do not use a skill simply because it exists.

Before using a community skill:

1. Check its source.
2. Understand what it changes.
3. Avoid conflicting skills.
4. Prefer official/vendor-maintained skills where available.
5. Do not allow a skill to override this project's architecture.

AGENTS.md is the project's primary architectural instruction.

---

# 63. ANTIGRAVITY USAGE

Antigravity is the primary development environment.

Use it for:

- Product development
- UI/UX
- Browser testing
- Frontend development
- Project orchestration
- Planning
- Visual verification

Follow this AGENTS.md.

---

# 64. OPENCODE USAGE

OpenCode may be used for:

- Backend development
- Frontend development
- Terminal operations
- Testing
- Debugging
- Refactoring
- Repository analysis

Recommended workflow:

Plan
↓
Review
↓
Build
↓
Test
↓
Review
↓
Commit

Do not allow multiple AI agents to modify the same files simultaneously.

---

# 65. GIT WORKFLOW

Use Git from the beginning.

Feature:

git checkout -b feature/student-management

After implementation:

git status
git diff

Then:

git add .
git commit -m "feat: add student management"

Use meaningful commits.

Do not commit:

- .env
- passwords
- API keys
- secrets
- large temporary files
- generated sensitive data

---

# 66. DEVELOPMENT CHECKLIST

Before declaring a feature complete:

[ ] Requirement understood
[ ] Business rules implemented
[ ] Database checked
[ ] API implemented
[ ] Validation implemented
[ ] Authorization implemented
[ ] Frontend implemented
[ ] Loading state
[ ] Empty state
[ ] Error state
[ ] Tests added
[ ] TypeScript passes
[ ] ESLint passes
[ ] Prisma validation passes
[ ] API tested
[ ] No unrelated files changed
[ ] No secrets committed

---

# 67. COMPLETION REPORT

After implementing a feature, report:

## Files Created

List all.

## Files Modified

List all.

## Database Changes

Explain.

## API Changes

List endpoints.

## Frontend Changes

List pages/components.

## Tests

List tests.

## Validation

Report:

- TypeScript
- ESLint
- Tests
- Prisma

## Assumptions

List assumptions.

## Remaining Work

List incomplete items.

---

# 68. DO NOT OVERENGINEER

Always prefer:

Simple

- Correct
- Maintainable

over:

Complex

- Abstract
- Unnecessary

The application should be production-ready without becoming unnecessarily complicated.

---

# 69. GOLDEN RULE

Before creating anything, ask:

"Does this already exist?"

If yes:

Reuse it.

If no:

Create it according to the existing architecture.

Never duplicate business logic.

---

# 70. FINAL PRODUCT FLOW

The final system should support:

ADMIN
↓
Manage academy

CENTER MANAGER
↓
Manage branch

COUNSELLOR
↓
Manage leads + follow-ups

FACULTY
↓
Manage classes + attendance + assignments

STUDENT
↓
Access learning information

AUTOMATION
↓
WhatsApp + Notifications + Reminders

AI CALLING
↓
Call students/leads
↓
Record
↓
Transcript
↓
Summary
↓
Counsellor

REPORTING
↓
Management intelligence

AI AGENTS
↓
Automate repetitive academy work

---

# 71. PRIMARY OBJECTIVE

Every technical decision should support the main business objective:

"Use software, automation and AI to save Aadya Institute time and money, reduce repetitive human work, improve student communication, and make academy operations easier to manage."

Build the system reliably first.

Automate second.

Add AI where it creates measurable operational value.

Do not add AI merely for the sake of having AI.
