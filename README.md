# Infinity Elements Samples

This folder contains sample Infinity Elements built with React + TypeScript and compiled into web components using `@r2wc/react-to-web-component`. Each sample has its own Vite config for local development and build.

## What's in this folder

Each sample lives in its own directory under `examples/Samples/`. Notable ones include:

- `ai_assistant` (AI Assistant) – an AI-assisted document and chat helper for agents.
- `oauth`, `inter-element-demo`, `agent-status-auto`, etc. – additional platform demos. These were built by the Infinity team and all are excellent examples of different use cases.

### Key files beginners should know

| File/Folder | What it is |
|-------------|------------|
| `package.json` | The project's "command center" — lists all dependencies and defines scripts like `npm run dev:ai-assistant` and `npm run build:ai-assistant`. |
| `dist/` | **Build output folder** — when you run `npm run build:ai-assistant`, the compiled JavaScript files land here. There will be two files; the `.js` file is what you upload/publish to Infinity. |
| `node_modules/` | Where all the downloaded dependencies live (auto-created when you run `npm install`). |
| `vite.config.*.ts` | Each sample has its own Vite config file that controls how it builds and serves locally. |

### Build → Publish workflow

1. **Develop locally**: `npm run dev:ai-assistant` — test your changes with hot-reload.
2. **Build for production**: `npm run build:ai-assistant` — creates the optimized JS in `dist/`.
3. **Publish to Infinity**: Upload the files from `dist/` (specifically the `.js` file) to your Infinity instance.

> **Note**: When running locally with `npm run dev:...`, the Infinity API calls (like fetching agent info or sending chat messages) will fail or return mock data because the app isn't running inside the Infinity iframe. This is expected — use local dev for UI iteration, test inside Infinity for full functionality. 

## AI Assistant sample

**Location:** `examples/Samples/ai_assistant`

This AI Assistant helps agents draft and send messages, manage documents, and query an AI backend for suggestions.

### What the AI Assistant does

- **AI chat assistant**: Ask questions and get AI responses, with streaming output.
- **Send to customer chat**: Push AI or document text into the active customer chat.
- **Document library**: Upload and store documents locally for reference.
- **Document editor**: Create, rewrite, and save documents using AI assistance.
- **Copy helpers**: Copy AI responses or document content to clipboard.
- **Conversation history**: Save and reload past AI conversations.

### How the AI Assistant works (under the hood)

- **React + TypeScript** UI in `ai_assistant/Element.tsx`.
- **CSS Modules** styling in `ai_assistant/Element.module.css`.
- **Infinity Elements API** (`@avaya/infinity-elements-api`) for agent/customer data and chat sending.
- **Vite** for development and build.
- **`@r2wc/react-to-web-component`** to compile React into a web component.
- **AI backend**: posts prompts to the configured endpoint and streams back responses.
- **Storage**: Attempts to use IndexedDB for persistence, but falls back to `localStorage` due to iframe sandboxing issues. **Note**: Your uploaded documents persist only on your local machine.
- **PDF parsing**: Uses `pdfjs-dist` (PDF.js) to extract text from uploaded PDF files.

**Hard-coded company documents** are defined in `ai_assistant/Element.constants.ts` (`getCompanyDocuments()`). These are pre-loaded templates (Insurance Policy, Healthcare Benefits, Payment Policies, Altamino Bank, Altamino Healthcare, General Policies). **To customize**: Edit `Element.constants.ts` and modify the array returned by `getCompanyDocuments()` — add, remove, or update any company templates as needed.

Key flows:

1. **AI query** → builds context from customer/agent info → sends to the AI endpoint → streams response into chat UI.
2. **Send to chat** → uses `sendChatMessage` to push text into the active interaction. See [sendChatMessageOptions API docs](https://developers.avayacloud.com/avaya-infinity/docs/element-api#sendchatmessageoptions).
3. **Document actions** → uploads are parsed, stored in local state, and can be sent to chat as text or copied.
4. **@ mentions in chat** → Type `@` in the chat input to reference any saved document (company or uploaded). The AI will include that document's content in its context.
5. **Document editor with AI** → In the document editor, AI can access user/customer info from the Infinity API to help draft or update documents with relevant context.

## Getting started

### Prerequisites

- **Node.js 18+** installed
- Basic terminal/command prompt access

### Install dependencies

From the `examples/Samples` folder:

```bash
npm install
```

### Run the AI Assistant sample locally

```bash
npm run dev:ai-assistant
```

Then open your browser and navigate to **http://localhost:5173**

This starts Vite with the AI Assistant-specific config.

### Build the AI Assistant sample

```bash
npm run build:ai-assistant
```

### Running other samples

Every sample has a matching script in `package.json`. Example:

```bash
npm run dev:oauth
npm run dev:inter-element-demo
```

## Project structure (AI Assistant)

```
ai_assistant/
├── Element.tsx          # React UI + logic
├── Element.module.css   # Styles
├── index.ts             # Web component wrapper
├── index.html           # Vite entry
├── config.ts            # AI backend URL (gitignored, create from config.example.ts)
└── config.example.ts    # Template for config.ts
```

### AI Backend Configuration (Security)

The AI Assistant requires a backend endpoint for AI queries. For security, this URL is stored in a gitignored config file:

1. **Copy the template:**
   ```bash
   cd ai_assistant
   cp config.example.ts config.ts
   ```

2. **Edit `config.ts`** and add your AI backend URL:
   ```typescript
   export const AI_BACKEND_URL = "https://your-ai-endpoint-here";
   ```

> **Note:** `config.ts` is gitignored and will not be committed. If you need the backend endpoint URL, reach out to the **showme Avaya team**.

## Important things to know from the Infinity Elements docs

- **Elements run in sandboxed iframes** inside Infinity. This means:
  - Direct file downloads are typically blocked (use clipboard copy instead).
  - Programmatic clipboard access may be restricted; we use `execCommand("copy")` as a fallback.
  - Some browser APIs like `navigator.clipboard` may be unavailable.
- **Attachments**: File attachments may be blocked by platform policies. Text send/copy is the reliable fallback.
- **API reference**: For details on `sendChatMessage`, `sendRichMediaMessage`, and other APIs, see the [Avaya Developer Documentation](https://developers.avayacloud.com/avaya-infinity/docs/element-api#sendchatmessageoptions).

## GOTCHA: Deploying to Infinity

When injecting this element into Infinity, ensure the `elementId` configured in the Infinity admin UI **exactly matches** the custom element's tag name:

```javascript
elementId: "ai-assistant"  // Must match the tag name used in the element
```

If these don't match, the element won't load properly.

## Local dev notes

- Local development runs as a normal Vite app — you can iterate quickly without publishing.
- Changes to files in `ai_assistant/` are hot-reloaded during `npm run dev:ai-assistant`.

## Questions?

If you have additional questions or need further assistance, please reach out to the **showme Avaya team**.

