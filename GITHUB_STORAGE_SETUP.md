# GitHub Repository Media Storage — Setup & Architecture Guide

## Overview

In production environments like **Vercel**, serverless instances have ephemeral, read-only root filesystems (`EROFS`). Any files written to local disk during runtime are lost when the serverless function terminates or cold-starts.

To guarantee permanent image durability without depending on volatile local disks or third-party paid CDN services, **Lariel Essentials** implements a **server-side GitHub REST API workflow**. Uploaded images are committed directly as actual binary files to the designated GitHub repository and branch, while also being mirrored to `public/uploads/` and served locally.

---

## 1. Required GitHub Permissions

You need a GitHub Personal Access Token (PAT) with write access to your repository:

### Option A: Fine-Grained Personal Access Token (Recommended)
1. Go to **GitHub Settings** > **Developer Settings** > **Personal access tokens** > **Fine-grained tokens**.
2. Click **Generate new token**.
3. Configure the following:
   - **Token Name**: `Lariel Essentials Production Storage`
   - **Expiration**: Set according to your security policy (e.g., 90 days or 1 year).
   - **Repository access**: Select **Only select repositories** > choose your repository (e.g., `lariel-essentials`).
   - **Permissions** > **Repository permissions**:
     - **Contents**: Select **Read and write** (enables creating and committing binary media and catalog files).
     - **Metadata**: Read-only (automatically selected).
4. Click **Generate token** and copy the generated token (`github_pat_...`).

### Option B: Classic Personal Access Token
1. Go to **GitHub Settings** > **Developer Settings** > **Personal access tokens** > **Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Check the **`repo`** scope (Full control of private repositories).
4. Click **Generate token** and copy the token (`ghp_...`).

---

## 2. Environment Variables

Configure these variables in your deployment settings:
- **Local Development**: In `.env` (kept out of git via `.gitignore`).
- **Vercel Production**: In **Project Settings** > **Environment Variables** (check Production, Preview, Development).

| Variable Name | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `GITHUB_TOKEN` | **Yes** | — | Personal Access Token with `Contents: Read and write` access. Kept strictly server-side. |
| `GITHUB_OWNER` | **Yes** | — | GitHub username or organization owning the repository (e.g., `soairsocial`). |
| `GITHUB_REPO` | **Yes** | — | Repository name where the ecommerce app is hosted (e.g., `lariel-essentials`). |
| `GITHUB_BRANCH` | No | `main` | Target branch to commit images and updated catalog data to. |
| `GITHUB_COMMITTER_NAME` | No | `Lariel Essentials Admin` | Author name recorded in the git commit log. |
| `GITHUB_COMMITTER_EMAIL` | No | `admin@larielextravaganza.com` | Author email recorded in the git commit log. |
| `MAX_FILE_SIZE_BYTES` | No | `15728640` (15MB) | Maximum permitted image upload size in bytes. |

*Note: Alternatively, if `GITHUB_REPOSITORY` is set in standard `owner/repo` format (like in GitHub Actions), the system automatically parses owner and repo.*

---

## 3. Storage Architecture & Filename Safety

### Safe Unique Filename Generation
Every uploaded file is sanitized and assigned a unique collision-resistant name:
```
<sanitized-base-name>_<unix-timestamp>_<random-6-hex>.<safe-ext>
```
Example:
`amanda_3d_petals_robe_1792496475838_77a509.jpg`

- **Sanitization**: Strips special characters, whitespace, and path traversal sequences (`../`).
- **Entropy**: Timestamp + 3-byte cryptographically secure random hex (`crypto.randomBytes(3)`).
- **Extension Normalization**: Maps `.jpeg` to `.jpg`, enforces `.jpg`, `.png`, `.webp`, `.gif`.

### Directory Layout
- Binary images are saved to `public/uploads/` and mirrored to `public/images/products/`.
- In the Git repository, images reside at:
  ```
  public/uploads/<safe-unique-filename>
  ```
- Storefront URL reference: `/uploads/<safe-unique-filename>`
- Static serving: Express and Vite serve `public/uploads/` directly without proxy overhead.

---

## 4. Server-Side GitHub REST API Workflow

### Binary Commit Process (`server/github.ts`)
1. **Validation**: Inspects magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF...WEBP`) and rejects dangerous formats (executable files, scripts, HTML, SVG).
2. **Local Write**: Writes the binary file immediately to `public/uploads/` so the current runtime instance can access and serve it without delay.
3. **Existing SHA Check**: Queries `GET /repos/{owner}/{repo}/contents/{path}?ref={branch}` to determine if the file exists and obtain its blob SHA.
4. **Base64 Payload**: Converts the Node.js `Buffer` into Base64 (`buffer.toString('base64')`).
5. **Atomic Commit**: Calls `PUT /repos/{owner}/{repo}/contents/{path}` with the commit message, committer info, and branch.
6. **Concurrent Commit Conflict Handling**:
   - If another commit updated the branch concurrently, GitHub responds with `HTTP 409 Conflict`.
   - The workflow automatically catches 409 errors, refetches the latest SHA/ref, and retries with exponential backoff and jitter (up to 3 retries).
7. **Persistence Confirmation**: Validates that GitHub returned a valid `commit.sha` and `content.sha` before reporting success.
8. **Catalog Synchronization**: Updates database references in `data/db.json` and `src/data/products.ts`, and commits updated data files to the GitHub repo.

---

## 5. Migration from Legacy Vercel Blob

If you have existing images hosted on Vercel Blob (`blob.vercel-storage.com`), run the migration utility to download, validate, commit them to GitHub, and update catalog references:

### CLI Commands
```bash
# 1. Verify what images need migration
npm run migrate:github:verify

# 2. Perform a dry run (no files written)
npm run migrate:github:dry-run

# 3. Execute live migration
npm run migrate:github
```

### Admin API Endpoint
Administrators can also trigger migration via the authenticated API:
```http
POST /api/github/migrate
Authorization: Bearer <admin-session-token>
Content-Type: application/json

{ "dryRun": false }
```

A complete migration audit manifest is saved to `data/github-migration-manifest.json`.

---

## 6. Testing & Verification

Run the dedicated test suite to verify upload validation, safe filenames, local filesystem storage, simulated GitHub API commits, 409 conflict retries, database persistence, and production build integrity:

```bash
npm run test:github
```

All 9 test suites verify:
1. Upload file validation & magic bytes inspection (JPEG, PNG, script/HTML rejection).
2. Safe unique filename generation with collision resistance.
3. Local codebase persistence in `public/uploads/`.
4. GitHub REST API binary commit workflow & SHA verification.
5. Concurrent commit collision & 409 conflict retry resilience.
6. Token confidentiality & credential masking.
7. Authoritative database persistence & code reference sync.
8. Storefront static image resolution from `public/uploads/`.
9. Production build bundle integrity (`dist/index.html`, `dist/server.cjs`, `api/index.js`).

---

## 7. Vercel Deployment Guide

1. Push your repository changes to GitHub.
2. In the **Vercel Dashboard**:
   - Go to your Project > **Settings** > **Environment Variables**.
   - Add `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO`.
   - Add `STORAGE_PROVIDER="github"`.
3. Trigger a redeploy:
   - Go to **Deployments** > click **Redeploy** on your latest deployment.
4. When you upload or edit product photos in the Lariel Admin Dashboard, the server automatically commits the binary images and updated catalog state directly into your GitHub repository!
