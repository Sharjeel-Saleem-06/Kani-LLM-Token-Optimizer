# AI Voice Agent Platform

Next.js + TypeScript app for designing, simulating, and optimizing AI voice agents. It uses **Kani-style memory** to minimize token usage and only calls the LLM when rule-based transitions cannot handle the conversation.

## Highlights
- **Visual configuration**: Define states, transitions, disqualification rules, and knowledge base entries.
- **Prompt automation**: Generate system prompts directly from structured business inputs.
- **Cost-aware chat simulator**: Shows token usage, cost estimates, and transition counts in real time.
- **LLM only when needed**: Pattern/transition rules first; LLM is a controlled fallback.
- **Sample config included**: Load a ready-made flow to explore quickly.

## What is Kani Memory & Why It Helps
- **State-first memory**: Keeps a compact state machine plus contextual facts instead of replaying full chat history.
- **Selective LLM usage**: Attempts deterministic rules; if nothing matches, it calls the LLM with minimal context.
- **Token + cost savings**: Tracks input/output tokens and estimates spend so you can see the optimization benefit.
- **Predictable guardrails**: Disqualification rules and explicit transitions avoid runaway dialogues.

## How It Works (Lifecycle)
1. User configures business details, states, transitions, and rules.
2. The app generates a system prompt from that config.
3. During chat, the memory engine:
   - Checks knowledge base responses.
   - Applies disqualification rules.
   - Evaluates transitions for deterministic paths.
   - Falls back to OpenAI only if no rule matches.
4. Token usage and cost estimates update continuously.

## Prerequisites
- Node.js 18+
- npm
- OpenAI API key (set as `NEXT_PUBLIC_OPENAI_API_KEY`)

## Quick Start
1) Install dependencies  
`npm install`

2) Add your key in `.env.local` (not committed):  
`NEXT_PUBLIC_OPENAI_API_KEY=your-openai-key`

3) Run the app  
`npm run dev` and open http://localhost:3000

## Scripts
- `npm run dev` – start Next.js in dev mode
- `npm run build` – production build
- `npm run start` – run the production build
- `npm test` – run Jest tests

## Project Structure
```
src/
  components/      UI + Main page flow
  config/          OpenAI config + sample business config
  models/          Types
  pages/           Next.js pages
  services/        Kani + prompt generation
  utils/           Shared utilities
```

## Configuration Notes
- API key comes from `NEXT_PUBLIC_OPENAI_API_KEY` (client-visible). For production, route LLM calls through a secure backend to avoid exposing secrets.
- Sample business config lives in `src/config/sampleBusinessConfig.ts`.

## Testing & Quality
- Unit tests: `npm test` (Jest + Testing Library).
- Linting: `npm run lint` (Next.js ESLint config).

## Deployment Tips
- Build: `npm run build`
- Start: `npm run start`
- Ensure `NEXT_PUBLIC_OPENAI_API_KEY` is provided in your host environment or served securely via backend proxy.

## Ignore These in Git
- `.env.local` for your OpenAI key
- `.next/` build output
- `node_modules/`
- `coverage/`, logs, OS/editor files (already covered in `.gitignore`)

## Contact
- Portfolio: https://muhammad-sharjeel-portfolio.netlify.app/
- Email: sharry00010@gmail.com

For more detailed information, check the docs folder:

- [FAQ](docs/FAQ.md)
- [Token Optimization](docs/token-optimization-techniques.md)
- [Creating Business Configs](docs/creating-business-config.md)
- [Extending the Platform](docs/extending-the-platform.md)
- [Kani Memory Management](docs/kani-memory-optimization.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the API that powers the AI capabilities
- Kani for memory optimization techniques
- Tailwind CSS for the UI components 