# Agents OS MVP Runbook

## Prerequisites

- Node.js 24 LTS
- pnpm 9.x
- Docker Desktop

## Environment

Copy `.env.example` to `.env` and keep local development values unless a real provider is needed.

Required local defaults:

```powershell
$env:DATABASE_URL="postgresql://agents_os:agents_os@localhost:5432/agents_os"
$env:REDIS_URL="redis://localhost:6379"
$env:S3_ENDPOINT="http://localhost:9000"
$env:S3_REGION="us-east-1"
$env:S3_BUCKET="agents-os"
$env:S3_ACCESS_KEY_ID="agents_os"
$env:S3_SECRET_ACCESS_KEY="agents_os_password"
$env:JWT_ACCESS_SECRET="dev_access_secret"
$env:JWT_REFRESH_SECRET="dev_refresh_secret"
$env:PROVIDER_KEY_DEFAULT="replace-with-real-key"
```

## Start Infrastructure

```powershell
docker compose up -d postgres redis minio
docker compose ps
```

Expected services:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- MinIO API on `localhost:9000`
- MinIO console on `localhost:9001`

## Install And Prepare Database

```powershell
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Seed creates:

- single default organization
- admin user `admin@example.com` / `password`
- default provider config using `apiKeyRef=PROVIDER_KEY_DEFAULT`
- novel/story material package TemplateVersion with six preset agents and a linear workflow

## Start Services

Run each process in its own terminal.

```powershell
pnpm --filter @agents-os/api dev
pnpm --filter @agents-os/worker dev
pnpm --filter @agents-os/web dev -- --host 127.0.0.1 --port 5174
```

Open the web app at `http://127.0.0.1:5174/login`.

## Core Happy Path

1. Log in at `/login` as `admin@example.com` / `password`.
2. Create a project from the seeded template.
3. Open Agent Studio, run an agent debug chat, and save an AgentVersion.
4. Open Evaluation Lab, create a test case, run it against an AgentVersion, and score it.
5. Open Workflow Builder, inspect the React Flow linear workflow, edit nodes, and create a WorkflowSnapshot.
6. Start a WorkflowRun. The API enqueues BullMQ; the worker consumes Redis and updates node/run status through Socket.IO.
7. Use Socket.IO `run.control` or REST controls to resume/cancel a run; use the rerun endpoint for a failed node run when needed.
8. Export a succeeded run. The API uploads `package.zip` through the S3-compatible StorageProvider to MinIO and creates an Artifact record.
9. Create a Published App from a WorkflowSnapshot. Public runs bind to the snapshot, never to the editable Workflow draft.
10. Open `/app/{slug}`, submit story text, refresh run status, and download the exported package.

## Export Package Contents

`package.zip` contains:

- `README.md`
- `manifest.json`
- `material-package.json`
- `01_script/storyboard.md`
- `01_script/narration.md`
- `02_voiceover/voiceover_tasks.json`
- `03_dialogue/dialogue_tasks.json`
- `04_video_clips/video_tasks.json`
- `05_images/image_prompts.json`
- `06_sfx/sfx_tasks.json`
- `07_subtitles/subtitles.srt`
- `edit_plan.csv`

## Verification

```powershell
pnpm lint
pnpm test
pnpm build
pnpm --filter @agents-os/api test:e2e
pnpm --filter @agents-os/web test:e2e
```

Notes:

- `pnpm lint` currently performs TypeScript static checks with `tsc --noEmit`.
- API e2e expects PostgreSQL, Redis, and MinIO to be running.
- Playwright starts the Vite dev server on `127.0.0.1:5174`.
