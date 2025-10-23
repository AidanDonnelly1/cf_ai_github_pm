import { tool } from "ai";
import { octo } from "../util";
import { z } from "zod";

//https://docs.github.com/en/rest/pulls/comments
const ListRepoReviewCommentsSchema = z.object({
  sort: z.enum(["created", "updated"]).optional().default("created"),
  direction: z.enum(["asc", "desc"]).optional().default("desc"),
  since: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
});

const GetReviewCommentSchema = z.object({ comment_id: z.number().int().positive() });

const UpdateReviewCommentSchema = z.object({
  comment_id: z.number().int().positive(),
  body: z.string().min(1),
});

const DeleteReviewCommentSchema = z.object({ comment_id: z.number().int().positive() });

const ListPRReviewCommentsSchema = z.object({
  number: z.number().int().positive(),
  limit: z.number().int().positive().max(100).optional().default(50),
});

const CreatePRReviewCommentSchema = z.object({
  number: z.number().int().positive(),
  body: z.string().min(1),
  commit_id: z.string().min(1),
  path: z.string().min(1),
  side: z.enum(["LEFT", "RIGHT"]).optional(),
  start_side: z.enum(["LEFT", "RIGHT"]).optional(),
  line: z.number().int().positive().optional(),
  start_line: z.number().int().positive().optional(),
  in_reply_to: z.number().int().positive().optional().describe("If provided, creates a reply instead of a new comment thread."),
});

const CreateReplyForReviewCommentSchema = z.object({
  comment_id: z.number().int().positive(),
  body: z.string().min(1),
});

export const listRepoReviewCommentsTool = tool({
  description: "List review comments in a repository.",
  inputSchema: ListRepoReviewCommentsSchema,
  async execute({ sort, direction, since, limit }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/pulls/comments", {
      owner, repo, sort, direction, since, per_page: limit,
    });
    const items = (r.data as any[]).map((c) => ({
      id: c.id, user: c.user?.login, pr_url: c.pull_request_url, path: c.path, body: c.body, url: c.html_url,
    }));
    return { items };
  },
});

export const getReviewCommentTool = tool({
  description: "Get a single review comment by ID.",
  inputSchema: GetReviewCommentSchema,
  async execute({ comment_id }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/pulls/comments/{comment_id}", {
      owner, repo, comment_id,
    });
    const c = r.data as any;
    return { id: c.id, user: c.user?.login, pr_url: c.pull_request_url, path: c.path, body: c.body, url: c.html_url };
  },
});

export const updateReviewCommentTool = tool({
  description: "Update a review comment for a pull request.",
  inputSchema: UpdateReviewCommentSchema,
  async execute({ comment_id, body }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}", {
      owner, repo, comment_id, body,
    });
    return { id: r.data.id, url: r.data.html_url, status: "updated" as const };
  },
});

export const deleteReviewCommentTool = tool({
  description: "Delete a review comment for a pull request.",
  inputSchema: DeleteReviewCommentSchema,
  async execute({ comment_id }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    await client.request("DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}", {
      owner, repo, comment_id,
    });
    return { id: comment_id, status: "deleted" as const };
  },
});

export const listPRReviewCommentsTool = tool({
  description: "List review comments on a specific pull request.",
  inputSchema: ListPRReviewCommentsSchema,
  async execute({ number, limit }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/comments", {
      owner, repo, pull_number: number, per_page: limit,
    });
    const items = (r.data as any[]).map((c) => ({
      id: c.id, user: c.user?.login, path: c.path, body: c.body, url: c.html_url,
    }));
    return { number, items };
  },
});

export const createPRReviewCommentTool = tool({
  description: "Create a review comment on a pull request (or a reply if in_reply_to is provided).",
  inputSchema: CreatePRReviewCommentSchema,
  async execute({ number, body, commit_id, path, side, start_side, line, start_line, in_reply_to }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;

    if (in_reply_to) {
      // Reply to an existing review comment thread
      const r = await client.request("POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/replies", {
        owner, repo, comment_id: in_reply_to, body,
      });
      return { id: r.data.id, url: r.data.html_url, status: "created" as const };
    }

    const payload: any = { body, commit_id, path };
    if (line !== undefined) payload.line = line;
    if (side !== undefined) payload.side = side;
    if (start_line !== undefined) payload.start_line = start_line;
    if (start_side !== undefined) payload.start_side = start_side;

    const r = await client.request("POST /repos/{owner}/{repo}/pulls/{pull_number}/comments", {
      owner, repo, pull_number: number, ...payload,
    });
    return { id: r.data.id, url: r.data.html_url, status: "created" as const };
  },
});

export const createReplyForReviewCommentTool = tool({
  description: "Create a reply for a review comment.",
  inputSchema: CreateReplyForReviewCommentSchema,
  async execute({ comment_id, body }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/replies", {
      owner, repo, comment_id, body,
    });
    return { id: r.data.id, url: r.data.html_url, status: "created" as const };
  },
});

export const githubPullReviewCommentsTools = {
  listRepoReviewCommentsTool, getReviewCommentTool, updateReviewCommentTool,
  deleteReviewCommentTool, listPRReviewCommentsTool,
  createPRReviewCommentTool, createReplyForReviewCommentTool,
};
