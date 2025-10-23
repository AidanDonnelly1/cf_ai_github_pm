import { tool } from "ai";
import { octo } from "../util";
import { z } from "zod";

//https://docs.github.com/en/rest/pulls/review-requests
const PullNumberSchema = z.object({ number: z.number().int().positive() });

const RequestReviewersSchema = z.object({
  number: z.number().int().positive(),
  reviewers: z.array(z.string()).optional().default([]),
  team_reviewers: z.array(z.string()).optional().default([]),
});

const RemoveReviewersSchema = z.object({
  number: z.number().int().positive(),
  reviewers: z.array(z.string()).optional().default([]),
  team_reviewers: z.array(z.string()).optional().default([]),
});

export const getRequestedReviewersTool = tool({
  description: "Get all requested reviewers for a pull request.",
  inputSchema: PullNumberSchema,
  async execute({ number }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers", {
      owner, repo, pull_number: number,
    });
    return {
      number,
      users: (r.data.users ?? []).map((u: any) => u.login),
      teams: (r.data.teams ?? []).map((t: any) => t.slug ?? t.name),
    };
  },
});

export const requestReviewersTool = tool({
  description: "Request reviewers for a pull request (users and/or teams).",
  inputSchema: RequestReviewersSchema,
  async execute({ number, reviewers = [], team_reviewers = [] }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers", {
      owner, repo, pull_number: number, reviewers, team_reviewers,
    });
    return {
      number,
      users: (r.data.requested_reviewers ?? []).map((u: any) => u.login),
      teams: (r.data.requested_teams ?? []).map((t: any) => t.slug ?? t.name),
      status: "requested" as const,
    };
  },
});

export const removeRequestedReviewersTool = tool({
  description: "Remove requested reviewers from a pull request.",
  inputSchema: RemoveReviewersSchema,
  async execute({ number, reviewers = [], team_reviewers = [] }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    await client.request("DELETE /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers", {
      owner, repo, pull_number: number, reviewers, team_reviewers,
    });
    return { number, removed: { reviewers, team_reviewers }, status: "removed" as const };
  },
});

export const githubReviewRequestsTools = {
  getRequestedReviewersTool, requestReviewersTool, removeRequestedReviewersTool,
};
