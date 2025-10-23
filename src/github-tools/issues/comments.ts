import { tool } from "ai";
import { octo } from "../util";
import { z } from "zod";

// https://docs.github.com/en/rest/issues/comments
const ListIssueCommentsSchema = z.object({
  number: z.number().int().positive(),
  limit: z.number().int().positive().max(100).optional().default(50),
});

const CreateIssueCommentSchema = z.object({
  number: z.number().int().positive(),
  body: z.string().min(1),
});

const UpdateIssueCommentSchema = z.object({
  comment_id: z.number().int().positive(),
  body: z.string().min(1),
});

const DeleteIssueCommentSchema = z.object({ comment_id: z.number().int().positive() });

export const listIssueCommentsTool = tool({
  description: "List comments on a specific issue/PR.",
  inputSchema: ListIssueCommentsSchema,
  async execute({ number, limit }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/issues/{issue_number}/comments", { owner, repo, issue_number: number, per_page: limit });
    return { items: (r.data as any[]).map(c => ({ id: c.id, user: c.user?.login, body: c.body, url: c.html_url })) };
  },
});

export const createIssueCommentTool = tool({
  description: "Create a comment on an issue/PR.",
  inputSchema: CreateIssueCommentSchema,
  async execute({ number, body }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", { owner, repo, issue_number: number, body });
    return { id: r.data.id, url: r.data.html_url, status: "created" as const };
  },
});

export const updateIssueCommentTool = tool({
  description: "Update an existing issue/PR comment by ID.",
  inputSchema: UpdateIssueCommentSchema,
  async execute({ comment_id, body }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}", { owner, repo, comment_id, body });
    return { id: r.data.id, url: r.data.html_url, status: "updated" as const };
  },
});

export const deleteIssueCommentTool = tool({
  description: "Delete an issue/PR comment by ID.",
  inputSchema: DeleteIssueCommentSchema,
  async execute({ comment_id }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    await client.request("DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}", { owner, repo, comment_id });
    return { id: comment_id, status: "deleted" as const };
  },
});

export const githubIssueCommentsTools = { listIssueCommentsTool, createIssueCommentTool, updateIssueCommentTool, deleteIssueCommentTool };
