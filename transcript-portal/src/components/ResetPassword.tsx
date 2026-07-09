import { useState } from "react";
import { BASE_URL } from "../api";

export default function ResetPassword() {
  const token = window.location.hash.replace("#reset-password/", "").split("/")[0] || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirm_password: confirm }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Reset failed."); }
      else { setMessage(data.message); setDone(true); }
    } catch {
      setError("Could not connect to server.");
    }
    setLoading(false);
  }

  if (!token) {
    return <div className="auth-page"><div className="auth-card"><p style={{color:"#A32D2D"}}>Invalid reset link.</p></div></div>;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-3">
          <h1 style={{ color: "#722F37", fontSize: 26, fontWeight: 700, margin: "12px 0 4px" }}>Set New Password</h1>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Enter your new password below.</p>
        </div>
        {done ? (
          <div className="w-100">
            <div className="alert py-2 text-center" style={{ fontSize: 13, borderRadius: 8, background: "rgba(45,80,22,0.2)", borderColor: "rgba(99,153,34,0.4)", color: "#2d5016" }}>{message}</div>
            <a href="/" className="btn w-100 text-white fw-bold text-uppercase mt-3 py-3 d-block text-center text-decoration-none" style={{ background: "linear-gradient(90deg, #8A3A44 0%, #722F37 100%)", borderRadius: 10, letterSpacing: 1, boxShadow: "0 8px 20px rgba(114,47,55,0.5)" }}>Go to Login</a>
          </div>
        ) : (
          <form className="w-100" onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>New Password</label>
              <div className="position-relative">
                <input className="form-control" style={{ borderRadius: 10, paddingRight: 44 }} type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required />
                <button type="button" className="position-absolute" style={{ right: 12, top: 10, background: "none", border: "none", cursor: "pointer", padding: 4 }} onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ?
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    :
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>Confirm Password</label>
              <div className="position-relative">
                <input className="form-control" style={{ borderRadius: 10, paddingRight: 44 }} type={showConfirm ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" required />
                <button type="button" className="position-absolute" style={{ right: 12, top: 10, background: "none", border: "none", cursor: "pointer", padding: 4 }} onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? "Hide password" : "Show password"}>
                  {showConfirm ?
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    :
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {error && <div className="alert alert-danger py-2 text-center" style={{ fontSize: 13, borderRadius: 8 }}>{error}</div>}
            {message && <div className="alert py-2 text-center" style={{ fontSize: 13, borderRadius: 8, background: "rgba(45,80,22,0.2)", borderColor: "rgba(99,153,34,0.4)", color: "#2d5016" }}>{message}</div>}

            <button className="btn w-100 text-white fw-bold text-uppercase mt-3 py-3" type="submit" disabled={loading} style={{ background: "linear-gradient(90deg, #8A3A44 0%, #722F37 100%)", borderRadius: 10, letterSpacing: 1, boxShadow: "0 8px 20px rgba(114,47,55,0.5)", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
        <a href="/" className="btn w-100 mt-3" style={{ border: "none", color: "#722F37", fontSize: 13, cursor: "pointer", fontWeight: 600, textDecoration: "none" }}>← Back to Login</a>
      </div>
    </div>
  );
}

