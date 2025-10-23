import { tool } from "ai";
import { z } from "zod";
import { octo } from "../util";


//https://docs.github.com/en/rest/branches/branches
const ListBranchesSchema = z.object({
  protected: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional().default(30),
  keyword: z.string().optional().describe("one word; filters branch name locally"),
});

const GetBranchSchema = z.object({
  branch: z.string().min(1),
});

const RenameBranchSchema = z.object({
  branch: z.string().min(1).describe("Current branch name"),
  new_name: z.string().min(1).describe("New branch name"),
});

const MergeBranchSchema = z.object({
  base: z.string().min(1).describe("Base branch to merge into"),
  head: z.string().min(1).describe("Head ref (branch name or commit SHA) to merge from"),
  commit_message: z.string().optional(),
});

export const listBranchesTool = tool({
  description: "List branches in DEFAULT_REPO.",
  inputSchema: ListBranchesSchema,
  async execute({ protected: isProtected, limit, keyword }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const res = await client.request("GET /repos/{owner}/{repo}/branches", {
      owner, repo, protected: isProtected, per_page: limit,
    });

    const items = (res.data as any[])
      .filter((b) => {
        if (!keyword) return true;
        const k = keyword.toLowerCase();
        return b.name?.toLowerCase?.().includes(k);
      })
      .map((b) => ({
        name: b.name,
        protected: !!b.protected,
        commit_sha: b.commit?.sha,
        url: b._links?.html ?? b._links?.self,
      }));

    return { items };
  },
});

export const getBranchTool = tool({
  description: "Get a single branch by name.",
  inputSchema: GetBranchSchema,
  async execute({ branch }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/branches/{branch}", {
      owner, repo, branch,
    });
    const b = r.data as any;
    return {
      name: b.name,
      protected: !!b.protected,
      commit_sha: b.commit?.sha,
      protection_url: b.protection_url,
      link_html: b._links?.html,
      link_self: b._links?.self,
    };
  },
});

export const renameBranchTool = tool({
  description: "Rename a branch in DEFAULT_REPO.",
  inputSchema: RenameBranchSchema,
  async execute({ branch, new_name }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("POST /repos/{owner}/{repo}/branches/{branch}/rename", {
      owner, repo, branch, new_name,
    });
    return { old_name: branch, new_name: (r.data as any).name, status: "renamed" as const };
  },
});

export const mergeBranchTool = tool({
  description: "Merge a branch/ref into a base branch in DEFAULT_REPO.",
  inputSchema: MergeBranchSchema,
  async execute({ base, head, commit_message }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("POST /repos/{owner}/{repo}/merges", {
      owner, repo, base, head, commit_message,
    });
    // 201 -> created merge commit; 204 -> already up to date
    const status = r.status === 201 ? "merged" as const : (r.status === 204 ? "noop" as const : "ok" as const);
    const data: any = r.data ?? {};
    return {
      base, head,
      sha: data.sha,
      commit_message: data.commit?.message ?? commit_message,
      status,
    };
  },
});

export const githubBranchesTools = {
  listBranchesTool,
  getBranchTool,
  renameBranchTool,
  mergeBranchTool,
};
