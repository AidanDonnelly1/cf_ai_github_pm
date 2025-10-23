import { tool } from "ai";
import { octo } from "../util";
import { z } from "zod";


// https://docs.github.com/en/rest/issues/assignees
const IssueAssigneesSchema = z.object({
  number: z.number().int().positive(),
  assignees: z.array(z.string()).min(1),
});

const CheckAssigneeSchema = z.object({
  assignee: z.string().min(1),
});

const ListRepoAssigneesSchema = z.object({
  limit: z.number().int().positive().max(100).optional().default(30),
});

export const addIssueAssigneesTool = tool({
  description: "Add one or more assignees to an issue.",
  inputSchema: IssueAssigneesSchema,
  async execute({ number, assignees }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("POST /repos/{owner}/{repo}/issues/{issue_number}/assignees", { owner, repo, issue_number: number, assignees });
    return { number, assignees: r.data.assignees?.map((u:any)=>u.login) ?? [], status: "updated" as const };
  },
});

export const removeIssueAssigneesTool = tool({
  description: "Remove one or more assignees from an issue.",
  inputSchema: IssueAssigneesSchema,
  async execute({ number, assignees }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    await client.request("DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees", { owner, repo, issue_number: number, assignees });
    return { number, removed: assignees, status: "updated" as const };
  },
});

export const checkRepoAssigneeTool = tool({
  description: "Check if a user can be assigned issues in this repo.",
  inputSchema: CheckAssigneeSchema,
  async execute({ assignee }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    try {
      await client.request("GET /repos/{owner}/{repo}/assignees/{assignee}", { owner, repo, assignee });
      return { assignee, assignable: true };
    } catch (e: any) {
      if (e?.status === 404) return { assignee, assignable: false };
      throw e;
    }
  },
});

export const listRepoAssigneesTool = tool({
  description: "List assignable users for this repo.",
  inputSchema: ListRepoAssigneesSchema,
  async execute({ limit }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/assignees", { owner, repo, per_page: limit });
    return { items: (r.data as any[]).map(u => u.login) };
  },
});

export const githubIssueAssigneesTools = { addIssueAssigneesTool, removeIssueAssigneesTool, checkRepoAssigneeTool, listRepoAssigneesTool };
