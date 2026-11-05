# PingBoard 📡

> Modern Uptime Monitoring & Public Status Pages with AWS Serverless Architecture.

Built with **React (Vite) + TypeScript**, **Node.js + Express**, **AWS CDK (TypeScript)**, **DynamoDB Single-Table Design**, **SQS**, **Lambda Health Checkers**, **EventBridge Scheduler**, and **AWS SES Email Alerts**.

---

## 🏗️ Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │                 AWS Cloud                    │
                      │                                              │
  User / Browser ─────┼──► CloudFront CDN (S3 React SPA)             │
       │              │         │                                    │
       │ (Auth)       │         ▼                                    │
       ├──────────────┼──► AWS Cognito (User Pools & JWTs)           │
       │              │                                              │
       │ (API)        │                                              │
       └──────────────┼──► Express API (Node.js + TypeScript)        │
                      │         │                                    │
                      │         ├────────────────┐                   │
                      │         ▼                ▼                   │
                      │   DynamoDB Table   EventBridge Scheduler     │
                      │   ("PingBoard")          │ (Every 1m)        │
                      │         ▲                ▼                   │
                      │         │          SQS (Check Queue)         │
                      │         │                │                   │
                      │         │                ▼                   │
                      │         │        Lambda Health Checker       │
                      │         │                │                   │
                      │         │          (State change)            │
                      │         │                ▼                   │
                      │         └────────── AWS SES (Alerts)         │
                      └──────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
pingboard/
├── packages/
│   └── shared/                 # Shared domain types, constants, and Zod schemas
│       ├── src/models.ts       # Domain entities: Monitor, CheckResult, Incident
│       ├── src/validators.ts   # Zod request/response validation schemas
│       └── src/constants.ts    # Intervals (1, 5, 10 min), HTTP methods, TTL constants
│
├── apps/
│   ├── api/                    # Express Backend API
│   │   ├── src/services/       # DynamoDB single-table repositories & metrics
│   │   ├── src/controllers/    # HTTP controllers (Monitors, Status page, Public)
│   │   ├── src/middleware/     # Cognito JWT verification & Zod validation
│   │   └── tests/              # 10 integration tests (Supertest + Vitest)
│   │
│   ├── lambda-checker/         # Serverless Health Checker & Scheduler
│   │   ├── src/httpChecker.ts  # HTTP latency timing and retry logic
│   │   ├── src/stateManager.ts # Consecutive failure tracking & incident lifecycle
│   │   ├── src/notifier.ts     # SES email alerts (DOWN & RECOVERY notifications)
│   │   ├── src/dispatcher.ts   # EventBridge 1-min cron batcher to SQS
│   │   └── tests/              # 8 unit/integration tests (Vitest)
│   │
│   └── web/                    # React (Vite) + Tailwind CSS + Recharts SPA
│       ├── src/contexts/       # AuthContext (Cognito session management & dev bypass)
│       ├── src/components/     # MonitorCards, Modals, ResponseTimeChart (Recharts)
│       ├── src/pages/          # Dashboard, MonitorDetail, Settings, PublicStatus
│       └── src/api/            # Type-safe API client
│
├── infra/                      # AWS CDK Stacks (TypeScript)
│   ├── bin/app.ts              # CDK App orchestrator
│   └── lib/
│       ├── auth-stack.ts       # Cognito User Pool & SPA Web Client
│       ├── database-stack.ts   # DynamoDB Single-Table with GSI1, GSI2, and 30-day TTL
│       ├── queue-stack.ts      # SQS Check Queue + Dead-Letter Queue (DLQ)
│       ├── compute-stack.ts    # Health-Checker Worker Lambda, Dispatcher, & API
│       └── frontend-stack.ts   # Private S3 Bucket + CloudFront CDN with SPA 404 rewrite
│
└── .github/workflows/
    └── deploy.yml              # CI/CD: Lint, test, build, CDK synth, and deploy
```

---

## 📊 DynamoDB Single-Table Design

Single table name: **`PingBoardTable`**
- **Partition Key (`PK`)**: `String`
- **Sort Key (`SK`)**: `String`
- **TTL Attribute**: `expiresAt` (Unix epoch seconds; auto-deletes check results after 30 days)

### Access Patterns & Indexes

| Pattern | Description | Partition Key | Sort Key | Index |
|---|---|---|---|---|
| **AP-01** | Get / update user profile & status page config | `USER#<userId>` | `PROFILE` | Base Table |
| **AP-02** | Get public status page by slug | `SLUG#<slug>` | `PROFILE` | **GSI1** |
| **AP-03** | Create, get, update, delete monitor | `USER#<userId>` | `MONITOR#<monitorId>` | Base Table |
| **AP-04** | List all monitors for a user | `USER#<userId>` | begins_with(`MONITOR#`) | Base Table |
| **AP-05** | Global monitor lookup by ID | `MONITOR#<monitorId>`| `METADATA` | **GSI2** |
| **AP-06** | Query active monitors by interval (1, 5, 10 min) | `INTERVAL#<interval>` | `MONITOR#<monitorId>` | **GSI1** |
| **AP-07** | Write check result (30-day TTL) | `MONITOR#<monitorId>` | `CHECK#<timestamp>` | Base Table |
| **AP-08** | Query check results over range (24h/7d/30d) | `MONITOR#<monitorId>` | `CHECK#<from>` TO `CHECK#<to>` | Base Table |
| **AP-09** | Open / resolve incident | `MONITOR#<monitorId>` | `INCIDENT#<startedAt>` | Base Table |
| **AP-10** | List incident history for monitor | `MONITOR#<monitorId>` | begins_with(`INCIDENT#`) | Base Table |

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run All Automated Tests
```bash
npm test
```
Runs 18 unit and integration tests across `@pingboard/api` and `@pingboard/lambda-checker`.

### 3. Build All Packages
```bash
npm run build
```

### 4. Start the Express API Backend
```bash
npm run dev:api
```
Starts the API on `http://localhost:4000` with `MOCK_AUTH=true` enabled.

### 5. Start the React Frontend
In a separate terminal:
```bash
npm run dev:web
```
Opens the web app at `http://localhost:3000`:
- Click **"⚡ Quick Demo Login"** to sign in instantly.
- Create monitors, view latency graphs, adjust check intervals, and preview public status pages at `/status/:slug`.

---

## ☁️ Deploying to AWS with CDK

### Prerequisites
- AWS CLI configured with credentials (`aws configure`)
- Node.js 20+

### Deploy All Stacks
```bash
# 1. Synthesize CloudFormation templates
npm run cdk:synth

# 2. Deploy all infrastructure stacks
npm run cdk:deploy
```

The CDK deployment provisions:
1. **Cognito User Pool**: User authentication and JWT verification.
2. **DynamoDB Single-Table**: High-throughput on-demand table with GSIs and 30-day TTL.
3. **SQS + DLQ**: Check queue with automatic dead-letter redrive.
4. **Lambda Compute**:
   - `pingboard-worker`: SQS consumer running health checks and SES alert dispatches.
   - `pingboard-dispatcher`: EventBridge 1-minute trigger feeding check intervals into SQS.
   - `pingboard-api`: Express backend with Function URL endpoint.
5. **CloudFront + S3**: High-performance static web hosting with SPA client-side routing.
