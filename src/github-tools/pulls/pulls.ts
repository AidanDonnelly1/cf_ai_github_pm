import { tool } from "ai";
import { octo } from "../util";
import { z } from "zod";

//https://docs.github.com/en/rest/pulls/pulls
const CreatePullSchema = z.object({
  title: z.string().min(1, "title is required"),
  head: z.string().min(1, "head is required").describe("Branch containing your changes. Use 'user:branch' for forks."),
  base: z.string().min(1, "base is required").describe("Branch you want to merge into."),
  body: z.string().optional(),
  draft: z.boolean().optional(),
  maintainer_can_modify: z.boolean().optional(),
});

const ListPullsSchema = z.object({
  state: z.enum(["open", "closed", "all"]).optional().default("open"),
  head: z.string().optional(),
  base: z.string().optional(),
  sort: z.enum(["created", "updated", "popularity", "long-running"]).optional().default("created"),
  direction: z.enum(["desc", "asc"]).optional().default("desc"),
  limit: z.number().int().positive().max(100).optional().default(20),
  keyword: z.string().optional().describe("one word; filters title/body locally"),
});

const GetPullSchema = z.object({ number: z.number().int().positive() });

const UpdatePullSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().optional(),
  body: z.string().optional(),
  state: z.enum(["open", "closed"]).optional(),
  base: z.string().optional(),
  maintainer_can_modify: z.boolean().optional(),
  draft: z.boolean().optional(),
});

const ListPullCommitsSchema = z.object({
  number: z.number().int().positive(),
  limit: z.number().int().positive().max(250).optional().default(100),
});

const ListPullFilesSchema = z.object({
  number: z.number().int().positive(),
  limit: z.number().int().positive().max(300).optional().default(100),
});

const CheckPullMergedSchema = z.object({ number: z.number().int().positive() });

const MergePullSchema = z.object({
  number: z.number().int().positive(),
  commit_title: z.string().optional(),
  commit_message: z.string().optional(),
  merge_method: z.enum(["merge", "squash", "rebase"]).optional(),
  sha: z.string().optional().describe("Ensure head matches this SHA before merge."),
});

const UpdatePullBranchSchema = z.object({
  number: z.number().int().positive(),
  expected_head_sha: z.string().optional(),
});

export const createPullTool = tool({
  description: "Create a pull request in DEFAULT_REPO.",
  inputSchema: CreatePullSchema,
  async execute({ title, head, base, body, draft, maintainer_can_modify }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("POST /repos/{owner}/{repo}/pulls", {
      owner, repo, title, head, base, body, draft, maintainer_can_modify,
    });
    return { number: r.data.number, url: r.data.html_url, status: "created" as const };
  },
});

export const listPullsTool = tool({
  description: "List/search pull requests in DEFAULT_REPO. Display as: #{pr_number}. {pr_title}",
  inputSchema: ListPullsSchema,
  async execute({ state, head, base, sort, direction, limit, keyword }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const res = await client.request("GET /repos/{owner}/{repo}/pulls", {
      owner, repo, state, head, base, sort, direction, per_page: limit,
    });
    const items = (res.data as any[])
      .filter((it) => {
        if (!keyword) return true;
        const k = keyword.toLowerCase();
        return (it.title?.toLowerCase?.().includes(k) || it.body?.toLowerCase?.().includes(k));
      })
      .map((it) => ({
        number: it.number, title: it.title, url: it.html_url,
        state: it.state, draft: !!it.draft, head: it.head?.ref, base: it.base?.ref,
      }));
    return { items };
  },
});

export const getPullTool = tool({
  description: "Get a single pull request by number in DEFAULT_REPO.",
  inputSchema: GetPullSchema,
  async execute({ number }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
      owner, repo, pull_number: number,
    });
    const pr = r.data as any;
    return {
      number: pr.number, title: pr.title, url: pr.html_url, state: pr.state, draft: !!pr.draft,
      merged: !!pr.merged, head: pr.head?.ref, base: pr.base?.ref, user: pr.user?.login,
      created_at: pr.created_at, updated_at: pr.updated_at, body: pr.body ?? "",
    };
  },
});

export const updatePullTool = tool({
  description: "Update a pull request (title/body/state/base/draft/maintainer permissions).",
  inputSchema: UpdatePullSchema,
  async execute({ number, title, body, state, base, maintainer_can_modify, draft }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const payload: any = {};
    if (title !== undefined) payload.title = title;
    if (body !== undefined) payload.body = body;
    if (state !== undefined) payload.state = state;
    if (base !== undefined) payload.base = base;
    if (maintainer_can_modify !== undefined) payload.maintainer_can_modify = maintainer_can_modify;
    if (draft !== undefined) payload.draft = draft;

    const r = await client.request("PATCH /repos/{owner}/{repo}/pulls/{pull_number}", {
      owner, repo, pull_number: number, ...payload,
    });
    return { number: r.data.number, url: r.data.html_url, status: "updated" as const };
  },
});

export const listPullCommitsTool = tool({
  description: "List commits on a pull request.",
  inputSchema: ListPullCommitsSchema,
  async execute({ number, limit }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/commits", {
      owner, repo, pull_number: number, per_page: limit,
    });
    const items = (r.data as any[]).map((c) => ({
      sha: c.sha, author: c.author?.login ?? c.commit?.author?.name ?? null,
      message: c.commit?.message ?? "", html_url: c.html_url,
    }));
    return { items };
  },
});

export const listPullFilesTool = tool({
  description: "List files changed in a pull request.",
  inputSchema: ListPullFilesSchema,
  async execute({ number, limit }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/files", {
      owner, repo, pull_number: number, per_page: limit,
    });
    const items = (r.data as any[]).map((f) => ({
      filename: f.filename, status: f.status, additions: f.additions,
      deletions: f.deletions, changes: f.changes, blob_url: f.blob_url, raw_url: f.raw_url,
    }));
    return { items };
  },
});

export const checkPullMergedTool = tool({
  description: "Check if a pull request has been merged.",
  inputSchema: CheckPullMergedSchema,
  async execute({ number }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    try {
      await client.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/merge", {
        owner, repo, pull_number: number,
      });
      return { number, merged: true };
    } catch (e: any) {
      if (e?.status === 404) return { number, merged: false };
      throw e;
    }
  },
});

export const mergePullTool = tool({
  description: "Merge a pull request.",
  inputSchema: MergePullSchema,
  async execute({ number, commit_title, commit_message, merge_method, sha }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge", {
      owner, repo, pull_number: number, commit_title, commit_message, merge_method, sha,
    });
    return {
      number, merged: !!r.data.merged, message: r.data.message, sha: r.data.sha,
      status: r.data.merged ? "merged" as const : "failed" as const,
    };
  },
});

export const updatePullBranchTool = tool({
  description: "Update a pull request branch with latest from base.",
  inputSchema: UpdatePullBranchSchema,
  async execute({ number, expected_head_sha }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch", {
      owner, repo, pull_number: number, expected_head_sha,
    });
    return { number, status: "updated" as const, message: (r.data as any)?.message ?? "Branch update triggered" };
  },
});

export const githubPullsTools = {
  createPullTool, listPullsTool, getPullTool, updatePullTool,
  listPullCommitsTool, listPullFilesTool, checkPullMergedTool,
  mergePullTool, updatePullBranchTool,
};
