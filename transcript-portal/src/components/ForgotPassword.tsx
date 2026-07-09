import { useState } from "react";
import { BASE_URL } from "../api";

export default function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const url = `${BASE_URL}/password-reset/`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setError(`Server returned ${res.status}`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setMessage(data.message || data.error || "Reset link sent.");
    } catch (err: any) {
      setError(`Error: ${err.message || "Could not connect to server."}`);
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-3">
          <h1 style={{ color: "#722F37", fontSize: 26, fontWeight: 700, margin: "12px 0 4px" }}>Reset Password</h1>
          <p style={{ color: "#888", fontSize: 13, margin: 0, lineHeight: 1.5 }}>Enter your email address to receive a password reset link.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>Email Address</label>
            <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@usted.edu.gh" required style={{ borderRadius: 10 }} />
          </div>

          {message && <div className="alert py-2 text-center" style={{ fontSize: 13, borderRadius: 8, background: "rgba(45,80,22,0.2)", borderColor: "rgba(99,153,34,0.4)", color: "#2d5016" }}>{message}</div>}
          {error && <div className="alert alert-danger py-2 text-center" style={{ fontSize: 13, borderRadius: 8 }}>{error}</div>}

          <button className="btn w-100 text-white fw-bold text-uppercase mt-3 py-3" type="submit" disabled={loading} style={{ background: "linear-gradient(90deg, #8A3A44 0%, #722F37 100%)", borderRadius: 10, letterSpacing: 1, boxShadow: "0 8px 20px rgba(114, 47, 55, 0.5)", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <button className="btn w-100 mt-3" style={{ border: "none", color: "#722F37", fontSize: 13, cursor: "pointer", fontWeight: 600 }} onClick={onBack}>← Back to Login</button>
      </div>
    </div>
  );
}


