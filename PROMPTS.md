### Prompt:
```
    *Attached github-tools/issues/issues.ts

Create a tool for the following Github API endpoint:
    REST API endpoints for issue assignees
        List assignees
        Check if a user can be assigned
        Add assignees to an issue
        Remove assignees from an issue
        Check if a user can be assigned to a issue

Parse for API documentation: https://docs.github.com/en/rest/issues/assignees\
```
I used Cloudflare's documentation to create the issues, pulls, and branches tool. I then repeated the prompt above for each tool needed. I then, altered the descriptions of tools and schemas to improve results based on testing. Minor tweaks for each tool came after some testing, but the generated code seems to handle about 90% of cases well.