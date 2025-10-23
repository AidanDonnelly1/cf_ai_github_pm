# 🤖 Agentic Github Project Manager

### [`Youtube Video :)`](https://www.youtube.com)

This agent is built on top of Cloudflare's starter template for building AI-powered chat [`agents`](https://www.npmjs.com/package/agents). This projects servers as a proof of concept for an agentic project manger. Particularly useful for solo or small group developers who may not have the need for a dedicated project manager.

## New Features
- Around 50 new tools specifically for interacting with GitHub Issues, Pull Requests, and Branches


## Features From The Template
- 💬 Interactive chat interface with AI
- 🛠️ Built-in tool system with human-in-the-loop confirmation
- 📅 Advanced task scheduling (From Starter )
- 🌓 Dark/Light theme support
- ⚡️ Real-time streaming responses
- 🔄 State management and chat history
- 🎨 Modern, responsive UI


## Prerequisites

- Cloudflare account
- OpenAI API key
- A GitHub Repository you want managed
- GitHub PAT w/r+w perms for issues and pull requests in your chosen repository

## Quick Start

1. Clone this repository

```bash
gh repo clone AidanDonnelly1/cf_ai_github_pm
```

2. Install dependencies:

```bash
npm install
```

3. Set up your environment:

Create a `.dev.vars` file:

```env
OPENAI_API_KEY=sk-proj-...
GITHUB_PAT=github_pat_...
OWNER=USERNAME
REPO=REPO_NAME
```

4. Run locally:

```bash
npm start
```


## Project Structure

```
├── src/
│   ├── app.tsx        # Chat UI 
    ├── github-tools/          
*new    ├── issues/    
*new    ├── pulls/

implementation
│   ├── server.ts      # Chat agent logic
│   ├── tools.ts       # Tool definitions
│   ├── utils.ts       # Helper functions
│   └── styles.css     # UI styling
```

## Learn More

- [`agents`](https://github.com/cloudflare/agents/blob/main/packages/agents/README.md)
- [Cloudflare Agents Documentation](https://developers.cloudflare.com/agents/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

## License

MIT
