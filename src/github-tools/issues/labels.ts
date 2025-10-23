import { tool } from "ai";
import { octo } from "../util";
import { z } from "zod";

// https://docs.github.com/en/rest/issues/labels
const CreateLabelSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^[0-9a-fA-F]{6}$/).optional(),
  description: z.string().optional(),
});

const UpdateLabelSchema = z.object({
  current_name: z.string().min(1),
  new_name: z.string().optional(),
  color: z.string().regex(/^[0-9a-fA-F]{6}$/).optional(),
  description: z.string().optional(),
});

const ListLabelsSchema = z.object({
  limit: z.number().int().positive().max(100).optional().default(50),
});

const IssueLabelsSchema = z.object({
  number: z.number().int().positive(),
  labels: z.array(z.string()).optional(), // if omitted on set, clears labels
});

const IssueLabelRemoveSchema = z.object({
  number: z.number().int().positive(),
  name: z.string().min(1),
});

export const listRepoLabelsTool = tool({
  description: "List labels for DEFAULT_REPO.",
  inputSchema: ListLabelsSchema,
  async execute({ limit }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/labels", { owner, repo, per_page: limit });
    return { items: (r.data as any[]).map(l => ({ name: l.name, color: l.color, description: l.description })) };
  },
});

export const createRepoLabelTool = tool({
  description: "Create a label in DEFAULT_REPO.",
  inputSchema: CreateLabelSchema,
  async execute({ name, color, description }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("POST /repos/{owner}/{repo}/labels", { owner, repo, name, color, description });
    return { name: r.data.name, url: r.data.url, status: "created" as const };
  },
});

export const updateRepoLabelTool = tool({
  description: "Update a label in DEFAULT_REPO.",
  inputSchema: UpdateLabelSchema,
  async execute({ current_name, new_name, color, description }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("PATCH /repos/{owner}/{repo}/labels/{name}", { owner, repo, name: current_name, new_name, color, description });
    return { name: r.data.name, status: "updated" as const };
  },
});

export const deleteRepoLabelTool = tool({
  description: "Delete a label in DEFAULT_REPO.",
  inputSchema: z.object({ name: z.string().min(1) }),
  async execute({ name }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    await client.request("DELETE /repos/{owner}/{repo}/labels/{name}", { owner, repo, name });
    return { name, status: "deleted" as const };
  },
});

export const setIssueLabelsTool = tool({
  description: "Replace labels on an issue (omit labels to clear).",
  inputSchema: IssueLabelsSchema,
  async execute({ number, labels }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("PUT /repos/{owner}/{repo}/issues/{issue_number}/labels", { owner, repo, issue_number: number, labels: labels ?? [] });
    return { number, labels: (r.data as any[]).map((l:any)=>l.name) };
  },
});

export const addIssueLabelsTool = tool({
  description: "Add labels to an issue.",
  inputSchema: IssueLabelsSchema,
  async execute({ number, labels = [] }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("POST /repos/{owner}/{repo}/issues/{issue_number}/labels", { owner, repo, issue_number: number, labels });
    return { number, labels: (r.data as any[]).map((l:any)=>l.name) };
  },
});

export const removeIssueLabelTool = tool({
  description: "Remove a single label from an issue.",
  inputSchema: IssueLabelRemoveSchema,
  async execute({ number, name }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    await client.request("DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}", { owner, repo, issue_number: number, name });
    return { number, removed: name };
  },
});

export const githubIssueLabelsTools = {
  listRepoLabelsTool, createRepoLabelTool, updateRepoLabelTool, deleteRepoLabelTool,
  setIssueLabelsTool, addIssueLabelsTool, removeIssueLabelTool
};
