import { tool } from "ai";
import { octo } from "../util";
import { z } from "zod";

// https://docs.github.com/rest/issues/milestones
const CreateMilestoneSchema = z.object({
  title: z.string().min(1),
  state: z.enum(["open", "closed"]).optional(),
  description: z.string().optional(),
  due_on: z.string().optional(), // ISO 8601
});

const UpdateMilestoneSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().optional(),
  state: z.enum(["open", "closed"]).optional(),
  description: z.string().optional(),
  due_on: z.string().optional(),
});

const ListMilestonesSchema = z.object({
  state: z.enum(["open", "closed", "all"]).optional().default("open"),
  sort: z.enum(["due_on", "completeness"]).optional().default("due_on"),
  direction: z.enum(["asc", "desc"]).optional().default("asc"),
  limit: z.number().int().positive().max(100).optional().default(50),
});

export const listMilestonesTool = tool({
  description: "List milestones for DEFAULT_REPO.",
  inputSchema: ListMilestonesSchema,
  async execute({ state, sort, direction, limit }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/milestones", { owner, repo, state, sort, direction, per_page: limit });
    return { items: (r.data as any[]).map(m => ({ number: m.number, title: m.title, state: m.state, due_on: m.due_on })) };
  },
});

export const createMilestoneTool = tool({
  description: "Create a milestone.",
  inputSchema: CreateMilestoneSchema,
  async execute({ title, state, description, due_on }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("POST /repos/{owner}/{repo}/milestones", { owner, repo, title, state, description, due_on });
    return { number: r.data.number, url: r.data.html_url, status: "created" as const };
  },
});

export const updateMilestoneTool = tool({
  description: "Update a milestone.",
  inputSchema: UpdateMilestoneSchema,
  async execute({ number, title, state, description, due_on }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("PATCH /repos/{owner}/{repo}/milestones/{milestone_number}", { owner, repo, milestone_number: number, title, state, description, due_on });
    return { number: r.data.number, status: "updated" as const };
  },
});

export const deleteMilestoneTool = tool({
  description: "Delete a milestone.",
  inputSchema: z.object({ number: z.number().int().positive() }),
  async execute({ number }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    await client.request("DELETE /repos/{owner}/{repo}/milestones/{milestone_number}", { owner, repo, milestone_number: number });
    return { number, status: "deleted" as const };
  },
});

export const githubMilestonesTools = { listMilestonesTool, createMilestoneTool, updateMilestoneTool, deleteMilestoneTool };
