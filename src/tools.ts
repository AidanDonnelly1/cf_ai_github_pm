/**
 * Tool definitions for the AI chat agent
 * Tools can either require human confirmation or execute automatically
 */
import { tool, type ToolSet } from "ai";
import { z } from "zod/v3";

import type { Chat } from "./server";
import { getCurrentAgent } from "agents";
import { scheduleSchema } from "agents/schedule";
import { githubIssueTools } from "./github-tools/issues/issues";
import { githubIssueAssigneesTools } from "./github-tools/issues/assignees";
import { githubIssueCommentsTools } from "./github-tools/issues/comments";
import { githubIssueLabelsTools } from "./github-tools/issues/labels";
import { githubMilestonesTools } from "./github-tools/issues/milestones";
import { githubPullsTools } from "./github-tools/pulls/pulls";
import { githubPullReviewCommentsTools } from "./github-tools/pulls/review-comments";
import { githubReviewRequestsTools } from "./github-tools/pulls/review-requests";
import { githubPullReviewsTools } from "./github-tools/pulls/review";
import { githubBranchesTools } from "./github-tools/pulls/branches";

const scheduleTask = tool({
  description: "A tool to schedule a task to be executed at a later time",
  inputSchema: scheduleSchema,
  execute: async ({ when, description }) => {
    // we can now read the agent context from the ALS store
    const { agent } = getCurrentAgent<Chat>();

    function throwError(msg: string): string {
      throw new Error(msg);
    }
    if (when.type === "no-schedule") {
      return "Not a valid schedule input";
    }
    const input =
      when.type === "scheduled"
        ? when.date // scheduled
        : when.type === "delayed"
          ? when.delayInSeconds // delayed
          : when.type === "cron"
            ? when.cron // cron
            : throwError("not a valid schedule input");
    try {
      agent!.schedule(input!, "executeTask", description);
    } catch (error) {
      console.error("error scheduling task", error);
      return `Error scheduling task: ${error}`;
    }
    return `Task scheduled for type "${when.type}" : ${input}`;
  }
});

/**
 * Tool to list all scheduled tasks
 * This executes automatically without requiring human confirmation
 */
const getScheduledTasks = tool({
  description: "List all tasks that have been scheduled",
  inputSchema: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();

    try {
      const tasks = agent!.getSchedules();
      if (!tasks || tasks.length === 0) {
        return "No scheduled tasks found.";
      }
      return tasks;
    } catch (error) {
      console.error("Error listing scheduled tasks", error);
      return `Error listing scheduled tasks: ${error}`;
    }
  }
});

/**
 * Tool to cancel a scheduled task by its ID
 * This executes automatically without requiring human confirmation
 */
const cancelScheduledTask = tool({
  description: "Cancel a scheduled task using its ID",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to cancel")
  }),
  execute: async ({ taskId }) => {
    const { agent } = getCurrentAgent<Chat>();
    try {
      await agent!.cancelSchedule(taskId);
      return `Task ${taskId} has been successfully canceled.`;
    } catch (error) {
      console.error("Error canceling scheduled task", error);
      return `Error canceling task ${taskId}: ${error}`;
    }
  }
});

/**
 * Export all available tools
 * These will be provided to the AI model to describe available capabilities
 */
export const tools = {
  ...githubIssueTools,
  ...githubIssueAssigneesTools,
  ...githubIssueCommentsTools,
  ...githubIssueLabelsTools,
  ...githubMilestonesTools,
  ...githubPullsTools,
  ...githubPullReviewCommentsTools,
  ...githubReviewRequestsTools,
  ...githubPullReviewsTools,
  ...githubBranchesTools,
  scheduleTask,
  getScheduledTasks,
  cancelScheduledTask
} satisfies ToolSet;
