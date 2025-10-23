import { Octokit } from "@octokit/core";

export function octo() {
  if (!process.env.GITHUB_PAT) throw new Error("Missing GITHUB_PAT.");
  return new Octokit({
    auth: process.env.GITHUB_PAT,
    request: { fetch: fetch.bind(globalThis) },
  });
}