import { useEffect, useState } from "react";

const API = "http://localhost:3001";

const StatusPill = ({ status }) => {
  const colors = {
    "QA Check": "#f59e0b",
    Submitted: "#3b82f6",
    Grading: "#8b5cf6",
    Completed: "#10b981",
    "Research & ID": "#ec4899"
  };

  return (
    <span
      style={{
        background: colors[status] || "#6b7280",
        color: "white",
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        display: "inline-block",
        letterSpacing: "0.3px"
      }}
    >
      {status}
    </span>
  );
};

const StatCard = ({ label, value, color = "#EA5F5C" }) => (
  <div
    style={{
      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      borderRadius: 12,
      padding: "20px 24px",
      border: "1px solid #334155",
      flex: 1,
      minWidth: 200
    }}
  >
    <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 8, fontWeight: 500 }}>
      {label}
    </div>
    <div style={{ fontSize: 32, fontWeight: 700, color: color }}>
      {value}
    </div>
  </div>
);

const Toast = ({ message, type = "info" }) => {
  if (!message) return null;
  
  const colors = {
    info: "#3b82f6",
    success: "#10b981",
    error: "#ef4444"
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        background: colors[type],
        color: "white",
        padding: "12px 20px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
        zIndex: 1000,
        animation: "slideIn 0.3s ease"
      }}
    >
      {message}
    </div>
  );
};

export default function App() {
  const [subs, setSubs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [cards, setCards] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [submissionInput, setSubmissionInput] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info");
  const [psaConnected, setPsaConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    totalCards: 0
  });

  async function loadSubs() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/submissions`);
      const data = await r.json();
      setSubs(data);
      
      // Calculate stats
      const total = data.length;
      const completed = data.filter(s => s.current_status === "Completed").length;
      const inProgress = total - completed;
      const totalCards = data.reduce((sum, s) => sum + (s.card_count || 0), 0);
      
      setStats({ total, inProgress, completed, totalCards });
    } catch (err) {
      showMessage("Failed to load submissions", "error");
    }
    setLoading(false);
  }

  async function openSub(psa) {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/submissions/${psa}`);
      const d = await r.json();
      setSelected(d.submission);
      setCards(d.cards || []);
    } catch (err) {
      showMessage("Failed to load submission details", "error");
    }
    setLoading(false);
  }

  function showMessage(text, type = "info") {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(""), 3000);
  }

  async function connectPSA() {
    if (!apiKey.trim()) {
      showMessage("Please enter PSA API key", "error");
      return;
    }

    setLoading(true);
    showMessage("Connecting to PSA...", "info");
    
    try {
      const r = await fetch(`${API}/api/psa/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey })
      });

      if (r.ok) {
        setPsaConnected(true);
        showMessage("PSA connected successfully!", "success");
      } else {
        const d = await r.json();
        showMessage(d.error || "Failed to connect PSA", "error");
      }
    } catch (err) {
      showMessage("Connection error", "error");
    }
    setLoading(false);
  }

  async function syncSubmission() {
    if (!submissionInput.trim()) {
      showMessage("Please enter submission number", "error");
      return;
    }

    setLoading(true);
    showMessage("Syncing from PSA...", "info");
    
    try {
      const r = await fetch(`${API}/api/psa/sync/submission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionNumber: submissionInput })
      });
      const d = await r.json();
      
      if (d.ok) {
        showMessage("Sync complete!", "success");
        setSubmissionInput("");
        loadSubs();
      } else {
        showMessage(d.error || "Sync failed", "error");
      }
    } catch (err) {
      showMessage("Sync error", "error");
    }
    setLoading(false);
  }

  async function refreshAll() {
    setLoading(true);
    showMessage("Refreshing all submissions...", "info");
    
    try {
      const r = await fetch(`${API}/api/submissions/refresh-all`, {
        method: "POST"
      });
      
      if (r.ok) {
        showMessage("All submissions refreshed!", "success");
        loadSubs();
      } else {
        showMessage("Refresh failed", "error");
      }
    } catch (err) {
      showMessage("Refresh error", "error");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSubs();
  }, []);

  return (
    <div
      style={{
        background: "#0f172a",
        minHeight: "100vh",
        color: "#e5e7eb",
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif"
      }}
    >
      <Toast message={msg} type={msgType} />

      {/* Header */}
      <header
        style={{
          padding: "16px 32px",
          background: "linear-gradient(90deg, #020617 0%, #0f172a 100%)",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Logo */}
          <div
            style={{
              width: 36,
              height: 36,
              background: "#EA5F5C",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              color: "white"
            }}
          >
            SD
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" }}>
              SlabDash
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              PSA Grading Management
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={refreshAll}
            disabled={loading}
            style={{
              padding: "10px 20px",
              background: "#334155",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: 14,
              opacity: loading ? 0.5 : 1,
              transition: "all 0.2s"
            }}
            onMouseOver={e => !loading && (e.target.style.background = "#475569")}
            onMouseOut={e => e.target.style.background = "#334155"}
          >
            {loading ? "Loading..." : "🔄 Refresh All"}
          </button>
        </div>
      </header>

      {/* Stats Dashboard */}
      <div style={{ padding: "24px 32px" }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard label="Total Submissions" value={stats.total} color="#EA5F5C" />
          <StatCard label="In Progress" value={stats.inProgress} color="#3b82f6" />
          <StatCard label="Completed" value={stats.completed} color="#10b981" />
          <StatCard label="Total Cards" value={stats.totalCards} color="#8b5cf6" />
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", minHeight: "calc(100vh - 200px)" }}>
        {/* Sidebar */}
        <aside
          style={{
            borderRight: "1px solid #1e293b",
            padding: 24,
            background: "#020617"
          }}
        >
          {/* PSA Connection */}
          <div
            style={{
              background: "#0f172a",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              border: "1px solid #1e293b"
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#94a3b8" }}>
              PSA API Connection
            </div>
            <input
              placeholder="Enter PSA API Key"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              disabled={psaConnected}
              style={{
                width: "100%",
                padding: "10px 14px",
                marginBottom: 10,
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                color: "#e5e7eb",
                fontSize: 14,
                outline: "none"
              }}
            />
            <button
              onClick={connectPSA}
              disabled={psaConnected || loading}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: psaConnected ? "#10b981" : "#EA5F5C",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: psaConnected ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 14,
                opacity: loading ? 0.5 : 1
              }}
            >
              {psaConnected ? "✓ Connected" : "Connect PSA"}
            </button>
          </div>

          {/* Add Submission */}
          <div
            style={{
              background: "#0f172a",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              border: "1px solid #1e293b"
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#94a3b8" }}>
              Sync Submission
            </div>
            <input
              placeholder="PSA Submission #"
              value={submissionInput}
              onChange={e => setSubmissionInput(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                marginBottom: 10,
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                color: "#e5e7eb",
                fontSize: 14,
                outline: "none"
              }}
              onKeyPress={e => e.key === "Enter" && syncSubmission()}
            />
            <button
              onClick={syncSubmission}
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 14,
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? "Syncing..." : "+ Add Submission"}
            </button>
          </div>

          {/* Submissions List */}
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#94a3b8" }}>
            Recent Submissions ({subs.length})
          </div>

          {loading && subs.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, opacity: 0.6 }}>
              Loading submissions...
            </div>
          )}

          {!loading && subs.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                opacity: 0.5,
                fontSize: 14
              }}
            >
              No submissions yet.<br />
              Add your first submission above!
            </div>
          )}

          <div style={{ maxHeight: "calc(100vh - 500px)", overflowY: "auto" }}>
            {subs.map(s => (
              <div
                key={s.psa_submission_number}
                onClick={() => openSub(s.psa_submission_number)}
                style={{
                  padding: 16,
                  marginBottom: 10,
                  borderRadius: 10,
                  background: selected?.psa_submission_number === s.psa_submission_number 
                    ? "#1e293b" 
                    : "#0f172a",
                  cursor: "pointer",
                  border: selected?.psa_submission_number === s.psa_submission_number
                    ? "2px solid #EA5F5C"
                    : "1px solid #1e293b",
                  transition: "all 0.2s"
                }}
                onMouseOver={e => {
                  if (selected?.psa_submission_number !== s.psa_submission_number) {
                    e.currentTarget.style.background = "#1e293b";
                  }
                }}
                onMouseOut={e => {
                  if (selected?.psa_submission_number !== s.psa_submission_number) {
                    e.currentTarget.style.background = "#0f172a";
                  }
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>
                  #{s.psa_submission_number}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <StatusPill status={s.current_status} />
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  {s.card_count || 0} cards
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ padding: 32, background: "#0f172a" }}>
          {!selected && !loading && (
            <div
              style={{
                textAlign: "center",
                paddingTop: 80,
                opacity: 0.5
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                No Submission Selected
              </div>
              <div style={{ fontSize: 14, color: "#64748b" }}>
                Select a submission from the sidebar to view details
              </div>
            </div>
          )}

          {loading && selected && (
            <div style={{ textAlign: "center", padding: 40 }}>
              Loading submission details...
            </div>
          )}

          {selected && !loading && (
            <>
              {/* Submission Header */}
              <div
                style={{
                  background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  borderRadius: 12,
                  padding: 24,
                  marginBottom: 24,
                  border: "1px solid #334155"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                      PSA SUBMISSION
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
                      #{selected.psa_submission_number}
                    </div>
                    <StatusPill status={selected.current_status} />
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                      Total Cards
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: "#EA5F5C" }}>
                      {cards.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards Table */}
              {cards.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>
                  No cards in this submission yet
                </div>
              )}

              {cards.length > 0 && (
                <div
                  style={{
                    background: "#020617",
                    borderRadius: 12,
                    border: "1px solid #1e293b",
                    overflow: "hidden"
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse"
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "#0f172a",
                          borderBottom: "2px solid #1e293b"
                        }}
                      >
                        <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
                          YEAR
                        </th>
                        <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
                          PLAYER / CHARACTER
                        </th>
                        <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
                          SET
                        </th>
                        <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
                          GRADE
                        </th>
                        <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
                          CERT #
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cards.map((c, i) => (
                        <tr
                          key={`${c.psa_cert_number}-${i}`}
                          style={{
                            borderBottom: "1px solid #1e293b",
                            transition: "background 0.2s"
                          }}
                          onMouseOver={e => e.currentTarget.style.background = "#0f172a"}
                          onMouseOut={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ padding: "16px 20px", fontSize: 14 }}>{c.year || "-"}</td>
                          <td style={{ padding: "16px 20px", fontSize: 14, fontWeight: 600 }}>
                            {c.player_name || c.character || "-"}
                          </td>
                          <td style={{ padding: "16px 20px", fontSize: 14, color: "#94a3b8" }}>
                            {c.card_set || "-"}
                          </td>
                          <td style={{ padding: "16px 20px" }}>
                            {c.grade ? (
                              <span
                                style={{
                                  background: "#10b981",
                                  color: "white",
                                  padding: "4px 12px",
                                  borderRadius: 6,
                                  fontSize: 13,
                                  fontWeight: 700
                                }}
                              >
                                {c.grade}
                              </span>
                            ) : (
                              <span style={{ color: "#64748b", fontSize: 13 }}>Pending</span>
                            )}
                          </td>
                          <td style={{ padding: "16px 20px", fontSize: 13, fontFamily: "monospace", color: "#94a3b8" }}>
                            {c.psa_cert_number || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        input:focus {
          border-color: #EA5F5C !important;
        }
        
        button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        button:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
