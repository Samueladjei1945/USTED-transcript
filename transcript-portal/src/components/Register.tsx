import { useState } from "react";
import { BASE_URL } from "../api";

export default function Register({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({ 
    first_name: "", 
    last_name: "", 
    email: "", 
    password: "", 
    confirm_password: "" 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let { name, value } = e.target;
    if (name === "first_name" || name === "last_name") value = value.replace(/[^a-zA-Z\s\-]/g, "");
    if (e.target.value !== value) e.target.value = value; // Force DOM update
    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
      } else {
        setSuccess("Account created! You can now sign in and complete your request form.");
      }
    } catch {
      setError("Could not connect to server. Make sure Django is running.");
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-3">
          <img src="/AAMUSTED_nobg.png" alt="USTED Logo" style={{ width: 80, height: 80, objectFit: "contain", filter: "drop-shadow(0 4px 16px rgba(184,150,46,0.6))" }} />
          <h1 style={{ color: "#722F37", fontSize: 26, fontWeight: 700, margin: "12px 0 4px" }}>Create Account</h1>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Enter your university details to get started</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-2">
            <div className="col-12 col-sm-6">
              <label className="form-label fw-semibold" style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>First Name</label>
              <input className="form-control" name="first_name" type="text" value={form.first_name} onChange={handleChange} placeholder="Samuel" required style={{ borderRadius: 10 }} />
            </div>
            <div className="col-12 col-sm-6">
              <label className="form-label fw-semibold" style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>Last Name</label>
              <input className="form-control" name="last_name" type="text" value={form.last_name} onChange={handleChange} placeholder="Adjei" required style={{ borderRadius: 10 }} />
            </div>
          </div>

          <div className="mt-3">
            <label className="form-label fw-semibold" style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>Email Address</label>
            <input className="form-control" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@usted.edu.gh" required style={{ borderRadius: 10 }} />
          </div>

          <div className="mt-3">
            <label className="form-label fw-semibold" style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>Password</label>
            <div className="position-relative">
              <input className="form-control" style={{ borderRadius: 10, paddingRight: 44 }} name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="Min. 6 characters" required />
              <span onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: 10, cursor: "pointer", fontSize: 18, userSelect: "none", color: "#888" }}>
                {showPassword ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> : <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>}
              </span>
            </div>
          </div>

          <div className="mt-3">
            <label className="form-label fw-semibold" style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>Confirm Password</label>
            <div className="position-relative">
              <input className="form-control" style={{ borderRadius: 10, paddingRight: 44 }} name="confirm_password" type={showConfirm ? "text" : "password"} value={form.confirm_password} onChange={handleChange} placeholder="Repeat your password" required />
              <span onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: 14, top: 10, cursor: "pointer", fontSize: 18, userSelect: "none", color: "#888" }}>
                {showConfirm ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> : <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>}
              </span>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 mt-3 text-center" style={{ fontSize: 13, borderRadius: 8 }}>{error}</div>}
          {success && <div className="alert alert-success py-2 mt-3 text-center" style={{ fontSize: 13, borderRadius: 8, background: "#2d5016", borderColor: "#4a7a22", color: "#a8d184" }}>{success}</div>}

          <button className="btn w-100 text-white fw-bold text-uppercase mt-4 py-3" type="submit" disabled={loading} style={{ background: "linear-gradient(90deg, #8A3A44 0%, #722F37 100%)", borderRadius: 10, letterSpacing: 1, boxShadow: "0 8px 20px rgba(114, 47, 55, 0.5)", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <button className="btn w-100 mt-3" style={{ border: "none", color: "#722F37", fontSize: 13, cursor: "pointer", fontWeight: 600 }} onClick={onBack}>← Back to Sign In</button>

        <p className="text-center mt-3" style={{ color: "#bbb", fontSize: 11, lineHeight: 1.4 }}>University of Skills Training and Entrepreneurial Development</p>
      </div>
    </div>
  );
}


