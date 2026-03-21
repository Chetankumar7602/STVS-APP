import { getLocalBlogs, normalizeBlog } from '@/lib/blogs';

const BLOGS_PATH = process.env.GITHUB_BLOGS_FILE_PATH || 'data/blogs.json';
const BRANCH = process.env.GITHUB_BLOGS_BRANCH || process.env.GITHUB_REPO_BRANCH || 'main';

function getGithubConfig() {
  return {
    token: process.env.GITHUB_BLOGS_TOKEN || process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_BLOGS_OWNER || process.env.GITHUB_REPO_OWNER,
    repo: process.env.GITHUB_BLOGS_REPO || process.env.GITHUB_REPO_NAME,
    branch: BRANCH,
    path: BLOGS_PATH,
  };
}

export function isGithubBlogsConfigured() {
  const { token, owner, repo } = getGithubConfig();
  return Boolean(token && owner && repo);
}

function getContentsUrl() {
  const { owner, repo, path } = getGithubConfig();
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
}

async function githubRequest(url, init = {}) {
  const { token } = getGithubConfig();

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${text}`);
  }

  return response.json();
}

function decodeGithubContent(content = '') {
  return Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf8');
}

function encodeGithubContent(value) {
  return Buffer.from(value, 'utf8').toString('base64');
}

function serializeBlogs(blogs) {
  return `${JSON.stringify(blogs, null, 2)}\n`;
}

export async function getGithubBlogsFile() {
  if (!isGithubBlogsConfigured()) {
    return { blogs: getLocalBlogs(), sha: null, source: 'local' };
  }

  const data = await githubRequest(getContentsUrl());
  const blogs = JSON.parse(decodeGithubContent(data.content)).map(normalizeBlog);
  blogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { blogs, sha: data.sha, source: 'github' };
}

export async function commitGithubBlogs(blogs, message, sha) {
  if (!isGithubBlogsConfigured()) {
    throw new Error('GitHub blog sync is not configured.');
  }

  const { branch } = getGithubConfig();

  await githubRequest(getContentsUrl(), {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: encodeGithubContent(serializeBlogs(blogs.map(normalizeBlog))),
      sha,
      branch,
    }),
  });
}
