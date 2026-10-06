# BASIS assistant (MCP)

An MCP server that lets an AI assistant read the BASIS platform and run its
commands on the owner's behalf. It talks only to the platform's `/api`;
every role check runs there, with the role the token was issued with.

1. In the platform, Settings › Connectors › Assistant: issue a token. It is shown once.
2. Build: `pnpm --filter @basis/assistant build`.
3. Register the server with the assistant (Claude Desktop, Claude Code, any MCP client):

```json
{
  "mcpServers": {
    "basis": {
      "command": "node",
      "args": ["/path/to/BASIS INC/apps/assistant/dist/index.js"],
      "env": { "BASIS_API_URL": "https://basis-inc-hq.web.app/api", "BASIS_API_TOKEN": "bsk_..." }
    }
  }
}
```

Tools: `basis_attention`, `basis_ledger`, `basis_document`, `basis_command`.
Against the emulators use `BASIS_API_URL=http://127.0.0.1:5001/basis-inc/europe-west1/api`.
