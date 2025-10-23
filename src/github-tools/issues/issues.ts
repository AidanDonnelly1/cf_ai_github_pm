import { tool, type Tool } from "ai"
import { octo } from "../util";
import { z } from "zod";

// https://docs.github.com/en/rest/issues/labels
const CreateIssueSchema = z.object({
  title: z.string().min(1, "title is required"),
  body: z.string().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
});

const ListIssuesSchema = z.object({
  state: z.enum(["open", "closed", "all"]).optional().default("open").describe("This refers to the status of the issue."),
  keyword: z.string().optional().describe("Use this parameter sparingly, only if the user asks for issues related to X, or about Y. Keep this parameter to one word"),
  labels: z.array(z.string()).optional().describe("Not every issue about subject X will have the label X. For the most part, use this parameter if the user asks for a specific label. Alternatively, the labels: bug, documentation, duplicate, enhancement, good first issue, help wanted, invalid, question, and wontfix are popular. Using those labels is a safer bet if its related to the users request."),
  mentioned: z.string().optional().describe("This means the user is mentioned in the conversation or description of the issue. This does not mean the issue is assigned to me, but it does mean the issue is related to me."),
  assignee: z.string().optional().describe("If the user asks for issues that mention themselves use '@', if the user asks for issues assigned to no one use 'none', if the user asks for issues assigned to anyone but not someone specific use *. Otherwise, use the username the user provides or ask for it."),
  sort: z.enum(["created", "updated", "comments"]).optional().default("created"),
  direction: z.enum(["desc", "asc"]).optional().default("desc"),
  limit: z.number().int().positive().max(100).optional().default(20),
});

const UpdateIssueSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().optional(),
  body: z.string().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
});

const CloseIssueSchema = z.object({
  number: z.number().int().positive(),
});

export const createIssueTool = tool({
  description: "Create a GitHub issue in DEFAULT_REPO.",
  inputSchema: CreateIssueSchema,
  async execute({ title, body, labels, assignees }) {
    const client = octo();
    const owner = process.env.OWNER!
    const repo = process.env.REPO!
    const r = await client.request("POST /repos/{owner}/{repo}/issues", {
      owner, repo,
      title,
      body,
      labels,
      assignees,
    });
    return { number: r.data.number, url: r.data.html_url, status: "created" as const };
  },
});

export const listIssuesTool = tool({
  description: "List/search issues in DEFAULT_REPO. When you display issues make sure to use the format #{issue_number}. {issue_title}",
  inputSchema: ListIssuesSchema,
  async execute({ state, keyword, labels, mentioned, assignee, sort, direction, limit }) {
    const client = octo();
    const owner = process.env.OWNER!
    const repo = process.env.REPO!
    const res = await client.request("GET /repos/{owner}/{repo}/issues", {
      owner, repo,
      state,
      mentioned,
      assignee: assignee == '@' ? owner : assignee,
      sort,
      direction,
      per_page: limit,
      ...(labels?.length ? { labels: labels.join(",") } : {}),
    });

    const items = (res.data as any[])
    .filter((it) => {
      if (!keyword) return true;
      const lowerKeyword = keyword.toLowerCase();
      const inTitle = it.title?.toLowerCase?.().includes(lowerKeyword);
      const inBody = it.body?.toLowerCase?.().includes(lowerKeyword);
      return !(inTitle || inBody);
    }).map((it) => ({
        number: it.number,
        title: it.title,
        url: it.html_url,
        labels: (it.labels ?? []).map((l: any) => (typeof l === "string" ? l : l.name)).filter(Boolean),
      }));

    return { items };
  },
});

export const updateIssueTool = tool({
  description: "Update title/body/labels/assignees for an issue in DEFAULT_REPO. If the user does not provide an issue number then instead attempt to list issues and then ask for the user to give a specific number.",
  inputSchema: UpdateIssueSchema,
  async execute({ number, title, body, labels, assignees}) {
    const client = octo();
    const owner = process.env.OWNER!
    const repo = process.env.REPO!

    const payload: any = {};
    if (title !== undefined) payload.title = title;
    if (body !== undefined) payload.body = body;
    if (labels !== undefined) payload.labels = labels;
    if (assignees !== undefined) payload.assignees = assignees;

    const r = await client.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
      owner, repo,
      issue_number: number,
      ...payload,
    });

    return { number: r.data.number, url: r.data.html_url, status: "updated" as const };
  },
});

export const closeIssueTool = tool({
  description: "Close an issue in DEFAULT_REPO. If the user does not provide an issue number then instead attempt to list issues and then ask for the user to give a specific number.",
  inputSchema: CloseIssueSchema,
  async execute({ number }) {
    const client = octo();
    const owner = process.env.OWNER!;
    const repo = process.env.REPO!;

    const r = await client.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
      owner, repo,
      issue_number: number,
      state: "closed",
    });

    return { number: r.data.number, url: r.data.html_url, status: "closed" as const };
  },
});

export const githubIssueTools = {
  createIssueTool, listIssuesTool, updateIssueTool, closeIssueTool
};
