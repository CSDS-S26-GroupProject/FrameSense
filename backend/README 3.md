# Backend Layout

This backend is the place for work that should not live in the browser:

- vendor catalog sync and normalization
- protected business logic
- admin writes to Firestore
- signed upload URL generation for Cloudflare R2
- image moderation and processing pipelines

## Recommended Folder Split

`backend/app/api/`
- FastAPI route handlers

`backend/app/models/`
- normalized request and response schemas

`backend/app/services/`
- vendor adapters, sync jobs, ingestion workflows, and storage integrations

`backend/vendors/`
- sample vendor payloads and test fixtures

`backend/data/`
- generated snapshots and schema docs

## What Stays In Frontend

Keep these in `frontend/`:

- React hooks like `useFirebase()`
- auth state listeners
- public reads from Firestore
- rendering product cards and image galleries
- client uploads only when the backend first issues a signed URL

The frontend should treat the backend as the source of truth for:

- normalized vendor catalogs
- approved image URLs
- moderation state
- signed object upload workflows

## Catalog Sync Workflow

The implementation in this folder adds a small normalization layer:

1. Vendor adapter fetches raw vendor payloads.
2. Backend maps each vendor format into one `NormalizedCatalogProduct` schema.
3. Backend can save a snapshot under `backend/data/catalog_snapshots/`.
4. Later, this same service can write the normalized records into Firestore or another database.

### Current Endpoints

Run from `backend/`:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Available endpoints:

- `GET /health`
- `GET /catalog/vendors`
- `POST /catalog/sync/mock_vendor`
- `POST /catalog/sync/mock_vendor/firestore`
- `GET /assets/r2/status`
- `POST /assets/r2/presign`

The current vendor source is a mock payload in `backend/vendors/mock_vendor_catalog.json` so the pipeline is testable before you wire up a real vendor API.

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and fill in:

- Firebase admin credentials for Firestore writes
- Cloudflare R2 credentials for signed uploads

The backend will also read the repo root `.env`, but admin credentials should stay in `backend/.env` or another secret manager rather than in the frontend env file.

## Firestore Catalog Sync

`POST /catalog/sync/mock_vendor/firestore` will:

1. normalize the vendor payload
2. save a local snapshot if requested
3. upsert the normalized products into Firestore

By default the backend writes into the `glassesFrames` collection so it lines up with the collection your frontend service already reads.

Each Firestore document includes:

- normalized nested fields like `dimensions`, `fitMetadata`, `assets`, and `offers`
- frontend-friendly top-level fields like `thumbnailPath`, `modelPath`, `frameWidthMm`, and `recommendedShapes`

That lets you gradually move the frontend from local JSON catalog data to Firestore without having to redesign the UI contract first.

## How To Extend Vendor Sync

When you add a real vendor:

1. Add a new vendor fetcher in `backend/app/services/catalog_sync.py` or split adapters into separate files.
2. Map the vendor's raw fields into `NormalizedCatalogProduct`.
3. Store merchant-specific fields in `offers`.
4. Keep your main product schema vendor-neutral so the frontend only needs one catalog shape.

## Image Ingestion, Moderation, And Processing

Recommended split:

### Backend responsibilities

- accept image metadata or signed-upload completion events
- generate signed upload URLs for R2
- validate file type, size, and dimensions
- run moderation checks
- generate derivatives like thumbnails and web-optimized versions
- mark image status as `pending`, `approved`, or `rejected`
- publish only approved public URLs to Firestore

### Frontend responsibilities

- show upload UI and progress
- preview local files before upload
- request a signed upload URL from the backend
- upload directly to R2 using that signed URL
- poll or subscribe for moderation status
- only render image URLs that the backend marks as approved

## Suggested Image Pipeline

1. Frontend asks backend for a signed upload URL.
2. Frontend uploads original image directly to R2.
3. Backend receives an upload-complete callback or explicit finalize request.
4. Backend runs validation and moderation.
5. Backend generates resized assets like thumbnail, card, and detail-image variants.
6. Backend stores approved asset metadata in Firestore.
7. Frontend reads only approved asset records and renders those URLs.

This keeps untrusted uploads and moderation logic out of the browser while still letting the client display the final assets.

## Cloudflare R2 Integration

The backend now exposes a signed-upload starter flow:

1. Frontend calls `POST /assets/r2/presign` with a filename and content type.
2. Backend returns a presigned `PUT` URL plus the final public URL.
3. Frontend uploads directly to R2.
4. Backend can later validate, moderate, and publish image metadata.

This is the recommended pattern because the browser never needs raw R2 secret keys.

## Should You Also Use Render?

Render is not a replacement for Firestore or R2. It is useful for hosting the backend app itself.

- Firestore: document database
- R2: object storage for images and models
- Render: app hosting for your FastAPI service

Using Render is reasonable if you want a simple always-on backend without managing your own VM. It is not required if you prefer Firebase Functions, Cloud Run, or another serverless host.
