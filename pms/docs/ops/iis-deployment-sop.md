# IIS Deployment SOP

## Directory Layout
Use separate paths for code and persistent data:

```text
C:\sites\gt_tms\releases\<timestamp>\
C:\sites\gt_tms\current\
C:\data\gt_tms\uploads\
C:\deploy\rollback\
C:\secrets\gt_tms\.env
```

## Rules
- Never deploy over the persistent data directory.
- Never keep MongoDB data files under the app release directory.
- Never store `.env` only inside the release folder.
- `current` should point to a versioned release folder.

## Release Steps
1. Build release artifact.
2. Copy artifact to a new versioned release directory.
3. Restore or mount the external `.env`.
4. Run `npm ci --omit=dev`.
5. Run `npm run ops:predeploy-check`.
6. Flip IIS/app routing from old release to new release.
7. Smoke test `/healthz`, `/readyz`, login, file upload, and file download.

## Rollback Steps
1. Stop traffic or place the app in maintenance mode.
2. Point IIS/app routing back to the last known-good release.
3. Do not restore database or object storage unless the incident explicitly requires it.
4. Re-run `/readyz` and smoke tests.

## Post-Deploy Validation
- upload a test attachment
- confirm the file URL is object-storage-backed
- confirm existing legacy `/uploads/...` files still open
- verify task and quick task attachment create/read flows
