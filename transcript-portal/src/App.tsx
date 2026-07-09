import { useState, useEffect } from "react";
import { login, logout, get } from "./api";
import Login from "./components/Login";
import StudentDashboard from "./components/StudentDashboard";
import AdminDashboard from "./components/AdminDashboard";
import ResetPassword from "./components/ResetPassword";

export default function App() {
  if (window.location.hash.startsWith("#reset-password/")) {
    return <ResetPassword />;
  }
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    setLoading(true);
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const data = await get('/role/');
        setRole(data?.role || null);
      } catch (e) {
        console.error("Session check failed:", e);
      }
    }
    setLoading(false);
  }

  async function handleLogin(username: string, password: string) {
    try {
      const success = await login(username, password);
      if (!success) return false;
      const data = await get('/role/');
      setRole(data?.role || null);
      return true;
    } catch (e) {
      console.error("Login failed:", e);
      return false;
    }
  }

  function handleLogout() {
    logout();
    setRole(null);
  }

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <img src="/AAMUSTED_nobg.png" alt="USTED Logo" style={{ width: 100, height: 100, objectFit: "contain", filter: "drop-shadow(0 4px 16px rgba(184,150,46,0.6))", animation: "pulse 1.5s ease-in-out infinite" }} />
          <h2 style={{ color: "#722F37", fontSize: 22, fontWeight: 700, marginTop: 20 }}>USTED Transcript</h2>
          <p style={{ color: "#888", fontSize: 13, marginTop: 8 }}>Loading, please wait...</p>
        </div>
      </div>
    );
  }

  if (!role) return <Login onLogin={handleLogin} />;
  if (role === "admin") return <AdminDashboard onLogout={handleLogout} />;
  if (role === "student") return <StudentDashboard onLogout={handleLogout} />;
}