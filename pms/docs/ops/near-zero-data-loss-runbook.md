# Near-Zero Data Loss Runbook

## Target Architecture
- App server stays on IIS/Node.
- MongoDB must run on a managed replica set with PITR enabled, preferably MongoDB Atlas.
- Object storage becomes the system of record for uploads and avatars.
- Local `server/uploads` remains a legacy compatibility path only during migration.

## Required Configuration
Set these on the server before enabling object-backed uploads:

```env
UPLOADS_DIR=C:\data\gt_tms\uploads
APP_BASE_URL=https://your-app.example.com

OBJECT_STORAGE_PROVIDER=s3
OBJECT_STORAGE_BUCKET=gt-tms-prod
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_ENDPOINT=https://<account>.r2.cloudflarestorage.com
OBJECT_STORAGE_ACCESS_KEY_ID=...
OBJECT_STORAGE_SECRET_ACCESS_KEY=...
OBJECT_STORAGE_PUBLIC_BASE_URL=https://cdn.example.com
OBJECT_STORAGE_FORCE_PATH_STYLE=true
OBJECT_STORAGE_KEY_PREFIX=prod
OBJECT_STORAGE_REQUIRED=true

MIN_DEPLOY_FREE_DISK_MB=2048
ROLLBACK_PACKAGE_PATH=C:\deploy\rollback\latest.zip
```

## Production Rollout Order
1. Configure managed MongoDB replica set and PITR.
2. Configure object storage bucket with versioning enabled.
3. Deploy this code with `OBJECT_STORAGE_REQUIRED=false`.
4. Run `npm run ops:predeploy-check`.
5. Run `npm run storage:migrate-local -- --dry-run`.
6. Run `npm run storage:migrate-local`.
7. Run `npm run storage:verify`.
8. Switch `OBJECT_STORAGE_REQUIRED=true`.
9. Keep local `/uploads` directory read-only for legacy fallback until verification is stable.

## Backup and Restore Requirements
- MongoDB:
  - continuous backup / PITR enabled
  - daily snapshot retained
  - weekly restore drill into staging
- Object storage:
  - bucket versioning enabled
  - retention / lifecycle configured
  - access logs enabled if available
- Application:
  - rollback artifact prepared before every deployment
  - `.env` stored outside the release directory

## Restore Workflow
### Full environment restore
1. Restore MongoDB to a clean staging or recovery target.
2. Point app env at the restored database.
3. Validate tenant login, workspaces, projects, tasks, and quick tasks.
4. Run `npm run storage:verify`.
5. Promote only after tenant verification passes.

### Point-in-time recovery
1. Identify incident time.
2. Restore MongoDB to just before that timestamp in staging.
3. Compare affected tenant/task records.
4. If approved, perform controlled production recovery using provider PITR workflow.

### Server loss
1. Provision fresh IIS/Node host.
2. Restore `.env` and deploy artifact.
3. Point app to managed MongoDB.
4. Confirm object storage connectivity.
5. Run readiness checks and smoke tests.

## Deployment Safety Checklist
- `npm run ops:predeploy-check` passes.
- Mongo backup/PITR status is green.
- Object storage is reachable.
- Free disk threshold is met.
- Rollback package exists.
- Release path is versioned and separate from persistent data paths.
