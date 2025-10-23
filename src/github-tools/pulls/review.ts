import { tool } from "ai";
import { octo } from "../util";
import { z } from "zod";

//https://docs.github.com/en/rest/pulls/reviews
const PullNumberSchema = z.object({ number: z.number().int().positive() });

const CreateReviewSchema = z.object({
  number: z.number().int().positive(),
  body: z.string().optional(),
  event: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]).optional(),
  comments: z.array(z.object({
    path: z.string().min(1),
    position: z.number().int().positive().optional(), // deprecated but still supported
    line: z.number().int().positive().optional(),
    side: z.enum(["LEFT", "RIGHT"]).optional(),
    start_line: z.number().int().positive().optional(),
    start_side: z.enum(["LEFT", "RIGHT"]).optional(),
    body: z.string().min(1),
  })).optional(),
});

const GetReviewSchema = z.object({
  number: z.number().int().positive(),
  review_id: z.number().int().positive(),
});

const UpdateReviewSchema = z.object({
  number: z.number().int().positive(),
  review_id: z.number().int().positive(),
  body: z.string().min(1),
});

const DeletePendingReviewSchema = z.object({
  number: z.number().int().positive(),
  review_id: z.number().int().positive(),
});

const ListReviewCommentsForReviewSchema = z.object({
  number: z.number().int().positive(),
  review_id: z.number().int().positive(),
  limit: z.number().int().positive().max(100).optional().default(50),
});

const DismissReviewSchema = z.object({
  number: z.number().int().positive(),
  review_id: z.number().int().positive(),
  message: z.string().min(1),
});

const SubmitReviewSchema = z.object({
  number: z.number().int().positive(),
  review_id: z.number().int().positive(),
  body: z.string().optional(),
  event: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]),
});

export const listPullReviewsTool = tool({
  description: "List reviews for a pull request.",
  inputSchema: PullNumberSchema,
  async execute({ number }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews", {
      owner, repo, pull_number: number,
    });
    const items = (r.data as any[]).map((rv) => ({
      id: rv.id, user: rv.user?.login, state: rv.state, submitted_at: rv.submitted_at, body: rv.body ?? "",
    }));
    return { number, items };
  },
});

export const createPullReviewTool = tool({
  description: "Create a review for a pull request.",
  inputSchema: CreateReviewSchema,
  async execute({ number, body, event, comments }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews", {
      owner, repo, pull_number: number, body, event, comments,
    });
    return { number, review_id: (r.data as any).id, status: "created" as const };
  },
});

export const getPullReviewTool = tool({
  description: "Get a review for a pull request.",
  inputSchema: GetReviewSchema,
  async execute({ number, review_id }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}", {
      owner, repo, pull_number: number, review_id,
    });
    const rv = r.data as any;
    return { id: rv.id, user: rv.user?.login, state: rv.state, submitted_at: rv.submitted_at, body: rv.body ?? "" };
  },
});

export const updatePullReviewTool = tool({
  description: "Update a review for a pull request (body).",
  inputSchema: UpdateReviewSchema,
  async execute({ number, review_id, body }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}", {
      owner, repo, pull_number: number, review_id, body,
    });
    return { id: (r.data as any).id ?? review_id, status: "updated" as const };
  },
});

export const deletePendingPullReviewTool = tool({
  description: "Delete a pending review for a pull request.",
  inputSchema: DeletePendingReviewSchema,
  async execute({ number, review_id }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    await client.request("DELETE /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}", {
      owner, repo, pull_number: number, review_id,
    });
    return { id: review_id, status: "deleted" as const };
  },
});

export const listCommentsForPullReviewTool = tool({
  description: "List comments for a pull request review.",
  inputSchema: ListReviewCommentsForReviewSchema,
  async execute({ number, review_id, limit }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments", {
      owner, repo, pull_number: number, review_id, per_page: limit,
    });
    const items = (r.data as any[]).map((c) => ({
      id: c.id, user: c.user?.login, path: c.path, body: c.body, url: c.html_url,
    }));
    return { number, review_id, items };
  },
});

export const dismissPullReviewTool = tool({
  description: "Dismiss a review for a pull request.",
  inputSchema: DismissReviewSchema,
  async execute({ number, review_id, message }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals", {
      owner, repo, pull_number: number, review_id, message,
    });
    return { id: review_id, state: (r.data as any).state, status: "dismissed" as const };
  },
});

export const submitPullReviewTool = tool({
  description: "Submit a review for a pull request (APPROVE, REQUEST_CHANGES, COMMENT).",
  inputSchema: SubmitReviewSchema,
  async execute({ number, review_id, body, event }) {
    const client = octo(); const owner = process.env.OWNER!; const repo = process.env.REPO!;
    const r = await client.request("POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events", {
      owner, repo, pull_number: number, review_id, body, event,
    });
    return { id: review_id, state: (r.data as any).state, status: "submitted" as const };
  },
});

export const githubPullReviewsTools = {
  listPullReviewsTool, createPullReviewTool, getPullReviewTool, updatePullReviewTool,
  deletePendingPullReviewTool, listCommentsForPullReviewTool,
  dismissPullReviewTool, submitPullReviewTool,
};
