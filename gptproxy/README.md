# GPTProxy

A lightweight wrapper over OpenAI's GPT-3 Codex Model.

## Development

`OPENAI_API_KEY` must be defined in the local environment.

```bash
# build the server
yarn build
# run the server (requires build)
yarn start
```

## Deployment

fly.io is used for hosting the server.

```bash
# deploy the server
flyctl deploy
```
