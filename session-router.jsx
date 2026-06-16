import { useState } from "react";

const TOOLS = ["Codex", "Perplexity"];

const TOOL_TEMPLATES = {
  Codex: (state) => `## Codex handoff — ${state.project || "untitled project"}

### Context
${state.currentTask || "—"}

### Hard constraints (do not work around these)
${state.constraints || "—"}

### Decisions already made (do not relitigate)
${state.decisions.length ? state.decisions.map((d, i) => `${i + 1}. ${d}`).join("\n") : "None yet"}

### Your task
${state.codexTask || "See current task above"}

### Do not touch
${state.doNotChange || "Nothing locked yet"}

### Return to Claude with
- What you implemented
- Any errors or unexpected behaviour
- Any decisions you had to make that weren't covered above`,

  Perplexity: (state) => `## Perplexity handoff — ${state.project || "untitled project"}

### Context
${state.currentTask || "—"}

### Constraints and environment
${state.constraints || "—"}

### Decisions already made (do not relitigate)
${state.decisions.length ? state.decisions.map((d, i) => `${i + 1}. ${d}`).join("\n") : "None yet"}

### Your task
${state.perplexityTask || "See current task above"}

### Return to Claude with
- Step-by-step output or findings
- Any blockers or ambiguities
- Exact commands or config used`,
};

const EXPORT_MARKER = "## LLM Session Router — state export";

const parseImport = (text) => {
  const get = (label) => {
    const re = new RegExp(`## ${label}\\n([\\s\\S]*?)(?=\\n## |$)`);
    const m = text.match(re);
    return m ? m[1].trim() : "";
  };
  const decisionsRaw = get("Decisions");
  const decisions = decisionsRaw
    ? decisionsRaw.split("\n").map((l) => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean)
    : [];
  return {
    project: get("Project"),
    currentTask: get("Current task"),
    constraints: get("Constraints"),
    codexTask: get("Codex task"),
    perplexityTask: get("Perplexity task"),
    doNotChange: get("Do not change"),
    decisions,
    log: [{ type: "inbound", text: "State imported from previous session", ts: new Date().toLocaleTimeString() }],
  };
};

const sectionStyle = {
  background: "var(--color-background-primary)",
  border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: "var(--border-radius-lg)",
  padding: "1rem 1.25rem",
  marginBottom: "12px",
};

const labelStyle = {
  fontSize: "12px",
  color: "var(--color-text-secondary)",
  marginBottom: "4px",
  display: "block",
};

const inputStyle = {
  width: "100%",
  fontSize: "13px",
  padding: "6px 8px",
  borderRadius: "var(--border-radius-md)",
  border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-secondary)",
  color: "var(--color-text-primary)",
  boxSizing: "border-box",
  resize: "vertical",
};

const badgeStyle = (color) => ({
  display: "inline-block",
  fontSize: "11px",
  padding: "2px 8px",
  borderRadius: "var(--border-radius-md)",
  background: `var(--color-background-${color})`,
  color: `var(--color-text-${color})`,
  marginRight: "6px",
  whiteSpace: "nowrap",
});

const EMPTY_STATE = {
  project: "",
  currentTask: "",
  constraints: "",
  codexTask: "",
  perplexityTask: "",
  doNotChange: "",
  decisions: [],
  log: [],
};

export default function SessionRouter() {
  const [state, setState] = useState(EMPTY_STATE);
  const [newDecision, setNewDecision] = useState("");
  const [inbound, setInbound] = useState("");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [activeTool, setActiveTool] = useState(null);
  const [copied, setCopied] = useState(null);
  const [activeTab, setActiveTab] = useState("state");

  const update = (field, value) => setState((s) => ({ ...s, [field]: value }));

  const addDecision = () => {
    if (!newDecision.trim()) return;
    const ts = new Date().toLocaleTimeString();
    setState((s) => ({
      ...s,
      decisions: [...s.decisions, newDecision.trim()],
      log: [...s.log, { type: "decision", text: newDecision.trim(), ts }],
    }));
    setNewDecision("");
  };

  const removeDecision = (i) =>
    setState((s) => ({ ...s, decisions: s.decisions.filter((_, idx) => idx !== i) }));

  const parseInbound = () => {
    if (!inbound.trim()) return;
    const ts = new Date().toLocaleTimeString();
    setState((s) => ({
      ...s,
      log: [
        ...s.log,
        {
          type: "inbound",
          text: `From ${activeTool || "unknown"}: ${inbound.slice(0, 120)}${inbound.length > 120 ? "…" : ""}`,
          ts,
        },
      ],
    }));
    setInbound("");
    setActiveTool(null);
    setActiveTab("state");
  };

  const handleImport = () => {
    if (!importText.includes(EXPORT_MARKER)) {
      setImportError("Doesn't look like a valid export. Paste the full exported state block.");
      return;
    }
    try {
      const parsed = parseImport(importText);
      setState(parsed);
      setImportText("");
      setImportError("");
      setActiveTab("state");
    } catch {
      setImportError("Failed to parse. Make sure you pasted the full unmodified export block.");
    }
  };

  const copyHandoff = (tool) => {
    const text = TOOL_TEMPLATES[tool](state);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(tool);
      const ts = new Date().toLocaleTimeString();
      setState((s) => ({
        ...s,
        log: [...s.log, { type: "handoff", text: `Handoff generated → ${tool}`, ts }],
      }));
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const exportState = () => {
    const text = `${EXPORT_MARKER}
Exported: ${new Date().toLocaleString()}

## Project
${state.project}

## Current task
${state.currentTask}

## Constraints
${state.constraints}

## Decisions
${state.decisions.map((d, i) => `${i + 1}. ${d}`).join("\n")}

## Codex task
${state.codexTask}

## Perplexity task
${state.perplexityTask}

## Do not change
${state.doNotChange}

## Session log
${state.log.map((e) => `[${e.ts}] ${e.type.toUpperCase()}: ${e.text}`).join("\n")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied("export");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const tabStyle = (active) => ({
    fontSize: "13px",
    padding: "6px 14px",
    borderRadius: "var(--border-radius-md)",
    border: active ? "0.5px solid var(--color-border-primary)" : "0.5px solid transparent",
    background: active ? "var(--color-background-primary)" : "transparent",
    color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
    cursor: "pointer",
  });

  const hintStyle = {
    fontSize: "11px",
    color: "var(--color-text-secondary)",
    marginTop: "6px",
    lineHeight: 1.5,
  };

  return (
    <div style={{ padding: "1rem 0", fontFamily: "var(--font-sans)" }}>
      <h2 className="sr-only">LLM session router — multi-tool workflow coordinator</h2>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "15px", fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>
            {state.project || "LLM session router"}
          </p>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>Claude · Codex · Perplexity</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setActiveTab("import")} style={{ fontSize: "12px", padding: "6px 12px" }}>
            Import state
          </button>
          <button onClick={exportState} style={{ fontSize: "12px", padding: "6px 12px" }}>
            {copied === "export" ? "Copied ✓" : "Export state ↗"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", background: "var(--color-background-secondary)", padding: "4px", borderRadius: "var(--border-radius-md)" }}>
        {["state", "handoff", "inbound", "log"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(activeTab === tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "state" && (
        <div>
          <div style={sectionStyle}>
            <span style={labelStyle}>Project name</span>
            <input
              style={{ ...inputStyle, marginBottom: "12px" }}
              value={state.project}
              onChange={(e) => update("project", e.target.value)}
              placeholder="e.g. AI Classifier rewrite"
            />
            <span style={labelStyle}>Current task</span>
            <textarea
              rows={2}
              style={{ ...inputStyle, marginBottom: "12px" }}
              value={state.currentTask}
              onChange={(e) => update("currentTask", e.target.value)}
              placeholder="What are we doing right now?"
            />
            <span style={labelStyle}>Hard constraints</span>
            <textarea
              rows={3}
              style={inputStyle}
              value={state.constraints}
              onChange={(e) => update("constraints", e.target.value)}
              placeholder="Platform limits, decisions already locked, things that cannot change"
            />
          </div>

          <div style={sectionStyle}>
            <span style={{ ...labelStyle, marginBottom: "8px" }}>Decisions made this session</span>
            {state.decisions.length === 0 && (
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "0 0 8px" }}>None yet.</p>
            )}
            {state.decisions.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", paddingTop: "2px", minWidth: "16px" }}>{i + 1}.</span>
                <span style={{ fontSize: "13px", flex: 1, color: "var(--color-text-primary)" }}>{d}</span>
                <button onClick={() => removeDecision(i)} style={{ fontSize: "11px", padding: "2px 6px", color: "var(--color-text-secondary)" }}>✕</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={newDecision}
                onChange={(e) => setNewDecision(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDecision()}
                placeholder="Log a decision (press Enter)"
              />
              <button onClick={addDecision} style={{ fontSize: "12px", padding: "6px 12px" }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "handoff" && (
        <div>
          <div style={sectionStyle}>
            <p style={{ fontSize: "13px", fontWeight: 500, margin: "0 0 12px", color: "var(--color-text-primary)" }}>Codex</p>
            <span style={labelStyle}>Task for Codex</span>
            <textarea
              rows={3}
              style={{ ...inputStyle, marginBottom: "12px" }}
              value={state.codexTask}
              onChange={(e) => update("codexTask", e.target.value)}
              placeholder="What specifically should Codex implement? Be precise — file names, function names, expected output."
            />
            <span style={labelStyle}>Do not touch</span>
            <textarea
              rows={2}
              style={inputStyle}
              value={state.doNotChange}
              onChange={(e) => update("doNotChange", e.target.value)}
              placeholder="Files, patterns, or decisions Codex must not change"
            />
            <p style={hintStyle}>Handoff block will include: project, current task, constraints, all decisions, your task, do not touch, and return instructions.</p>
            <button onClick={() => copyHandoff("Codex")} style={{ width: "100%", padding: "8px", fontSize: "13px", marginTop: "10px" }}>
              {copied === "Codex" ? "Codex block copied ✓" : "Copy Codex handoff ↗"}
            </button>
          </div>

          <div style={sectionStyle}>
            <p style={{ fontSize: "13px", fontWeight: 500, margin: "0 0 12px", color: "var(--color-text-primary)" }}>Perplexity</p>
            <span style={labelStyle}>Task for Perplexity</span>
            <textarea
              rows={3}
              style={inputStyle}
              value={state.perplexityTask}
              onChange={(e) => update("perplexityTask", e.target.value)}
              placeholder="What do you need Perplexity to research, verify, or deploy? Include the environment context."
            />
            <p style={hintStyle}>Handoff block will include: project, current task, constraints, all decisions, your task, and return instructions.</p>
            <button onClick={() => copyHandoff("Perplexity")} style={{ width: "100%", padding: "8px", fontSize: "13px", marginTop: "10px" }}>
              {copied === "Perplexity" ? "Perplexity block copied ✓" : "Copy Perplexity handoff ↗"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "inbound" && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Returning from</span>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            {TOOLS.map((tool) => (
              <button
                key={tool}
                onClick={() => setActiveTool(activeTool === tool ? null : tool)}
                style={{
                  fontSize: "12px",
                  padding: "4px 12px",
                  border: activeTool === tool ? "0.5px solid var(--color-border-primary)" : "0.5px solid var(--color-border-tertiary)",
                  background: activeTool === tool ? "var(--color-background-secondary)" : "transparent",
                }}
              >
                {tool}
              </button>
            ))}
          </div>
          <span style={labelStyle}>Paste output, errors, or transcript</span>
          <textarea
            rows={7}
            style={{ ...inputStyle, marginBottom: "4px" }}
            value={inbound}
            onChange={(e) => setInbound(e.target.value)}
            placeholder="Paste whatever came back — output, error, transcript, anything. Claude will extract what matters when you return to chat."
          />
          <p style={hintStyle}>After logging, go back to the chat window and paste the inbound content there too so Claude can update decisions and state.</p>
          <button onClick={parseInbound} style={{ width: "100%", padding: "8px", fontSize: "13px", marginTop: "10px" }}>
            Log inbound + return to state
          </button>
        </div>
      )}

      {activeTab === "log" && (
        <div style={sectionStyle}>
          {state.log.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>Nothing logged yet.</p>
          ) : (
            [...state.log].reverse().map((entry, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "flex-start" }}>
                <span style={badgeStyle(entry.type === "decision" ? "success" : entry.type === "handoff" ? "info" : "warning")}>
                  {entry.type}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "13px", margin: 0, color: "var(--color-text-primary)" }}>{entry.text}</p>
                  <p style={{ fontSize: "11px", color: "var(--color-text-secondary)", margin: 0 }}>{entry.ts}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "import" && (
        <div style={sectionStyle}>
          <p style={{ fontSize: "13px", fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>Resume from a previous session</p>
          <p style={hintStyle}>Paste the full exported state block from your last session. All fields will be restored exactly as you left them.</p>
          <textarea
            rows={10}
            style={{ ...inputStyle, margin: "12px 0" }}
            value={importText}
            onChange={(e) => { setImportText(e.target.value); setImportError(""); }}
            placeholder={`Paste your exported state here.\nIt should start with:\n${EXPORT_MARKER}`}
          />
          {importError && (
            <p style={{ fontSize: "12px", color: "var(--color-text-danger)", margin: "0 0 10px" }}>{importError}</p>
          )}
          <button onClick={handleImport} style={{ width: "100%", padding: "8px", fontSize: "13px" }}>
            Import and restore state
          </button>
        </div>
      )}
    </div>
  );
}
