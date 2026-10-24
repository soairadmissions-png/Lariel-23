import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  committerName: string;
  committerEmail: string;
  isConfigured: boolean;
}

export interface GitHubCommitResult {
  success: boolean;
  sha?: string;
  commitSha?: string;
  htmlUrl?: string;
  downloadUrl?: string;
  path: string;
  error?: string;
  retries?: number;
}

export interface GitHubDiagnostics {
  isConfigured: boolean;
  owner: string | null;
  repo: string | null;
  branch: string;
  hasToken: boolean;
  tokenPrefix: string | null;
  committerName: string;
  committerEmail: string;
  apiConnected?: boolean;
  repoPermissions?: {
    push?: boolean;
    pull?: boolean;
    admin?: boolean;
  };
  rateLimit?: {
    limit?: number;
    remaining?: number;
    reset?: number;
  };
  error?: string;
  timestamp: string;
}

/**
 * Resolves GitHub configuration from environment variables.
 * Supports standard GITHUB_TOKEN / GITHUB_PAT and GITHUB_REPOSITORY (owner/repo) or discrete vars.
 */
export function getGitHubConfig(): GitHubConfig {
  const token = (process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || '').trim();

  // If GITHUB_REPOSITORY is defined as "owner/repo" (standard GitHub Actions / CI format)
  let owner = (process.env.GITHUB_OWNER || process.env.GITHUB_REPO_OWNER || '').trim();
  let repo = (process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY_NAME || '').trim();

  if (process.env.GITHUB_REPOSITORY && (!owner || !repo)) {
    const parts = process.env.GITHUB_REPOSITORY.split('/');
    if (parts.length === 2) {
      if (!owner) owner = parts[0].trim();
      if (!repo) repo = parts[1].trim();
    }
  }

  // Fallbacks if only owner or repo provided
  const branch = (process.env.GITHUB_BRANCH || process.env.GITHUB_DEFAULT_BRANCH || 'main').trim();
  const committerName = (process.env.GITHUB_COMMITTER_NAME || 'Lariel Essentials Admin').trim();
  const committerEmail = (process.env.GITHUB_COMMITTER_EMAIL || 'admin@larielextravaganza.com').trim();

  const isConfigured = Boolean(token && owner && repo);

  return {
    token,
    owner,
    repo,
    branch,
    committerName,
    committerEmail,
    isConfigured,
  };
}

/**
 * Generate a safe, collision-resistant, URL-friendly unique filename.
 * E.g. "amanda_3d_petals_robe_1792496143526_a8f9c2.jpg"
 */
export function generateSafeUniqueFilename(
  originalFilename: string,
  fallbackExt: string = 'jpg'
): string {
  const rawExt = path.extname(originalFilename).replace('.', '').toLowerCase() || fallbackExt;
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const baseName = path.basename(originalFilename, path.extname(originalFilename));
  
  // Sanitize: lowercase, alphanumeric and underscores only, max 35 chars
  const cleanBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 35) || 'image';

  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(3).toString('hex'); // 6 hex chars

  return `${cleanBase}_${timestamp}_${randomSuffix}.${ext}`;
}

/**
 * Fetch existing file metadata from GitHub repository if it exists.
 * Returns the file's current SHA for update operations, or null if not found.
 */
export async function getGitHubFileSha(
  filePath: string,
  config: GitHubConfig
): Promise<string | null> {
  const cleanPath = filePath.replace(/^\/+/, '');
  const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${cleanPath}?ref=${encodeURIComponent(config.branch)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Lariel-Essentials-App/1.0',
      },
    });

    if (res.status === 200) {
      const data = await res.json();
      return (data && typeof data.sha === 'string') ? data.sha : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Commits a binary buffer or string directly to the GitHub repository using the GitHub REST API.
 * Automatically handles:
 * - Base64 binary encoding
 * - Existing file SHA discovery for in-place updates
 * - HTTP 409 conflict retries with exponential backoff and refetching
 * - Persistence confirmation
 */
export async function commitFileToGitHub(options: {
  repoPath: string; // e.g. "public/uploads/bride_robe_123.jpg"
  buffer: Buffer;
  message?: string;
  config?: GitHubConfig;
  maxRetries?: number;
}): Promise<GitHubCommitResult> {
  const config = options.config || getGitHubConfig();

  if (!config.isConfigured) {
    return {
      success: false,
      path: options.repoPath,
      error: 'GitHub storage is not configured. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO.',
    };
  }

  const cleanPath = options.repoPath.replace(/^\/+/, '');
  const base64Content = options.buffer.toString('base64');
  const commitMessage =
    options.message ||
    `feat(media): commit ${path.basename(cleanPath)} to repository [skip ci]`;

  const maxRetries = options.maxRetries ?? 3;
  let attempt = 0;
  let lastError = '';

  while (attempt <= maxRetries) {
    attempt++;
    try {
      // 1. Check if the file already exists to obtain its current SHA
      const currentSha = await getGitHubFileSha(cleanPath, config);

      // 2. Prepare commit payload
      const payload: Record<string, any> = {
        message: commitMessage,
        content: base64Content,
        branch: config.branch,
        committer: {
          name: config.committerName,
          email: config.committerEmail,
        },
      };

      if (currentSha) {
        payload.sha = currentSha;
      }

      const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${cleanPath}`;

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'Lariel-Essentials-App/1.0',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch {}

      // 3. Handle 409 Conflict (concurrent commits on branch) with retry
      if (res.status === 409 && attempt <= maxRetries) {
        console.warn(`GitHub commit conflict (409) for ${cleanPath}. Retrying attempt ${attempt}/${maxRetries}...`);
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 5000);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }

      if (!res.ok) {
        const errorMsg = data?.message || `GitHub API error (HTTP ${res.status}): ${responseText.slice(0, 200)}`;
        lastError = errorMsg;
        if (attempt <= maxRetries && res.status >= 500) {
          // Transient server error retry
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
        return {
          success: false,
          path: cleanPath,
          error: errorMsg,
          retries: attempt - 1,
        };
      }

      // 4. Persistence verification: verify commit returned content with valid SHA
      const contentSha = data?.content?.sha;
      const commitSha = data?.commit?.sha;

      if (!contentSha && !commitSha) {
        return {
          success: false,
          path: cleanPath,
          error: 'GitHub accepted request but did not return confirmation SHA.',
          retries: attempt - 1,
        };
      }

      return {
        success: true,
        sha: contentSha,
        commitSha: commitSha,
        htmlUrl: data?.content?.html_url,
        downloadUrl: data?.content?.download_url,
        path: cleanPath,
        retries: attempt - 1,
      };
    } catch (err: any) {
      lastError = err?.message || String(err);
      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
    }
  }

}

/**
 * Deletes a file directly from the GitHub repository using the GitHub REST Contents API.
 */
export async function deleteFileFromGitHub(options: {
  repoPath: string; // e.g. "public/uploads/bride_robe_123.jpg"
  message?: string;
  config?: GitHubConfig;
}): Promise<{ success: boolean; error?: string }> {
  const config = options.config || getGitHubConfig();

  if (!config.isConfigured) {
    return {
      success: false,
      error: 'GitHub storage is not configured.',
    };
  }

  const cleanPath = options.repoPath.replace(/^\/+/, '');
  try {
    const sha = await getGitHubFileSha(cleanPath, config);
    if (!sha) {
      // File does not exist on GitHub, already deleted
      return { success: true };
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${cleanPath}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'Lariel-Essentials-App/1.0',
      },
      body: JSON.stringify({
        message: options.message || `chore(media): delete ${path.basename(cleanPath)} [skip ci]`,
        sha,
        branch: config.branch,
        committer: {
          name: config.committerName,
          email: config.committerEmail,
        },
      }),
    });

    if (res.ok || res.status === 404) {
      return { success: true };
    }
    const errText = await res.text();
    return { success: false, error: `GitHub delete failed (HTTP ${res.status}): ${errText.slice(0, 150)}` };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Commits multiple files atomically using the GitHub Git Data API (Trees/Blobs/Commits/Refs).
 * Creates a single atomic commit with all modified files, preventing partial commits and race conditions.
 */
export async function commitTreeToGitHub(options: {
  files: Array<{ path: string; buffer?: Buffer; content?: string }>;
  message: string;
  config?: GitHubConfig;
}): Promise<{
  success: boolean;
  commitSha?: string;
  htmlUrl?: string;
  filesCommitted: string[];
  error?: string;
}> {
  const config = options.config || getGitHubConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      filesCommitted: [],
      error: 'GitHub is not configured (missing GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO).',
    };
  }

  const validFiles = options.files.filter((f) => f.buffer || f.content !== undefined);
  if (validFiles.length === 0) {
    return { success: true, filesCommitted: [] };
  }

  const headers = {
    'Authorization': `Bearer ${config.token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'Lariel-Essentials-App/1.0',
  };

  const maxRetries = 3;
  let attempt = 0;
  let lastError = '';

  while (attempt <= maxRetries) {
    attempt++;
    try {
      // 1. Get current branch reference
      const refUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/ref/heads/${encodeURIComponent(config.branch)}`;
      const refRes = await fetch(refUrl, { headers });
      if (!refRes.ok) {
        throw new Error(`Failed to get branch ref ${config.branch} (HTTP ${refRes.status})`);
      }
      const refData = await refRes.json();
      const latestCommitSha = refData?.object?.sha;
      if (!latestCommitSha) {
        throw new Error(`Branch ref missing commit sha for ${config.branch}`);
      }

      // 2. Get the base tree SHA
      const commitUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/commits/${latestCommitSha}`;
      const commitRes = await fetch(commitUrl, { headers });
      if (!commitRes.ok) {
        throw new Error(`Failed to get commit ${latestCommitSha} (HTTP ${commitRes.status})`);
      }
      const commitData = await commitRes.json();
      const baseTreeSha = commitData?.tree?.sha;

      // 3. Create blobs for each file
      const treeEntries: Array<{ path: string; mode: string; type: string; sha: string }> = [];
      for (const file of validFiles) {
        const base64 = file.buffer
          ? file.buffer.toString('base64')
          : Buffer.from(file.content || '', 'utf8').toString('base64');

        const blobUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/blobs`;
        const blobRes = await fetch(blobUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: base64,
            encoding: 'base64',
          }),
        });

        if (!blobRes.ok) {
          const blobErr = await blobRes.text();
          throw new Error(`Failed to create blob for ${file.path}: HTTP ${blobRes.status} ${blobErr.slice(0, 100)}`);
        }
        const blobData = await blobRes.json();
        treeEntries.push({
          path: file.path.replace(/^\/+/, ''),
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        });
      }

      // 4. Create new tree with base_tree
      const treeUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/trees`;
      const treeRes = await fetch(treeUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeEntries,
        }),
      });

      if (!treeRes.ok) {
        const treeErr = await treeRes.text();
        throw new Error(`Failed to create tree: HTTP ${treeRes.status} ${treeErr.slice(0, 100)}`);
      }
      const treeData = await treeRes.json();
      const newTreeSha = treeData.sha;

      // 5. Create new commit
      const newCommitUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/commits`;
      const newCommitRes = await fetch(newCommitUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: options.message,
          tree: newTreeSha,
          parents: [latestCommitSha],
          author: {
            name: config.committerName,
            email: config.committerEmail,
            date: new Date().toISOString(),
          },
          committer: {
            name: config.committerName,
            email: config.committerEmail,
            date: new Date().toISOString(),
          },
        }),
      });

      if (!newCommitRes.ok) {
        const commitErr = await newCommitRes.text();
        throw new Error(`Failed to create commit: HTTP ${newCommitRes.status} ${commitErr.slice(0, 100)}`);
      }
      const newCommitData = await newCommitRes.json();
      const newCommitSha = newCommitData.sha;

      // 6. Update branch ref
      const updateRefRes = await fetch(refUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sha: newCommitSha,
          force: false,
        }),
      });

      if (!updateRefRes.ok) {
        if (updateRefRes.status === 409 && attempt <= maxRetries) {
          console.warn(`Branch moved during tree commit (409). Retrying attempt ${attempt}/${maxRetries}...`);
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
        const updateErr = await updateRefRes.text();
        throw new Error(`Failed to update branch ref: HTTP ${updateRefRes.status} ${updateErr.slice(0, 100)}`);
      }

      return {
        success: true,
        commitSha: newCommitSha,
        htmlUrl: newCommitData.html_url || `https://github.com/${config.owner}/${config.repo}/commit/${newCommitSha}`,
        filesCommitted: validFiles.map((f) => f.path),
      };
    } catch (err: any) {
      lastError = err?.message || String(err);
      if (attempt <= maxRetries && lastError.includes('409')) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      break;
    }
  }

  return {
    success: false,
    filesCommitted: [],
    error: lastError || 'Tree commit failed after retries',
  };
}

/**
 * Commits multiple files (e.g. uploaded image + db.json + products.ts) atomically,
 * with automatic fallback to sequential contents API.
 */
export async function commitMultipleFilesToGitHub(
  files: Array<{ path: string; buffer?: Buffer; content?: string }>,
  commitMessagePrefix: string = 'feat(sync): update catalog and media'
): Promise<{ success: boolean; committed: string[]; failed: string[]; errors: string[]; commitSha?: string; htmlUrl?: string }> {
  const config = getGitHubConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      committed: [],
      failed: files.map((f) => f.path),
      errors: ['GitHub is not configured (missing GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO).'],
    };
  }

  // 1. Attempt atomic multi-file commit via Git Data Trees API
  try {
    const treeRes = await commitTreeToGitHub({
      files,
      message: `${commitMessagePrefix} (${files.length} files) [skip ci]`,
      config,
    });
    if (treeRes.success && treeRes.commitSha) {
      return {
        success: true,
        committed: treeRes.filesCommitted,
        failed: [],
        errors: [],
        commitSha: treeRes.commitSha,
        htmlUrl: treeRes.htmlUrl,
      };
    }
  } catch (treeErr) {
    console.warn('Atomic tree commit failed, falling back to sequential contents API:', treeErr);
  }

  // 2. Fallback: Sequential contents API
  const committed: string[] = [];
  const failed: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const buf = file.buffer || (file.content ? Buffer.from(file.content, 'utf8') : null);
    if (!buf) {
      failed.push(file.path);
      errors.push(`No content provided for ${file.path}`);
      continue;
    }

    const res = await commitFileToGitHub({
      repoPath: file.path,
      buffer: buf,
      message: `${commitMessagePrefix}: ${path.basename(file.path)} [skip ci]`,
      config,
    });

    if (res.success) {
      committed.push(file.path);
    } else {
      failed.push(file.path);
      if (res.error) errors.push(`${file.path}: ${res.error}`);
    }
  }

  return {
    success: failed.length === 0,
    committed,
    failed,
    errors,
  };
}

/**
 * Health check and diagnostic inspection for GitHub API integration.
 * Masked token: never leaks credentials in responses.
 */
export async function getGitHubDiagnostics(): Promise<GitHubDiagnostics> {
  const config = getGitHubConfig();

  const tokenPrefix = config.token
    ? `${config.token.slice(0, 4)}...${config.token.slice(-4)}`
    : null;

  const result: GitHubDiagnostics = {
    isConfigured: config.isConfigured,
    owner: config.owner || null,
    repo: config.repo || null,
    branch: config.branch,
    hasToken: Boolean(config.token),
    tokenPrefix,
    committerName: config.committerName,
    committerEmail: config.committerEmail,
    timestamp: new Date().toISOString(),
  };

  if (!config.isConfigured) {
    result.error = 'GitHub integration is not fully configured (missing GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO).';
    return result;
  }

  // Verify connection to GitHub API and inspect permissions
  try {
    const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Lariel-Essentials-App/1.0',
      },
    });

    // Capture rate limit headers
    const limit = res.headers.get('x-ratelimit-limit');
    const remaining = res.headers.get('x-ratelimit-remaining');
    const reset = res.headers.get('x-ratelimit-reset');
    if (limit && remaining) {
      result.rateLimit = {
        limit: Number(limit),
        remaining: Number(remaining),
        reset: reset ? Number(reset) : undefined,
      };
    }

    if (res.status === 200) {
      const data = await res.json();
      result.apiConnected = true;
      result.repoPermissions = data?.permissions || {};
    } else if (res.status === 401) {
      result.apiConnected = false;
      result.error = 'Invalid GitHub Personal Access Token (HTTP 401 Unauthorized).';
    } else if (res.status === 404) {
      result.apiConnected = false;
      result.error = `Repository ${config.owner}/${config.repo} not found (HTTP 404) or token lacks repo read permissions.`;
    } else {
      result.apiConnected = false;
      result.error = `GitHub API returned HTTP ${res.status}`;
    }
  } catch (err: any) {
    result.apiConnected = false;
    result.error = `Could not reach GitHub API: ${err?.message || err}`;
  }

  return result;
}
