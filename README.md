# llm-session-router

A session state coordinator for multi-tool AI workflows. Built for builders who move between Claude, Codex, and Perplexity within a single build session and need context to travel cleanly between them.

---

## The problem

AI-assisted builds rarely happen in one tool. A typical session might go: Claude (architecture) → Codex (implementation) → Perplexity (deployment) → Claude (debugging) → Codex (fix) → Claude (log). Each handoff requires you to decide what context to carry, how much to paste, and how to format it for the receiving tool. That selection cost compounds fast.

This tool eliminates the selection problem. You maintain one state object; it generates the right handoff block per tool on demand.

---

## How it works

The session router is a React artifact — a lightweight stateful UI that runs inside a Claude conversation. It has five tabs:

**State** — project name, current task, hard constraints, and a running list of decisions made this session. Fill this in at the start; update it as the session progresses.

**Handoff** — tool-specific task fields for Codex and Perplexity. Hit "Copy Codex handoff" or "Copy Perplexity handoff" — one formatted block lands on your clipboard, ready to paste. The block includes project context, constraints, all decisions, your specific task, and return instructions so the tool knows what to bring back.

**Inbound** — when you return from another tool, select which tool you're coming from and paste their output here. Logs the return and takes you back to state. Then paste the same content into the Claude chat so Claude can extract decisions and update state.

**Log** — running record of decisions made, handoffs generated, and inbound returns. Newest first.

**Import state** — paste an exported state block from a previous session to resume exactly where you left off.

The **Export state** button (top right) copies a structured state block to your clipboard. Save it at the end of every session. Paste it into the Import tab at the start of the next one.

---

## Usage

### Launching in a Claude chat

This repo is designed to be fetched and rendered on demand inside any Claude conversation.

Paste this into Claude:

```
Fetch https://raw.githubusercontent.com/indyrise/llm-session-router/main/session-router.jsx and render it as a React artifact.
```

Or set a trigger phrase in your Claude project instructions:

```
When I say "launch router", fetch https://raw.githubusercontent.com/indyrise/llm-session-router/main/session-router.jsx and render it as a React artifact.
```
### Saving a local copy

If you prefer to avoid the GitHub fetch on every launch, download `session-router.jsx` from this repo and save it locally. To render it in any Claude chat, paste the full file contents and say:

"Render this as a React artifact."

It will open in the right panel as an interactive artifact. This is the fastest launch method and works without a network dependency. Note that you'll need to manually re-download and re-paste if you want updates.

### Typical session flow

1. Open a Claude chat, launch the router
2. Fill in project name, current task, constraints on the State tab
3. Work with Claude in the chat as normal — log decisions as you make them
4. When ready to hand off to Codex: go to Handoff tab → fill in Codex task → copy block → paste into Codex
5. When Codex returns: go to Inbound tab → select Codex → paste output → log it → paste same output into Claude chat
6. Claude updates state, generates next handoff if needed
7. Repeat for any tool, in any order
8. At session end: Export state → save the block → use Import tab next session to resume

---

## Constraints and known limitations

- **Session-scoped** — the artifact holds state in React memory only. It does not persist automatically between chats or browser refreshes.
- **Export/import bridges sessions** — export at the end of every session, import at the start of the next one to resume state.
- **Claude is the hub** — this tool assumes Claude is the system of record. Decisions get extracted and logged when inbound content is pasted into the Claude chat, not automatically by the artifact.
- **You are still the transport layer** — handoff blocks are copied to clipboard; you paste them into the receiving tool. There is no automatic connection between tools.

---

## Part of Mnemo (a personal long-horizon project)

This project is a first implementation of the coordination layer being developed under Mnemo — a personal memory and context architecture for AI-assisted work. The session router handles within-session and cross-session state; Mnemo will eventually handle cross-project and long-term memory.

---

## Stack

- React (JSX, hooks)
- Runs as a Claude artifact — no build step, no deployment required
- No external dependencies

---

## Author

[Rucha Gokhale](https://www.linkedin.com/in/ruchagokhale) — AI product manager, builder, fractional GTM consultant.  
Writing at [Iron Matron](https://ironmatron.substack.com).
