import { useState } from "react";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";

export default function Login({ onLogin }: { onLogin: (username: string, password: string) => Promise<boolean> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  if (showRegister) {
    return <Register onBack={() => setShowRegister(false)} />;
  }
  
  if (showForgot) {
    return <ForgotPassword onBack={() => setShowForgot(false)} />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const success = await onLogin(username, password);
    if (!success) setError("Invalid username or password.");
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-3">
          <img src="/AAMUSTED_nobg.png" alt="USTED Logo" style={{ width: 80, height: 80, objectFit: "contain", filter: "drop-shadow(0 4px 16px rgba(184,150,46,0.6))" }} />
          <h1 style={{ color: "#722F37", fontSize: 26, fontWeight: 700, margin: "12px 0 4px" }}>USTED Transcript</h1>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Official Academic Records Portal</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input className="form-control form-control-lg" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Email or Student ID" required style={{ borderRadius: 10 }} />
          </div>
          <div className="mb-3 position-relative">
            <input className="form-control form-control-lg" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{ borderRadius: 10 }} />
            <span onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: 10, cursor: "pointer", fontSize: 18, userSelect: "none", color: "#888" }}>
              {showPassword ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              )}
            </span>
          </div>

          <div className="d-flex justify-content-between mb-3 px-1">
            <span className="text-decoration-none" style={{ color: "#722F37", fontSize: 13, cursor: "pointer", fontWeight: 600 }} onClick={() => setShowForgot(true)}>Forgot Password?</span>
            <span className="text-decoration-none" style={{ color: "#B8962E", fontSize: 13, cursor: "pointer", fontWeight: 700 }} onClick={() => setShowRegister(true)}>Sign Up</span>
          </div>

          {error && <div className="alert alert-danger py-2 text-center" style={{ fontSize: 13, borderRadius: 8 }}>{error}</div>}

          <button className="btn w-100 text-white fw-bold text-uppercase py-3" type="submit" disabled={loading} style={{ background: "linear-gradient(90deg, #8A3A44 0%, #722F37 100%)", borderRadius: 10, letterSpacing: 1, boxShadow: "0 8px 20px rgba(114, 47, 55, 0.5)", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <button className="btn w-100 mt-3" style={{ border: "1px solid rgba(0,0,0,0.15)", borderRadius: 10, color: "#555", fontSize: 14, fontWeight: 600, padding: "12px" }} onClick={() => setShowRegister(true)}>Create New Account</button>

        <p className="text-center mt-3" style={{ color: "#bbb", fontSize: 11, lineHeight: 1.4 }}>University of Skills Training and Entrepreneurial Development</p>
      </div>
    </div>
  );
}


