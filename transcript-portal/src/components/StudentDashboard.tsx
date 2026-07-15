import { useState, useEffect } from "react";
import { get, post, patch } from "../api";
import { generatePDF } from "../utils/generatePDF";
import { WINE, GOLD, GREEN, USTED_PROGRAMMES, FALLBACK_TRANSCRIPT, FALLBACK_LETTERS } from "../constants";

interface FormState {
  [key: string]: any;
  transcript_type: string; extra_copy: string; letters: string[];
  first_name: string; middle_name: string; surname: string;
  dob: string; index_number: string; level: string; programme: string;
  year_entry: string; year_completion: string; passport_number: string;
  address: string; gps_address: string; courier_zone: string; telephone: string; delivery_method: string; pickup_location: string; delivery_email: string;
  country_code: string; momo_provider: string; momo_number: string; momo_name: string;
}

const SIMULATOR_FORM_DATA: Partial<FormState> = {
  transcript_type: "Standard Transcript (Academic Record)",
  extra_copy: "No",
  letters: ["Introductory letter (Visa)"],
  first_name: "John",
  middle_name: "Kofi",
  surname: "Sample",
  dob: "2000-01-15",
  level: "Winneba",
  programme: "B.Ed. Basic Education",
  year_entry: "2021",
  year_completion: "2025",
  passport_number: "GHA1234567",
  address: "P.O. Box 123, Kumasi",
  gps_address: "AK-039-5028",
  courier_zone: "kumasi",
  telephone: "240000000",
  delivery_method: "courier",
  pickup_location: "",
  delivery_email: "",
  momo_number: "0240000000",
  momo_name: "John Sample",
  country_code: "+233",
  momo_provider: "MTN MoMo",
};

const requestSteps = ["Service & Request Type", "Academic Details", "Delivery Details", "Confirmation", "Payment"];
const COURIER_ZONES = [
  { key: "kumasi", label: "Within Kumasi", price: 30 },
  { key: "ashanti", label: "Outside Kumasi (Ashanti Region)", price: 50 },
  { key: "outside", label: "Outside Ashanti Region", price: 80 },
];

export default function StudentDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState(() => { const t = localStorage.getItem("ust_tab"); return t === "request" || t === "history" || t === "overview" ? t : "overview"; });
  const [student, setStudent] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Request form state (persisted)
  const saved = JSON.parse(localStorage.getItem("ust_req") || "{}");
  const [step, setStep] = useState(saved.step || 1);
  const [form, setForm] = useState<FormState>({
    country_code: "+233", momo_provider: "MTN MoMo",
    transcript_type: "", extra_copy: "No", letters: [],
    first_name: "", middle_name: "", surname: "",
    dob: "", index_number: "", level: "", programme: "",
    year_entry: "", year_completion: "", passport_number: "",
    address: "", gps_address: "", courier_zone: "", telephone: "", delivery_method: "", pickup_location: "", delivery_email: "",
    momo_number: "", momo_name: "",
    ...(saved.form || {}),
  });
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Persist tab, step & form
  useEffect(() => { localStorage.setItem("ust_tab", tab); }, [tab]);
  useEffect(() => {
    if (!formSuccess) localStorage.setItem("ust_req", JSON.stringify({ step, form }));
  }, [step, form, formSuccess]);

  // Reset personal fields when student data loads (handles user switch)
  useEffect(() => {
    if (!student) return;
    const parts = (student.name || "").split(" ");
    setForm(prev => ({
      ...prev,
      first_name: parts[0] || "",
      middle_name: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
      surname: parts.length > 1 ? parts[parts.length - 1] : "",
      index_number: student.student_id || prev.index_number,
    }));
  }, [student?.id]);

  const [profileForm, setProfileForm] = useState({
    student_id: "",
    year: ""
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [cgpaData, setCgpaData] = useState<any>(null);
  const [cgpaLoading, setCgpaLoading] = useState(false);
  const [transcriptOptions, setTranscriptOptions] = useState(FALLBACK_TRANSCRIPT);
  const [letterOptions, setLetterOptions] = useState(FALLBACK_LETTERS);
  const [simulating, setSimulating] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketError, setTicketError] = useState("");
  const [ticketSuccess, setTicketSuccess] = useState("");

  useEffect(() => { fetchData(); fetchPrices(); fetchTickets(); }, []);

  async function fetchPrices() {
    try {
      const data = await get('/prices/');
      if (data && data.length > 0) {
        const tr = data.filter((p: any) => p.category === 'transcript');
        const lt = data.filter((p: any) => p.category === 'letter');
        if (tr.length > 0) setTranscriptOptions(tr.map((item: any) => ({ label: item.label, price: Number(item.price) })));
        if (lt.length > 0) setLetterOptions(lt.map((item: any) => ({ label: item.label, price: Number(item.price) })));
      }
    } catch (err: any) {
      console.error("Failed to fetch prices", err);
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const profile = await get('/student/profile/');
      setStudent(profile);
      setProfileForm({ student_id: profile.student_id || "", year: profile.year || "" });
      const reqs = await get('/student/requests/');
      setRequests(reqs || []);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }

  const [unreadCount, setUnreadCount] = useState(0);

  async function fetchTickets() {
    try {
      const data = await get('/student/tickets/');
      setTickets(data || []);
      setUnreadCount((data || []).filter((t: any) => t.admin_response && !t.student_read).length);
    } catch {}
  }

  async function markTicketsRead() {
    try {
      await patch('/student/tickets/mark-read/', {});
      setUnreadCount(0);
      fetchTickets();
    } catch {}
  }

  async function handleSubmitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      setTicketError("Please fill in both subject and message.");
      return;
    }
    setTicketSubmitting(true);
    setTicketError("");
    try {
      const result = await post('/student/tickets/', { subject: ticketSubject, message: ticketMessage });
      if (result) {
        setTicketSubject("");
        setTicketMessage("");
        setTicketSuccess("Your complaint has been submitted successfully!");
        setTimeout(() => setTicketSuccess(""), 4000);
        fetchTickets();
      } else {
        setTicketError("Failed to submit ticket. Please try again.");
      }
    } catch {
      setTicketError("Network error.");
    }
    setTicketSubmitting(false);
  }

  const transcriptPrice = transcriptOptions.find(o => o.label === form.transcript_type)?.price || 0;
  const extraCopyPrice = form.extra_copy === "Yes" ? (transcriptOptions.find(o => o.label === "Additional Copy")?.price || 12) : 0;
  const lettersPrice = form.letters.reduce((sum: number, l: string) => sum + (letterOptions.find(o => o.label === l)?.price || 0), 0);
  const courierPrice = form.delivery_method === "courier" ? (COURIER_ZONES.find(z => z.key === form.courier_zone)?.price || 0) : 0;
  const total = transcriptPrice + extraCopyPrice + lettersPrice + courierPrice;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    let { name, value } = e.target;
    if (name === "telephone") {
      value = value.replace(/[^0-9]/g, "");
    }
    if (name === "country_code") {
      value = value.replace(/[^+0-9]/g, "");
    }
    setForm({ ...form, [name]: value });
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: "" });
  }

  function handleLetterToggle(letter: string) {
    const cur = form.letters;
    setForm({ ...form, letters: cur.includes(letter) ? cur.filter((l: string) => l !== letter) : [...cur, letter] });
  }

  function validateStep() {
    const errs: Record<string, string> = {};
    if (step === 1 && !form.transcript_type && form.letters.length === 0) {
      errs.step = "Please select at least one transcript type or letter.";
    }
    if (step === 2) {
      if (!form.first_name || form.first_name.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(form.first_name.trim())) errs.first_name = "Enter a valid first name (letters only, min 2 characters).";
      if (!form.surname || form.surname.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(form.surname.trim())) errs.surname = "Enter a valid surname (letters only, min 2 characters).";
      if (form.middle_name && !/^[a-zA-Z\s]+$/.test(form.middle_name.trim())) errs.middle_name = "Middle name should only contain letters.";
      if (!form.dob) errs.dob = "Date of birth is required.";
      if (!form.programme) errs.programme = "Select or enter your programme.";
      if (!form.level) errs.level = "Select your campus.";
      if (form.year_entry && !/^\d{4}$/.test(form.year_entry)) errs.year_entry = "Enter a valid 4-digit year (e.g. 2021).";
      if (form.year_completion && !/^\d{4}$/.test(form.year_completion)) errs.year_completion = "Enter a valid 4-digit year (e.g. 2025).";
    }
    if (step === 3) {
      if (!form.delivery_method) errs.delivery_method = "Select a delivery method.";
      if (form.delivery_method === "pickup" && !form.pickup_location) errs.pickup_location = "Select a pickup location.";
      if (form.delivery_method === "email" && (!form.delivery_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.delivery_email))) errs.delivery_email = "Enter a valid email address.";
      if ((form.delivery_method === "postal" || form.delivery_method === "courier") && !form.address) errs.address = "Enter your delivery address.";
      if (form.delivery_method === "courier" && !form.courier_zone) errs.courier_zone = "Select a delivery zone.";
      if (!form.telephone) errs.telephone = "Telephone number is required.";
      else {
        const cc = form.country_code || "+233";
        const fullTel = cc + form.telephone.replace(/^0/, "");
        if (fullTel.replace(/\D/g, "").length < 10) errs.telephone = "Enter a valid telephone number (min 10 digits with country code).";
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function nextStep() {
    setFormError("");
    setFieldErrors({});
    if (step === 1 && !form.transcript_type && form.letters.length === 0) {
      setFormError("Please select at least one transcript type or letter.");
      return;
    }
    if (step === 2 && (!form.first_name || !form.surname || !student.student_id || !form.level || !form.programme)) {
      setFormError("Please fill in all required fields. Ensure your Profile Index Number and Campus are selected.");
      return;
    }
    if (!validateStep()) return;
    setStep(step + 1);
  }

  async function lookupCgpa() {
    const id = profileForm.student_id.trim();
    if (!id) return;
    setCgpaLoading(true);
    setCgpaData(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/student/cgpa/${encodeURIComponent(id)}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setCgpaData(data);
      else setProfileMessage(data.error || "Lookup failed.");
    } catch {}
    setCgpaLoading(false);
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setProfileMessage("");
    setProfileSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/student/profile/update/", {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({ student_id: profileForm.student_id, year: profileForm.year })
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileMessage(data.error || "Failed to update profile.");
      } else {
        setStudent(data);
        setProfileMessage("Profile updated successfully!");
      }
    } catch {
      setProfileMessage("Network error updating profile.");
    }
    setProfileSubmitting(false);
  }

  async function handlePaystackPayment() {
    setFormError("");
    setSubmitting(true);
    try {
      const init = await post('/student/requests/initialize-payment/', { amount: total });
      if (!init || !init.reference) {
        setFormError("Failed to initialize payment. Please try again.");
        setSubmitting(false);
        return;
      }
      const purpose = [form.transcript_type, ...form.letters].filter(Boolean).join(", ");
      const deliveryDetail = form.delivery_method === "pickup" ? `Pickup: ${form.pickup_location}` : form.delivery_method === "email" ? `Email: ${form.delivery_email}` : form.delivery_method === "postal" || form.delivery_method === "courier" ? `Address: ${form.address}` : "";
      const cc = form.country_code || "+233";
      const fullTel = cc + form.telephone.replace(/^0/, "");
      const notes = `Name: ${form.first_name} ${form.middle_name} ${form.surname} | Index: ${form.index_number} | Level: ${form.level} | Programme: ${form.programme} | Entry: ${form.year_entry} | Completion: ${form.year_completion} | DOB: ${form.dob} | Passport: ${form.passport_number || "N/A"} | ${deliveryDetail} | Tel: ${fullTel} | Extra Copy: ${form.extra_copy} | Total: GH₵${total}`;

      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_xxxxxxxxxxxxx",
        email: student.email,
        amount: Math.round(total * 100),
        ref: init.reference,
        onClose: () => { setSubmitting(false); setFormError("Payment cancelled. You can try again."); },
        callback: async function(response: any) {
          const result = await post('/student/requests/verify-and-create/', {
            reference: response.reference,
            purpose,
            notes,
            transcript_type: form.transcript_type,
            momo_name: form.momo_name,
            momo_number: form.momo_number,
            momo_provider: form.momo_provider,
            telephone: (form.country_code || "+233") + form.telephone.replace(/^0/, ""),
            address: form.address,
            total_amount: total,
          });
          if (!result) {
            setFormError("Payment was successful but we couldn't create your request. Please contact support.");
            setSubmitting(false);
            return;
          }
          setFormSuccess(true);
          setSubmitting(false);
          localStorage.removeItem("ust_req");
          setTimeout(() => {
            setFormSuccess(false);
            setStep(1);
            setForm({ transcript_type: "", extra_copy: "No", letters: [], first_name: "", middle_name: "", surname: "", dob: "", index_number: "", level: "", programme: "", year_entry: "", year_completion: "", passport_number: "", address: "", gps_address: "", courier_zone: "", telephone: "", delivery_method: "", pickup_location: "", delivery_email: "", country_code: "+233", momo_number: "", momo_name: "", momo_provider: "MTN MoMo" });
            fetchData();
            setTab("history");
          }, 3000);
        }
      });
      handler.openIframe();
    } catch (err: any) {
      setFormError("Payment failed: " + (err.message || "Unknown error"));
      setSubmitting(false);
    }
  }

  async function handleSimulatePayment() {
    setFormError("");
    setSubmitting(true);
    try {
      const ref = `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const purpose = [form.transcript_type, ...form.letters].filter(Boolean).join(", ");
      const deliveryDetail = form.delivery_method === "pickup" ? `Pickup: ${form.pickup_location}` : form.delivery_method === "email" ? `Email: ${form.delivery_email}` : form.delivery_method === "postal" || form.delivery_method === "courier" ? `Address: ${form.address}` : "";
      const cc = form.country_code || "+233";
      const fullTel = cc + form.telephone.replace(/^0/, "");
      const notes = `[SIMULATION] Name: ${form.first_name} ${form.middle_name} ${form.surname} | Index: ${form.index_number} | Level: ${form.level} | Programme: ${form.programme} | Entry: ${form.year_entry} | Completion: ${form.year_completion} | DOB: ${form.dob} | Passport: ${form.passport_number || "N/A"} | ${deliveryDetail} | Tel: ${fullTel} | Extra Copy: ${form.extra_copy} | Total: GH₵${total}`;

      const result = await post('/student/requests/verify-and-create/', {
        reference: ref,
        purpose,
        notes,
        transcript_type: form.transcript_type,
        momo_name: form.momo_name,
        momo_number: form.momo_number,
        momo_provider: form.momo_provider,
        telephone: (form.country_code || "+233") + form.telephone.replace(/^0/, ""),
        address: form.address,
        total_amount: total,
      });
      if (!result) {
        setFormError("Simulation failed. Could not create request.");
        setSubmitting(false);
        return;
      }
      setFormSuccess(true);
      setSubmitting(false);
      localStorage.removeItem("ust_req");
      setTimeout(() => {
        setFormSuccess(false);
        setStep(1);
        setForm({ transcript_type: "", extra_copy: "No", letters: [], first_name: "", middle_name: "", surname: "", dob: "", index_number: "", level: "", programme: "", year_entry: "", year_completion: "", passport_number: "", address: "", gps_address: "", courier_zone: "", telephone: "", delivery_method: "", pickup_location: "", delivery_email: "", country_code: "+233", momo_number: "", momo_name: "", momo_provider: "MTN MoMo" });
        fetchData();
        setTab("history");
      }, 3000);
    } catch (err: any) {
      setFormError("Simulation failed: " + (err.message || "Unknown error"));
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div style={s.shell}>
      <div style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div className="skeleton skeleton-avatar" style={{ margin: "0 auto 16px" }} />
          <div className="skeleton skeleton-text" style={{ width: "60%", margin: "0 auto" }} />
        </div>
        <div style={{ padding: "2rem 1rem" }}>
           <div className="skeleton skeleton-text" style={{ height: "48px", borderRadius: "12px", marginBottom: "8px" }} />
           <div className="skeleton skeleton-text" style={{ height: "48px", borderRadius: "12px", marginBottom: "8px" }} />
           <div className="skeleton skeleton-text" style={{ height: "48px", borderRadius: "12px" }} />
        </div>
      </div>
      <div style={s.main}>
        <div style={s.topbar}>
          <div className="skeleton skeleton-title" style={{ margin: 0, width: "200px" }} />
          <div className="skeleton" style={{ width: "100px", height: "32px", borderRadius: "20px" }} />
        </div>
        <div style={s.statsGrid}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-card" />)}
        </div>
        <div style={s.section}>
           <div style={s.sectionHeader}>
             <div className="skeleton skeleton-title" style={{ margin: 0, width: "150px" }} />
           </div>
           <div style={{ padding: "2rem" }}>
             <div className="skeleton skeleton-text" />
             <div className="skeleton skeleton-text" />
             <div className="skeleton skeleton-text" />
           </div>
        </div>
      </div>
    </div>
  );

  if (!student) return (
    <div style={s.loadingPage}>
      <p style={{ color: "#A32D2D" }}>No student record found. Contact the Registrar's Office.</p>
    </div>
  );

  const completed = requests.filter(r => r.status === "Completed").length;
  const pending = requests.filter(r => ["Pending Payment", "Pending Review", "Under Review"].includes(r.status)).length;
  const total_reqs = requests.length;

  return (
    <div className="dashboard-wrapper">

      {/* Sidebar overlay for mobile */}
      <div className={`sidebar-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── Sidebar ── */}
      <div className={`dashboard-sidebar${sidebarOpen ? ' open' : ''}`} style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.sidebarTopAccent} />
          <img src="/AAMUSTED_nobg.png" alt="USTED" style={s.sidebarLogo} />
          <div style={s.sidebarSchool}>USTED</div>
          <div style={s.sidebarPortal}>Transcript Portal</div>
          <button className="d-md-none position-absolute" style={{ top: 8, right: 8, background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "4px 8px" }} onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <div style={s.sidebarDivider} />

        {/* Main nav */}
        <nav style={s.nav}>
          {[
            { key: "overview", label: "Overview", icon: "▦" },
            { key: "request", label: "Request Transcript", icon: "✎" },
            { key: "history", label: "My Requests", icon: "☰" },
          ].map(item => (
            <button
              key={item.key}
              style={{ ...s.navBtn, ...(tab === item.key ? s.navBtnActive : {}) }}
              onClick={() => {
                if (item.key === "request" && !student.student_id) {
                  setShowProfileModal(true);
                  setProfileMessage("Please complete your profile (Index Number) before requesting a transcript.");
                  return;
                }
                setTab(item.key); 
                if (item.key !== "request") setStep(1); 
              }}
            >
              <span style={s.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>



        {/* Student info at bottom */}
        <div style={s.sidebarFooter}>
          <div style={s.sidebarProfileCard} onClick={() => setShowProfileModal(true)} className="profile-trigger">
            <div style={s.sidebarProfileTop}>
              <div style={s.studentAvatar}>
                {student.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div style={s.studentInfo}>
                <div style={s.studentName}>{student.name}</div>
                <div style={s.studentId}>{student.student_id || "N/A"}</div>
              </div>
            </div>
            <div style={s.sidebarProfileMeta}>
              <span style={s.sidebarMetaItem}>{student.email}</span>
              <span style={s.sidebarStatus}>{student.status}</span>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={onLogout} title="Sign out">↩ Sign Out</button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="dashboard-main" style={s.main}>

        {/* Topbar */}
        <div className="d-flex align-items-center justify-content-between mb-3 topbar">
          <div className="d-flex align-items-center gap-2">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>
            <div>
              <div className="page-title">
                {tab === "request" ? "Request Transcript" : tab === "history" ? "My Requests" : "Overview"}
              </div>
              <div className="d-none d-sm-block page-date">{new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <label className="d-flex align-items-center gap-2" style={{ cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={simulating} onChange={() => {
                const next = !simulating;
                setSimulating(next);
                if (next) {
                  setForm(prev => ({
                    ...prev,
                    ...SIMULATOR_FORM_DATA,
                    index_number: student?.student_id || prev.index_number,
                  }));
                  setStep(1);
                  setTab("request");
                }
              }} style={{ accentColor: WINE }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: simulating ? GOLD : "#999" }}>🔬 Simulator</span>
            </label>
            <button className="btn btn-sm position-relative" style={{ background: "none", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#555", padding: "4px 10px", cursor: "pointer" }} onClick={() => { setShowSupport(true); markTicketsRead(); }}>❓ Help{unreadCount > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill" style={{ background: "#A32D2D", fontSize: 10, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", transform: "translate(-50%, -50%) !important" }}>{unreadCount}</span>}</button>
            <span className="badge rounded-pill badge-status badge-active">{student.status}</span>
          </div>
        </div>

        {simulating && (
          <div className="alert d-flex align-items-center gap-2 py-3 px-4 mb-4" role="status" style={{ background: "linear-gradient(90deg, #FEF7E0 0%, #FDF0C8 100%)", border: "1px solid #FAC775", borderRadius: 12, color: "#854F0B", fontSize: 14, fontWeight: 600 }}>
            <span>🔬 Simulator Mode — test data is pre-filled. Payment will be simulated.</span>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
              {[
                { label: "Year / Level", value: student.year, sub: "Current enrolment", color: WINE },
                { label: "Cumulative GPA", value: student.gpa || "—", sub: "Academic standing", color: GREEN },
                { label: "Total Requests", value: total_reqs, sub: "Transcript requests made", color: WINE },
                { label: "Completed", value: completed, sub: "Ready to download", color: "#3B6D11" },
              ].map(stat => (
                <div key={stat.label} className="col">
                  <div className="stat-card h-100">
                    <div className="stat-label">{stat.label}</div>
                    <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="stat-sub">{stat.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {pending > 0 && (
              <div className="alert d-flex align-items-center gap-2 py-3 px-4 mb-4" role="status" style={{ borderLeft: "4px solid #EF9F27", borderRadius: 12, background: "linear-gradient(90deg, #FDF4E6 0%, #FAEEDA 100%)", borderColor: "#FAC775", color: "#854F0B" }}>
                <span className="d-inline-block" style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF9F27", flexShrink: 0 }} />
                <span>You have <strong>{pending}</strong> request{pending > 1 ? "s" : ""} in payment/review processing.</span>
              </div>
            )}

            <div className="section-card mb-4">
              <div className="section-card-header"><span className="section-card-title">Student Profile</span></div>
              <div className="profile-details">
                {[["Full Name", student.name], ["Student ID", student.student_id], ["Email Address", student.email], ["Year / Level", student.year], ["Enrolment Status", student.status], ["Cumulative GPA", student.gpa || "Not yet assigned"]].map(([label, value]) => (
                  <div key={label} className="profile-item">
                    <div className="profile-label">{label}</div>
                    <div style={{ fontSize: 15, color: "#1a0a0a", fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="section-card">
              <div className="section-card-header"><span className="section-card-title">Academic Record</span></div>
              {(!student.semesters || student.semesters.length === 0) ? (
                <div className="empty-state"><div style={{ fontSize: 42, marginBottom: 16, opacity: 0.5 }}>📚</div><div>No academic records yet.</div><div style={{ fontSize: 13, marginTop: 6, color: "#aaa" }}>Contact the Registrar's Office.</div></div>
              ) : student.semesters.map((sem: any) => (
                <div key={sem.id} style={{ borderBottom: "1px solid #f5f0e8", padding: "1.5rem 2rem", background: "#fafaf8" }}>
                  <div className="text-gold fw-bold mb-3 text-uppercase" style={{ fontSize: 14, letterSpacing: 0.5, fontFamily: "var(--font-heading)" }}>{sem.name}</div>
                  <div className="table-responsive"><table className="table table-borderless align-middle mb-0" style={{ fontSize: 14 }}>
                    <thead><tr>{["Code", "Course", "Credits", "Grade"].map(h => <th key={h} className="table-thead-th">{h}</th>)}</tr></thead>
                    <tbody>{sem.courses.map((c: any) => (
                      <tr key={c.id}>
                        <td className="table-tbody-td">{c.code}</td><td className="table-tbody-td">{c.title}</td>
                        <td className="table-tbody-td">{c.credit}</td>
                        <td className="table-tbody-td"><span style={gradeStyle(c.grade)}>{c.grade}</span></td>
                      </tr>
                    ))}                    </tbody>
                  </table></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── REQUEST FORM ── */}
        {tab === "request" && (
          <div>
            {formSuccess ? (
              <div className="section-card">
                <div style={{ textAlign: "center", padding: "3rem" }}>
                  <div style={{ fontSize: 52, color: simulating ? GOLD : GREEN, marginBottom: 12 }}>{simulating ? "🧪" : "✓"}</div>
                  <h2 style={{ color: simulating ? GOLD : GREEN, marginBottom: 8 }}>{simulating ? "Simulation Complete!" : "Request Submitted!"}</h2>
                  {simulating && <span className="badge rounded-pill mb-2" style={{ background: "#FAEEDA", color: "#854F0B", fontSize: 12, padding: "4px 14px", fontWeight: 600, border: "1px solid #FAC775" }}>🧪 This was a simulation</span>}
                  <p style={{ color: "#555", fontSize: 14 }}>{simulating ? "A simulated request has been created. You can view it in My Requests and an admin can approve and upload a document." : "Your request has been sent to the Academic Affairs Directorate."}</p>
                  <p style={{ color: "#555", fontSize: 14, marginTop: 6 }}>Total: <strong>GH₵{total}.00</strong> — {simulating ? "No real payment was charged." : "Make payment at the Finance Office."}</p>
                  {form.delivery_method && <p style={{ color: "#555", fontSize: 13, marginTop: 8 }}>
                    Delivery: <strong>{form.delivery_method === "pickup" ? `Pickup at ${form.pickup_location}` : form.delivery_method === "email" ? `Sent to ${form.delivery_email}` : form.delivery_method === "postal" ? `Posted to ${form.address}` : `Courier to ${form.address}`}</strong>
                  </p>}
                </div>
              </div>
            ) : (
              <div className="section-card">
                <div className="section-card-header">
                  <span className="section-card-title">
                    Step {step} — {requestSteps[step - 1]}
                  </span>
                  <span className="badge rounded-pill" style={{ fontSize: 13, color: "#888", fontWeight: 500, background: "#f5f0eb", padding: "4px 12px" }}>Step {step} of 5</span>
                </div>

                {/* Steps Progress Bar */}
                <div style={s.progressBar}>
                  {requestSteps.map((label, i) => {
                    const num = i + 1;
                    const active = step === num;
                    const done = step > num;
                    return (
                      <div key={num} style={s.progressStep}>
                        <div style={s.progressStepTop}>
                          <div style={{ ...s.progressCircle, ...(done ? s.progressCircleDone : active ? s.progressCircleActive : s.progressCircleInactive) }}>
                            {done ? "✓" : num}
                          </div>
                          {num < 5 && <div style={{ ...s.progressLine, ...(done ? s.progressLineDone : {}) }} />}
                        </div>
                        <div style={{ ...s.progressLabel, ...(active ? s.progressLabelActive : {}) }}>{label}</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: "1.5rem" }}>

                  {/* Step 1 */}
                  {step === 1 && (
                    <div className="fade-in">
                      <div className="alert d-flex align-items-center gap-2 py-3 px-4 mb-4" role="note" style={{ background: "linear-gradient(135deg, rgba(114,47,55,0.06) 0%, rgba(184,150,46,0.04) 100%)", border: "1px solid rgba(184,150,46,0.25)", borderRadius: 12, color: WINE, fontSize: 14 }}>Select your transcript type and any additional letters you need.</div>

                      <label className="form-label">Select Transcript Type</label>
                      <select className="form-select mb-3" name="transcript_type" value={form.transcript_type} onChange={handleChange}>
                        <option value="">-- Choose your transcript type --</option>
                        {transcriptOptions.map(o => <option key={o.label} value={o.label}>{o.label} — GH₵{o.price}.00</option>)}
                      </select>

                      <div className="cards-grid gap-3">
                        {transcriptOptions.slice(0, 3).map(opt => {
                          const isActive = form.transcript_type === opt.label;
                          return (
                            <div key={opt.label} className={"service-card" + (isActive ? " service-card-active" : "")} onClick={() => setForm({ ...form, transcript_type: opt.label })}>
                              <div className="card-icon" style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: isActive ? GOLD : "#F5F5F5", color: isActive ? "#fff" : "#666", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 16px", transition: "all 0.3s ease" }}>
                                <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                                  <path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/>
                                </svg>
                              </div>
                              <div className="card-label" style={{ fontSize: 12, color: isActive ? "rgba(255,255,255,0.85)" : "#444", marginBottom: 8, lineHeight: 1.5, fontWeight: 500 }}>{opt.label}</div>
                              <div className="card-price" style={{ fontSize: 15, fontWeight: 800, color: isActive ? GOLD : WINE }}>GH₵{opt.price}.00</div>
                            </div>
                          );
                        })}
                      </div>

                      <label className="form-label">Extra Copy?</label>
                      <select className="form-select" name="extra_copy" value={form.extra_copy} onChange={handleChange}>
                        <option value="No">No</option>
                        <option value="Yes">Yes — GH₵{transcriptOptions.find(o => o.label === "Additional Copy")?.price || 12}.00</option>
                      </select>

                      <div className="form-label">Letters (Optional)</div>
                      <div className="letters-grid gap-2">
                        {letterOptions.map(opt => (
                          <label key={opt.label} className="d-flex align-items-center gap-3 px-3 py-3 rounded-3" style={{ border: "1px solid #E0D0B0", cursor: "pointer", background: "#fafaf8" }}>
                            <input type="checkbox" checked={form.letters.includes(opt.label)} onChange={() => handleLetterToggle(opt.label)} style={{ accentColor: WINE }} />
                            <span style={{ flex: 1, fontSize: 14, color: "#333", fontWeight: 500 }}>{opt.label}</span>
                            <span style={{ fontSize: 14, color: WINE, fontWeight: 700 }}>GH₵{opt.price}</span>
                          </label>
                        ))}
                      </div>

                      <div className="d-flex justify-content-end align-items-center gap-3 mt-4 pt-4" style={{ borderTop: "2px dashed rgba(184,150,46,0.4)" }}>
                        <span style={{ fontSize: 15, color: "#555", fontWeight: 600 }}>Updated Amount:</span>
                        <span style={{ fontSize: 26, fontWeight: 800, color: WINE, fontFamily: "var(--font-heading)", letterSpacing: -0.5 }}>GH₵{total}.00</span>
                      </div>
                    </div>
                  )}

                  {/* Step 2 */}
                  {step === 2 && (
                    <div className="fade-in">
                      <div className="alert d-flex align-items-center gap-2 py-3 px-4 mb-4" role="note" style={{ background: "linear-gradient(135deg, rgba(114,47,55,0.06) 0%, rgba(184,150,46,0.04) 100%)", border: "1px solid rgba(184,150,46,0.25)", borderRadius: 12, color: WINE, fontSize: 14 }}>Provide your accurate academic information. Your Index Number is locked from your profile.</div>
                      <div className="name-row mb-3">
                        {[["first_name", "First name *"], ["middle_name", "Middle name"], ["surname", "Surname *"]].map(([name, label]) => (
                          <div key={name}>
                            <label className="form-label">{label}</label>
                            <input className={"form-input" + (fieldErrors[name] ? " input-error" : "")} name={name} value={form[name]} onChange={handleChange} />
                            {fieldErrors[name] && <div className="field-error">{fieldErrors[name]}</div>}
                          </div>
                        ))}
                      </div>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Index Number (Locked from Profile)</label>
                          <input className="form-input" style={{ backgroundColor: "#f0f0f0", color: "#666" }} value={student.student_id} disabled />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Campus *</label>
                          <select className={"form-select" + (fieldErrors.level ? " input-error" : "")} name="level" value={form.level} onChange={handleChange}>
                            <option value="">Select your campus</option>
                            <option value="Winneba">Winneba</option>
                            <option value="USTED">USTED</option>
                          </select>
                          {fieldErrors.level && <div className="field-error">{fieldErrors.level}</div>}
                        </div>
                        
                        <div className="col-md-6">
                          <label className="form-label">Date of Birth *</label>
                          <div className="d-flex align-items-center gap-2">
                            <input className={"form-input flex-grow-1" + (fieldErrors.dob ? " input-error" : "")} type="date" name="dob" value={form.dob} onChange={handleChange} />
                            {form.dob && <span style={{ fontSize: 14, color: "#666", whiteSpace: "nowrap", fontWeight: 500 }}>
                              Age: {Math.floor((new Date().getTime() - new Date(form.dob).getTime()) / 31557600000)}
                            </span>}
                          </div>
                          {fieldErrors.dob && <div className="field-error">{fieldErrors.dob}</div>}
                        </div>
                        {[
                          { label: "Year of Entry", name: "year_entry", placeholder: "e.g. 2021" },
                          { label: "Year of Completion", name: "year_completion", placeholder: "e.g. 2025" },
                        ].map(field => (
                          <div key={field.name} className="col-md-6">
                            <label className="form-label">{field.label}</label>
                            <input className={"form-input" + (fieldErrors[field.name] ? " input-error" : "")} name={field.name} value={form[field.name]} onChange={handleChange} placeholder={field.placeholder || ""} />
                            {fieldErrors[field.name] && <div className="field-error">{fieldErrors[field.name]}</div>}
                          </div>
                        ))}
                        {form.letters.includes("Introductory letter (Visa)") && (
                          <div className="col-md-6">
                            <label className="form-label">Passport Number (if applicable)</label>
                            <input className={"form-input" + (fieldErrors.passport_number ? " input-error" : "")} name="passport_number" value={form.passport_number} onChange={handleChange} placeholder="" />
                            {fieldErrors.passport_number && <div className="field-error">{fieldErrors.passport_number}</div>}
                          </div>
                        )}
                        <div className="col-md-6">
                          <label className="form-label">Programme *</label>
                          <input className={"form-input" + (fieldErrors.programme ? " input-error" : "")} name="programme" value={form.programme} onChange={handleChange} placeholder="Select or type your programme" list="programme-list" />
                          {fieldErrors.programme && <div className="field-error">{fieldErrors.programme}</div>}
                          <datalist id="programme-list">
                            {USTED_PROGRAMMES.map(p => <option key={p} value={p} />)}
                          </datalist>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3 */}
                  {step === 3 && (
                    <div>
                      <div className="alert d-flex align-items-center gap-2 py-3 px-4 mb-4" role="note" style={{ background: "linear-gradient(135deg, rgba(114,47,55,0.06) 0%, rgba(184,150,46,0.04) 100%)", border: "1px solid rgba(184,150,46,0.25)", borderRadius: 12, color: WINE, fontSize: 14 }}>How would you like to receive your document?</div>

                      <label className="form-label">Delivery Method *</label>
                      <div className="delivery-options-grid mb-3">
                        {[
                          { value: "pickup", label: "Pickup from Campus", icon: "🏛️" },
                          { value: "postal", label: "Postal Delivery", icon: "📮" },
                          { value: "email", label: "Email (Soft Copy)", icon: "📧" },
                          { value: "courier", label: "Courier Service", icon: "🚚" },
                        ].map(opt => (
                          <label key={opt.value} className={"d-flex flex-column align-items-center gap-2 p-3 rounded-3 text-center" + (form.delivery_method === opt.value ? " delivery-option-active" : "")} style={{ cursor: "pointer", border: "2px solid " + (fieldErrors.delivery_method ? "#A32D2D" : form.delivery_method === opt.value ? WINE : "#eee"), transition: "all 0.2s" }}>
                            <input type="radio" name="delivery_method" value={opt.value} checked={form.delivery_method === opt.value} onChange={handleChange} style={{ display: "none" }} />
                            <span style={{ fontSize: 24 }}>{opt.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                      {fieldErrors.delivery_method && <div className="field-error mb-3">{fieldErrors.delivery_method}</div>}

                      {form.delivery_method === "pickup" && (
                        <div>
                          <label className="form-label">Preferred Pickup Location *</label>
                          <select className={"form-select" + (fieldErrors.pickup_location ? " input-error" : "")} name="pickup_location" value={form.pickup_location} onChange={handleChange}>
                            <option value="">Select location</option>
                            <option value="Kumasi Campus - Main Office">Kumasi Campus - Main Office</option>
                            <option value="Kumasi Campus - Registry">Kumasi Campus - Registry</option>
                            <option value="Mampong Campus - Main Office">Mampong Campus - Main Office</option>
                            <option value="Mampong Campus - Registry">Mampong Campus - Registry</option>
                            <option value="Asante-Mampong Campus">Asante-Mampong Campus</option>
                          </select>
                          {fieldErrors.pickup_location && <div className="field-error">{fieldErrors.pickup_location}</div>}
                        </div>
                      )}

                      {form.delivery_method === "email" && (
                        <div>
                          <label className="form-label">Email Address for Soft Copy *</label>
                          <input className={"form-input" + (fieldErrors.delivery_email ? " input-error" : "")} type="email" name="delivery_email" value={form.delivery_email} onChange={handleChange} placeholder="your.email@example.com" />
                          {fieldErrors.delivery_email && <div className="field-error">{fieldErrors.delivery_email}</div>}
                        </div>
                      )}

                      {(form.delivery_method === "postal" || form.delivery_method === "courier") && (
                        <div>
                          <label className="form-label">Delivery Address *</label>
                          <input className={"form-input" + (fieldErrors.address ? " input-error" : "")} name="address" value={form.address} onChange={handleChange} placeholder="Full postal address" />
                          {fieldErrors.address && <div className="field-error">{fieldErrors.address}</div>}
                          {form.delivery_method === "postal" && (
                            <div className="mt-3">
                              <label className="form-label">GPS Address</label>
                              <input className="form-input" name="gps_address" value={form.gps_address} onChange={handleChange} placeholder="e.g. AK-039-5028" />
                            </div>
                          )}
                          {form.delivery_method === "courier" && (
                            <div className="mt-3">
                              <label className="form-label">Delivery Zone *</label>
                              <select className={"form-select" + (fieldErrors.courier_zone ? " input-error" : "")} name="courier_zone" value={form.courier_zone} onChange={handleChange}>
                                <option value="">Select delivery zone</option>
                                {COURIER_ZONES.map(z => (
                                  <option key={z.key} value={z.key}>{z.label} — GH₵{z.price}.00</option>
                                ))}
                              </select>
                              {fieldErrors.courier_zone && <div className="field-error">{fieldErrors.courier_zone}</div>}
                            </div>
                          )}
                        </div>
                      )}

                      <label className="form-label">Telephone Number *</label>
                      <div className="d-flex gap-2">
                        <select name="country_code" value={form.country_code} onChange={handleChange} className="form-select flex-shrink-0" style={{ width: "auto", minWidth: 100 }}>
                          <option value="+233">+233 (Ghana)</option>
                          <option value="+1">+1 (USA/Canada)</option>
                          <option value="+44">+44 (UK)</option>
                          <option value="+234">+234 (Nigeria)</option>
                          <option value="+225">+225 (Cote d'Ivoire)</option>
                          <option value="+27">+27 (South Africa)</option>
                          <option value="+254">+254 (Kenya)</option>
                          <option value="+256">+256 (Uganda)</option>
                          <option value="+255">+255 (Tanzania)</option>
                          <option value="+220">+220 (Gambia)</option>
                          <option value="+232">+232 (Sierra Leone)</option>
                          <option value="+231">+231 (Liberia)</option>
                        </select>
                        <input className={"form-input flex-grow-1" + (fieldErrors.telephone ? " input-error" : "")} name="telephone" value={form.telephone} onChange={handleChange} placeholder="e.g. 240000000" type="tel" />
                      </div>
                      {fieldErrors.telephone && <div className="field-error">{fieldErrors.telephone}</div>}

                      <div className="rounded-3 p-4 mt-4" style={{ background: "linear-gradient(180deg, #fdfbf7 0%, #f9f6ef 100%)", border: "1px solid #e8d5b0", boxShadow: "0 6px 16px rgba(184,150,46,0.06)" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: WINE, marginBottom: 16, borderBottom: "1px solid #e8d5b0", paddingBottom: 10, fontFamily: "var(--font-heading)" }}>Request Summary</div>
                        {form.transcript_type && <div className="summary-row"><span>{form.transcript_type}</span><span>GH₵{transcriptPrice}.00</span></div>}
                        {form.extra_copy === "Yes" && <div className="summary-row"><span>Extra Copy</span><span>GH₵{extraCopyPrice}.00</span></div>}
                        {form.letters.map(l => { const opt = letterOptions.find(o => o.label === l); return <div key={l} className="summary-row"><span>{l}</span><span>GH₵{opt?.price || 0}.00</span></div>; })}
                        {courierPrice > 0 && <div className="summary-row"><span>Courier Delivery ({COURIER_ZONES.find(z => z.key === form.courier_zone)?.label})</span><span>GH₵{courierPrice}.00</span></div>}
                        <div className="summary-total"><span>Total</span><span>GH₵{total}.00</span></div>
                        {form.delivery_method && <div className="summary-row pt-2 mt-2" style={{ borderTop: "1px solid #e8d5b0", fontSize: 12, color: "#888" }}>
                          <span>Delivery: {form.delivery_method === "pickup" ? "Campus Pickup" : form.delivery_method === "postal" ? "Postal" : form.delivery_method === "email" ? "Email" : "Courier"}</span>
                          <span>{form.pickup_location || form.delivery_email || form.address + (form.gps_address ? ` (${form.gps_address})` : "") || (form.courier_zone ? COURIER_ZONES.find(z => z.key === form.courier_zone)?.label : "") || "—"}</span>
                        </div>}
                      </div>
                    </div>
                  )}

                  {/* Step 4 — Confirmation */}
                  {step === 4 && (
                    <div className="fade-in">
                      <div className="alert d-flex align-items-center gap-2 py-3 px-4 mb-4" role="status" style={{ background: "linear-gradient(135deg, rgba(45,80,22,0.06) 0%, rgba(45,80,22,0.02) 100%)", border: "1px solid rgba(45,80,22,0.25)", borderRadius: 12, color: "#2D5016", fontSize: 14 }}>Please review your details carefully before proceeding to payment.</div>

                      <div className="rounded-4 p-4 mb-4" style={{ background: "#fff", border: "1px solid #e8d5b0", boxShadow: "0 8px 24px rgba(184,150,46,0.06)" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: WINE, fontFamily: "var(--font-heading)", marginBottom: 16, borderBottom: "1px solid #e8d5b0", paddingBottom: 12 }}>Service &amp; Request</div>
                        <div className="summary-row"><span>Transcript Type</span><span>{form.transcript_type || "Not selected"}</span></div>
                        <div className="summary-row"><span>Extra Copy</span><span>{form.extra_copy}</span></div>
                        {form.letters.length > 0 && <div className="summary-row"><span>Letters</span><span>{form.letters.join(", ")}</span></div>}

                        <div style={{ fontSize: 16, fontWeight: 700, color: WINE, fontFamily: "var(--font-heading)", margin: "20px 0 12px", borderBottom: "1px solid #e8d5b0", paddingBottom: 12 }}>Academic Details</div>
                        <div className="summary-row"><span>Full Name</span><span>{form.first_name} {form.middle_name} {form.surname}</span></div>
                        <div className="summary-row"><span>Index Number</span><span>{student.student_id}</span></div>
                        <div className="summary-row"><span>Campus</span><span>{form.level || "Not selected"}</span></div>
                        {form.dob && <div className="summary-row"><span>Date of Birth</span><span>{form.dob}</span></div>}
                        <div className="summary-row"><span>Programme</span><span>{form.programme}</span></div>
                        {form.year_entry && <div className="summary-row"><span>Year of Entry</span><span>{form.year_entry}</span></div>}
                        {form.year_completion && <div className="summary-row"><span>Year of Completion</span><span>{form.year_completion}</span></div>}

                        <div style={{ fontSize: 16, fontWeight: 700, color: WINE, fontFamily: "var(--font-heading)", margin: "20px 0 12px", borderBottom: "1px solid #e8d5b0", paddingBottom: 12 }}>Delivery</div>
                        <div className="summary-row"><span>Method</span><span>{form.delivery_method === "pickup" ? "Campus Pickup" : form.delivery_method === "postal" ? "Postal" : form.delivery_method === "email" ? "Email" : form.delivery_method === "courier" ? "Courier" : "Not selected"}</span></div>
                        {form.pickup_location && <div className="summary-row"><span>Pickup Location</span><span>{form.pickup_location}</span></div>}
                        {form.delivery_email && <div className="summary-row"><span>Delivery Email</span><span>{form.delivery_email}</span></div>}
                        {form.address && <div className="summary-row"><span>Delivery Address</span><span>{form.address}</span></div>}
                        {form.gps_address && <div className="summary-row"><span>GPS Address</span><span>{form.gps_address}</span></div>}
                        {form.courier_zone && <div className="summary-row"><span>Delivery Zone</span><span>{COURIER_ZONES.find(z => z.key === form.courier_zone)?.label}</span></div>}
                        <div className="summary-row"><span>Telephone</span><span>{form.country_code}{form.telephone}</span></div>

                        {courierPrice > 0 && <div className="summary-row" style={{ fontSize: 13, color: "#555" }}><span>Courier Charge</span><span>GH₵{courierPrice}.00</span></div>}
                        <div className="summary-total" style={{ marginTop: 24 }}><span>Total Amount</span><span>GH₵{total}.00</span></div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center" style={{ borderTop: "1px solid rgba(224,208,176,0.6)", paddingTop: 24 }}>
                        <button className="btn btn-wine-outline px-4 py-2" onClick={() => setStep(step - 1)}>← Back</button>
                        <button className="btn btn-wine px-4 py-2" onClick={() => setStep(step + 1)}>Proceed to Payment →</button>
                      </div>
                    </div>
                  )}

                  {/* Step 5 — Payment */}
                  {step === 5 && (
                    <div>
                      <div className="alert d-flex align-items-center gap-2 py-3 px-4 mb-4" role="note" style={{ background: "linear-gradient(135deg, rgba(114,47,55,0.06) 0%, rgba(184,150,46,0.04) 100%)", border: "1px solid rgba(184,150,46,0.25)", borderRadius: 12, color: WINE, fontSize: 14 }}>Complete your payment securely via Paystack.</div>

                      <div className="rounded-4 p-4 mb-4" style={{ background: "#fff", border: "1px solid #e8d5b0", boxShadow: "0 8px 24px rgba(184,150,46,0.06)" }}>
                        {simulating ? (
                          <>
                            <div className="d-flex align-items-center gap-3 mb-4">
                              <span style={{ fontSize: 32 }}>🧪</span>
                              <div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: GOLD, fontFamily: "var(--font-heading)" }}>Simulated Payment</div>
                                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>No real payment will be charged — this is test mode</div>
                              </div>
                            </div>
                            <div className="d-flex justify-content-between align-items-center p-4 rounded-3 mb-4" style={{ background: "linear-gradient(135deg, #854F0B 0%, #5A3508 100%)", boxShadow: "0 8px 24px rgba(133,79,11,0.4)" }}>
                              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 500 }}>Total Due (Simulated)</span>
                              <span style={{ color: GOLD, fontSize: 26, fontWeight: 800, fontFamily: "var(--font-heading)" }}>GH₵{total}.00</span>
                            </div>
                            {formError && <div className="alert mb-0 py-3 px-4" role="alert" style={{ background: "#FCEBEB", border: "1px solid #F7C1C1", color: "#A32D2D", borderRadius: 8, fontWeight: 500 }}>{formError}</div>}
                            <div className="d-flex justify-content-between align-items-center mt-4 pt-4" style={{ borderTop: "1px solid rgba(224,208,176,0.6)" }}>
                              <button className="btn btn-wine-outline px-4 py-2" type="button" onClick={() => setStep(step - 1)}>← Back</button>
                              <button className="btn btn-wine px-4 py-2" style={{ background: GOLD, borderColor: GOLD }} disabled={submitting} onClick={handleSimulatePayment}>
                                {submitting ? "Processing..." : `🧪 Simulate Payment — GH₵${total}.00`}
                              </button>
                            </div>
                            <div style={{ fontSize: 13, color: "#666", marginTop: 12, fontStyle: "italic" }}>This is a simulation. No real payment will be processed.</div>
                          </>
                        ) : (
                          <>
                            <div className="d-flex align-items-center gap-3 mb-4">
                              <span style={{ fontSize: 32 }}>🔒</span>
                              <div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: WINE, fontFamily: "var(--font-heading)" }}>Paystack Secure Checkout</div>
                                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>Pay with Mobile Money or Debit/Credit Card</div>
                              </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-center p-4 rounded-3 mb-4" style={{ background: "linear-gradient(135deg, #722F37 0%, #4a1e24 100%)", boxShadow: "0 8px 24px rgba(114,47,55,0.4)" }}>
                              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 500 }}>Total Due</span>
                              <span style={{ color: GOLD, fontSize: 26, fontWeight: 800, fontFamily: "var(--font-heading)" }}>GH₵{total}.00</span>
                            </div>

                            <div className="row g-2 mb-4">
                              {[{ icon: "📱", value: "MTN MoMo", label: "MTN MoMo" }, { icon: "📱", value: "Vodafone Cash", label: "Vodafone Cash" }, { icon: "📱", value: "AirtelTigo Money", label: "AirtelTigo Money" }, { icon: "💳", value: "Card", label: "Visa / Mastercard" }].map(p => (
                                <div key={p.value} className="col-6">
                                  <div className="d-flex align-items-center gap-2 p-3 rounded-3" style={{ background: form.momo_provider === p.value ? "rgba(114,47,55,0.08)" : "#f9f6ef", border: form.momo_provider === p.value ? `2px solid ${WINE}` : "1px solid #e8d5b0", cursor: "pointer", fontSize: 13, fontWeight: 500, color: form.momo_provider === p.value ? WINE : "#444", transition: "all 0.15s" }} onClick={() => setForm({...form, momo_provider: p.value})}>
                                    <span>{p.icon}</span> {p.label}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {form.momo_provider && form.momo_provider !== "Card" && (
                              <div className="row g-2 mb-4">
                                <div className="col-6">
                                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>MoMo Account Name</label>
                                  <input className="form-input w-100" placeholder="e.g. John Doe" value={form.momo_name} onChange={e => setForm({...form, momo_name: e.target.value})} style={{ fontSize: 14 }} />
                                </div>
                                <div className="col-6">
                                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>MoMo Phone Number</label>
                                  <input className="form-input w-100" placeholder="e.g. 024xxxxxxx" value={form.momo_number} onChange={e => setForm({...form, momo_number: e.target.value})} style={{ fontSize: 14 }} />
                                </div>
                              </div>
                            )}

                            {formError && <div className="alert mb-0 py-3 px-4" role="alert" style={{ background: "#FCEBEB", border: "1px solid #F7C1C1", color: "#A32D2D", borderRadius: 8, fontWeight: 500 }}>{formError}</div>}

                            <div className="d-flex justify-content-between align-items-center mt-4 pt-4" style={{ borderTop: "1px solid rgba(224,208,176,0.6)" }}>
                              <button className="btn btn-wine-outline px-4 py-2" type="button" onClick={() => setStep(step - 1)}>← Back</button>
                              <button className="btn btn-wine px-4 py-2" disabled={submitting} onClick={handlePaystackPayment}>
                                {submitting ? "Processing..." : `Pay GH₵${total}.00 Now`}
                              </button>
                            </div>
                            <div style={{ fontSize: 13, color: "#666", marginTop: 12, fontStyle: "italic" }}>You will be redirected to Paystack's secure checkout to complete your payment.</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {formError && step < 4 && <div className="alert py-3 px-4 mt-4" role="alert" style={{ background: "#FCEBEB", border: "1px solid #F7C1C1", color: "#A32D2D", borderRadius: 8, fontWeight: 500 }}>{formError}</div>}

                  {step < 4 && (
                    <div className="d-flex justify-content-between align-items-center mt-4 pt-4" style={{ borderTop: "1px solid rgba(224,208,176,0.6)" }}>
                      {step > 1 && <button className="btn btn-wine-outline px-4 py-2" onClick={() => setStep(step - 1)}>← Back</button>}
                      <button className="btn btn-wine px-4 py-2 ms-auto" onClick={nextStep}>Next Step →</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === "history" && (
          <div>
            <div className="section-card">
              <div className="section-card-header">
                <span className="section-card-title">My Transcript Requests</span>
                <span className="badge rounded-pill" style={{ fontSize: 13, color: "#888", fontWeight: 500, background: "#f5f0eb", padding: "4px 12px" }}>{total_reqs} request{total_reqs !== 1 ? "s" : ""}</span>
              </div>
              {requests.length === 0 ? (
                <div className="empty-state"><div style={{ fontSize: 42, marginBottom: 16, opacity: 0.5 }}>📋</div><div>No requests yet.</div><div style={{ fontSize: 13, marginTop: 6, color: "#aaa" }}>Go to "Request Transcript" to submit your first request.</div></div>
              ) : (
                <div>
                  {requests.map(r => (
                    <div key={r.id} style={{ borderBottom: "1px solid #f5f0e8" }}>
                      <div className="d-flex align-items-center justify-content-between px-4 py-4">
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a0a0a", marginBottom: 6 }}>{r.purpose}</div>
                          <div style={{ fontSize: 13, color: "#aaa" }}>Submitted: {r.created_at.slice(0, 10)}</div>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <span className="badge rounded-pill" style={badge(r.status)}>{r.status}</span>
                          {(r.notes || "").includes("[SIMULATION]") && <span className="badge rounded-pill" style={{ background: "#FAEEDA", color: "#854F0B", fontSize: 10, padding: "4px 8px", fontWeight: 600, border: "1px solid #FAC775" }}>🧪 Sim</span>}
                          {(r.status === "Completed" || (r.status === "Approved" && r.document)) && (
                            <>
                              {r.document && (
                                <a className="btn btn-green btn-sm" href={r.document} target="_blank" rel="noopener noreferrer">Download Document</a>
                              )}
                              <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: 8, fontSize: 12 }} onClick={() => generatePDF(student, student.semesters || [], r.id)}>PDF (auto)</button>
                            </>
                          )}
                          {r.status === "Approved" && !r.document && <span className="small text-muted">Awaiting document upload</span>}
                        </div>
                      </div>
                      {r.status === "Rejected" && r.rejection_reason && (
                        <div className="px-4 pb-3 pt-0">
                          <div className="small" style={{ color: "#A32D2D", background: "#FCEBEB", border: "1px solid #F7C1C1", borderRadius: 8, padding: "8px 10px" }}>
                            <strong>Rejection reason:</strong> {r.rejection_reason}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Profile Modal ── */}
      {showProfileModal && (
        <div style={s.modalOverlay} onClick={() => setShowProfileModal(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>My Profile</span>
              <button style={s.modalClose} onClick={() => setShowProfileModal(false)}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div className="alert d-flex align-items-center gap-2 py-3 px-4 mb-4" role="note" style={{ background: "linear-gradient(135deg, rgba(114,47,55,0.06) 0%, rgba(184,150,46,0.04) 100%)", border: "1px solid rgba(184,150,46,0.25)", borderRadius: 12, color: WINE, fontSize: 14 }}>Please update your academic credentials. Your Index Number is required to process requests.</div>

              {profileMessage && (
                <div className={"alert d-flex align-items-center py-3 px-4 mb-4 " + (profileMessage.includes("success") ? "text-green" : "text-danger")} role="alert" style={{ background: profileMessage.includes("success") ? "rgba(45,80,22,0.08)" : "#FCEBEB", border: profileMessage.includes("success") ? "1px solid rgba(99,153,34,0.3)" : "1px solid #F7C1C1", borderRadius: 8, fontWeight: 500 }}>{profileMessage}</div>
              )}

              {/* CGPA Lookup */}
              <div className="d-flex align-items-center gap-3 mb-4" style={{ background: "linear-gradient(135deg, rgba(45,80,22,0.06) 0%, rgba(45,80,22,0.02) 100%)", border: "1px solid rgba(45,80,22,0.2)", borderRadius: 12, padding: "1.25rem 1.5rem", display: cgpaData ? "flex" : "none", boxShadow: "0 4px 16px rgba(45,80,22,0.06)" }}>
                <span style={{ fontSize: 28 }}>🎓</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>{cgpaData?.name}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{cgpaData?.year} &middot; {cgpaData?.status}</div>
                </div>
                <div style={{ textAlign: "center", padding: "8px 20px", background: "linear-gradient(135deg, #2D5016 0%, #1a3a0e 100%)", borderRadius: 10, boxShadow: "0 4px 12px rgba(45,80,22,0.2)" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>CGPA</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "var(--font-heading)" }}>{cgpaData?.gpa}</div>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Index Number / Student ID</label>
                    <div className="input-group">
                      <input className="form-input flex-grow-1" value={profileForm.student_id} onChange={e => { setCgpaData(null); setProfileForm({...profileForm, student_id: e.target.value.replace(/[^0-9a-zA-Z]/g, "")}); }} placeholder="e.g. 52012345" />
                      <button className="btn btn-wine" type="button" onClick={lookupCgpa} disabled={cgpaLoading || !profileForm.student_id.trim()}>
                        {cgpaLoading ? "..." : "Lookup"}
                      </button>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Current Level / Year</label>
                    <select className="form-select" value={profileForm.year} onChange={e => setProfileForm({...profileForm, year: e.target.value})}>
                      <option value="" disabled>Select your level</option>
                      <option value="Level 100">Level 100</option>
                      <option value="Level 200">Level 200</option>
                      <option value="Level 300">Level 300</option>
                      <option value="Level 400">Level 400</option>
                      <option value="Postgraduate">Postgraduate</option>
                      <option value="Alumni">Alumni / Completed</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <button className="btn btn-wine px-4 py-2" type="submit" disabled={profileSubmitting}>
                    {profileSubmitting ? "Saving..." : "Save Profile Details"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Help / Support Modal ── */}
      {showSupport && (
        <div style={s.modalOverlay} onClick={() => setShowSupport(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>❓ Help &amp; Support</span>
              <button style={s.modalClose} onClick={() => setShowSupport(false)}>✕</button>
            </div>
            <div style={s.modalBody}>
              {/* Submit Ticket Form */}
              <h6 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: WINE }}>Submit a Complaint / Ticket</h6>
              <form onSubmit={handleSubmitTicket}>
                <div className="mb-3">
                  <input className="form-input w-100" placeholder="Subject" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} required style={{ fontSize: 14 }} />
                </div>
                <div className="mb-3">
                  <textarea className="form-input w-100" rows={3} placeholder="Describe your issue..." value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} required style={{ fontSize: 14, resize: "vertical" }} />
                </div>
                {ticketSuccess && <div className="mb-3" style={s.success}>{ticketSuccess}</div>}
                {ticketError && <div className="mb-3" style={s.error}>{ticketError}</div>}
                <button className="btn btn-wine" type="submit" disabled={ticketSubmitting}>
                  {ticketSubmitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </form>

              <hr style={{ margin: "1.5rem 0", borderColor: "#e8d5b0" }} />

              {/* Ticket History */}
              <h6 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: WINE }}>My Tickets</h6>
              {tickets.length === 0 ? (
                <p style={{ fontSize: 13, color: "#999" }}>No tickets yet.</p>
              ) : (
                tickets.map(t => (
                  <div key={t.id} style={{ border: "1px solid #e8d5b0", borderRadius: 10, padding: 14, marginBottom: 12, background: "#faf8f4" }}>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <strong style={{ fontSize: 14 }}>{t.subject}</strong>
                      <span className="badge rounded-pill" style={{ background: t.status === "Open" ? "#FAEEDA" : t.status === "In Progress" ? "#E3EEF9" : t.status === "Resolved" ? "#EAF3DE" : "#EAEAEA", color: t.status === "Open" ? "#854F0B" : t.status === "In Progress" ? "#185FA5" : t.status === "Resolved" ? "#3B6D11" : "#666", fontSize: 11, padding: "3px 10px", fontWeight: 600 }}>{t.status}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#666", margin: 0 }}>{t.message}</p>
                    {t.admin_response && (
                      <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(45,80,22,0.06)", borderLeft: "3px solid #3B6D11", borderRadius: 6, fontSize: 13, color: "#333" }}>
                        <strong style={{ color: "#3B6D11" }}>Admin:</strong> {t.admin_response}
                        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{t.responded_by} &middot; {t.responded_at ? new Date(t.responded_at).toLocaleDateString() : ""}</div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function badge(status: string) {
  const map: Record<string, { background: string; color: string; border: string }> = {
    "Pending Payment": { background: "#FFF0E0", color: "#B85C00", border: "0.5px solid #FFD6A8" },
    "Pending Review": { background: "#FAEEDA", color: "#854F0B", border: "0.5px solid #FAC775" },
    "Under Review": { background: "#E3EEF9", color: "#1D4F91", border: "0.5px solid #BFD8F2" },
    Approved: { background: "#EAF3DE", color: "#3B6D11", border: "0.5px solid #C0DD97" },
    Completed: { background: "#E8F1FC", color: "#1D4F91", border: "0.5px solid #BCD5F3" },
    Rejected: { background: "#FCEBEB", color: "#A32D2D", border: "0.5px solid #F7C1C1" },
  };
  return { ...(map[status] || map["Pending Review"]), fontSize: 12, padding: "4px 12px", borderRadius: 20, fontWeight: 500 };
}

function gradeStyle(grade: string) {
  const g = grade?.charAt(0);
  const color = g === "A" ? "#3B6D11" : g === "B" ? "#185FA5" : g === "C" ? "#854F0B" : "#A32D2D";
  return { color, fontWeight: 600, fontSize: 14 };
}

const s = {
  shell: { display: "flex", minHeight: "100vh", fontFamily: "var(--font-primary)", background: "linear-gradient(135deg, #f9f6ef 0%, #f0ebe0 100%)", position: "relative" },
  loadingPage: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "var(--font-primary)", background: "linear-gradient(135deg, #f9f6ef 0%, #f0ebe0 100%)" },
  sidebar: { width: 270, background: "linear-gradient(180deg, #1a0f12 0%, #28181d 50%, #1a0f12 100%)", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column", minHeight: "100vh", flexShrink: 0, borderRight: `1px solid ${GOLD}22`, boxShadow: "4px 0 40px rgba(0,0,0,0.4)" },
  sidebarTop: { padding: "2rem 1.5rem 1.25rem", textAlign: "center", position: "relative", overflow: "hidden" },
  sidebarTopAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${WINE}, ${GOLD}, ${GREEN})` },
  sidebarLogo: { width: 80, height: 80, objectFit: "contain", marginBottom: 14, filter: "drop-shadow(0 4px 20px rgba(184,150,46,0.35))" },
  sidebarSchool: { color: GOLD, fontWeight: 800, fontSize: 20, letterSpacing: 2.5, fontFamily: "var(--font-heading)" },
  sidebarPortal: { color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 4, textTransform: "uppercase", letterSpacing: 2 },
  sidebarDivider: { height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}44, transparent)`, margin: "0 1rem" },
  nav: { padding: "1.25rem 0.75rem", flex: 1 },
  navBtn: { width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, border: "none", background: "transparent", color: "rgba(255,255,255,0.55)", fontSize: 14, cursor: "pointer", marginBottom: 2, textAlign: "left", transition: "all 0.2s ease", fontWeight: 500 },
  navBtnActive: { background: `linear-gradient(90deg, ${WINE}22 0%, ${WINE}08 100%)`, color: "#fff", fontWeight: 600, borderLeft: `3px solid ${WINE}` },
  navIcon: { fontSize: 16, width: 22, display: "flex", alignItems: "center", justifyContent: "center" },

  /* ── Progress Bar ── */
  progressBar: { display: "flex", justifyContent: "space-between", padding: "2rem 2rem 0", gap: 0 },
  progressStep: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center" },
  progressStepTop: { display: "flex", alignItems: "center", width: "100%", position: "relative" },
  progressCircle: { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0, transition: "all 0.3s ease", zIndex: 1, margin: "0 auto" },
  progressCircleActive: { background: WINE, color: "#fff", boxShadow: `0 0 0 4px rgba(114,47,55,0.15), 0 4px 12px rgba(114,47,55,0.3)` },
  progressCircleDone: { background: GREEN, color: "#fff", boxShadow: `0 0 0 4px rgba(45,80,22,0.15), 0 4px 12px rgba(45,80,22,0.25)` },
  progressCircleInactive: { background: "#EAEAEA", color: "#999" },
  progressLine: { flex: 1, height: 3, background: "#EAEAEA", position: "absolute", left: "50%", right: "-50%", top: "50%", transform: "translateY(-50%)", zIndex: 0 },
  progressLineDone: { background: GREEN },
  progressLabel: { fontSize: 12, color: "#999", marginTop: 10, fontWeight: 500, textAlign: "center", lineHeight: 1.3, transition: "all 0.3s ease", padding: "0 4px" },
  progressLabelActive: { color: WINE, fontWeight: 700 },

  sidebarFooter: { padding: "0.75rem", borderTop: `1px solid ${WINE}22`, marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 },
  sidebarProfileCard: { background: `linear-gradient(135deg, ${WINE}15, ${WINE}08)`, border: `1px solid ${WINE}25`, borderRadius: 12, padding: "12px", display: "flex", flexDirection: "column", gap: 10, cursor: "pointer", transition: "all 0.2s ease" },
  sidebarProfileTop: { display: "flex", alignItems: "center", gap: 10 },
  studentAvatar: { width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${WINE}, #8A1A2F 100%)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0, boxShadow: `0 4px 12px ${WINE}55` },
  studentInfo: { flex: 1, overflow: "hidden" },
  studentName: { color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  studentId: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  logoutBtn: { width: "100%", background: `${WINE}25`, border: `1px solid ${WINE}35`, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13, padding: "10px", borderRadius: 10, transition: "all 0.2s ease", lineHeight: 1, fontWeight: 500, letterSpacing: 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  sidebarProfileMeta: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderTop: `1px solid ${WINE}18`, paddingTop: 10 },
  sidebarMetaItem: { color: "rgba(255,255,255,0.3)", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 },
  sidebarStatus: { fontSize: 11, color: GOLD, fontWeight: 600, padding: "2px 10px", borderRadius: 10, background: `${GOLD}18`, border: `1px solid ${GOLD}30` },

  main: { flex: 1, overflow: "auto", background: "linear-gradient(180deg, rgba(249,246,239,0.98) 0%, rgba(240,235,224,0.98) 100%)" },
  topbar: { background: "rgba(255,255,255,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(224,208,176,0.6)", padding: "1.5rem 3rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" },
  pageTitle: { fontSize: 24, fontWeight: 700, color: WINE, fontFamily: "var(--font-heading)", letterSpacing: -0.3 },
  pageDate: { fontSize: 13, color: "#999", marginTop: 4 },
  topbarBadge: { background: "linear-gradient(135deg, #EAF3DE 0%, #D4E8B9 100%)", color: "#3B6D11", fontSize: 13, padding: "6px 16px", borderRadius: 24, fontWeight: 600, border: "1px solid #C0DD97", boxShadow: "0 2px 8px rgba(59,109,17,0.1)" },

  statsGrid: { display: "grid", gap: 20, padding: "2rem 3rem 0" },
  statCard: { background: "#fff", border: "1px solid rgba(224,208,176,0.5)", borderTop: `4px solid ${WINE}`, borderRadius: 16, padding: "1.5rem", boxShadow: "0 4px 20px rgba(0,0,0,0.04)", transition: "all 0.25s ease" },
  statLabel: { fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, fontWeight: 600 },
  statValue: { fontSize: 28, fontWeight: 800, marginBottom: 4, fontFamily: "var(--font-heading)", letterSpacing: -0.5 },
  statSub: { fontSize: 12, color: "#999" },
  alertBanner: { margin: "1.5rem 3rem 0", background: "linear-gradient(90deg, #FDF4E6 0%, #FAEEDA 100%)", border: "1px solid #FAC775", borderRadius: 12, padding: "14px 20px", fontSize: 14, color: "#854F0B", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 12px rgba(133,79,11,0.08)" },
  alertDot: { width: 10, height: 10, borderRadius: "50%", background: "#EF9F27", flexShrink: 0, boxShadow: "0 0 8px rgba(239,159,39,0.6)" },
  section: { margin: "2rem 0", background: "#fff", border: "1px solid rgba(224,208,176,0.6)", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 28px rgba(0,0,0,0.04)" },
  sectionHeader: { padding: "1.25rem 2rem", borderBottom: "1px solid rgba(240,232,216,0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg, #fff 0%, #fefcf9 100%)" },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: WINE, fontFamily: "var(--font-heading)", letterSpacing: -0.2 },
  sectionCount: { fontSize: 13, color: "#888", fontWeight: 500, background: "#f5f0eb", padding: "4px 12px", borderRadius: 20 },
  profileGrid: { display: "grid" },
  profileItem: { padding: "1.25rem 2rem", borderBottom: "1px solid #f5f0e8", borderRight: "1px solid #f5f0e8" },
  profileLabel: { fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, fontWeight: 600 },
  profileValue: { fontSize: 15, color: "#1a0a0a", fontWeight: 500 },
  semBlock: { borderBottom: "1px solid #f5f0e8", padding: "1.5rem 2rem", background: "#fafaf8" },
  semTitle: { fontSize: 14, fontWeight: 700, color: GOLD, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "var(--font-heading)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "10px 12px", fontSize: 11, color: "#888", fontWeight: 600, borderBottom: "2px solid #eee", textTransform: "uppercase", letterSpacing: 0.5 },
  td: { padding: "14px 12px", color: "#333", borderBottom: "1px solid #f5f5f5", fontWeight: 500 },
  emptyState: { textAlign: "center", padding: "4rem 2rem", color: "#888", fontSize: 15 },
  emptyIcon: { fontSize: 42, marginBottom: 16, opacity: 0.5 },
  emptySubtext: { fontSize: 13, marginTop: 6, color: "#aaa" },

  formOuter: { padding: "0" },
  formInfo: { background: `linear-gradient(135deg, rgba(114,47,55,0.06) 0%, rgba(184,150,46,0.04) 100%)`, border: `1px solid rgba(184,150,46,0.25)`, borderRadius: 12, padding: "14px 20px", fontSize: 14, color: WINE, marginBottom: 24, boxShadow: "0 4px 12px rgba(114,47,55,0.04)" },
  fieldLabel: { display: "block", fontSize: 13, color: "#444", marginBottom: 6, marginTop: 16, fontWeight: 600, letterSpacing: 0.3 },
  fieldError: { fontSize: 12, color: "#A32D2D", marginTop: 4, fontWeight: 500 },
  inputError: { border: "1.5px solid #A32D2D", background: "#FFF5F5" },
  input: { width: "100%", padding: "12px 16px", border: "1.5px solid #E0D0B0", borderRadius: 10, fontSize: 14, boxSizing: "border-box", transition: "all 0.2s ease", fontFamily: "var(--font-primary)", outline: "none", background: "#fafaf8" },
  select: { width: "100%", padding: "12px 16px", border: "1.5px solid #E0D0B0", borderRadius: 10, fontSize: 14, background: "#fafaf8", transition: "all 0.2s ease", fontFamily: "var(--font-primary)", outline: "none", color: "#333" },
  cardsRow: { display: "grid", gap: 16, margin: "16px 0 24px" },
  serviceCard: { border: "1.5px solid #E0D0B0", borderRadius: 12, padding: "1.25rem", textAlign: "center", cursor: "pointer", transition: "all 0.25s ease", background: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" },
  serviceCardActive: { border: `2px solid ${WINE}`, background: `linear-gradient(135deg, ${WINE} 0%, #5c262d 100%)`, boxShadow: "0 8px 24px rgba(114,47,55,0.3)", transform: "translateY(-4px)", display: "flex", flexDirection: "column", alignItems: "center" },
  cardIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#F5F5F5", color: "#666", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 16, transition: "all 0.3s ease", margin: "0 auto 16px" },
  cardIconActive: { backgroundColor: GOLD, color: "#fff" },
  cardLabel: { fontSize: 12, color: "#444", marginBottom: 8, lineHeight: 1.5, fontWeight: 500 },
  cardPrice: { fontSize: 15, fontWeight: 800, color: WINE },
  lettersGrid: { display: "grid", gap: 12, margin: "12px 0 24px" },
  letterRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: "1px solid #E0D0B0", borderRadius: 10, cursor: "pointer", transition: "all 0.2s ease", background: "#fafaf8" },
  letterLabel: { flex: 1, fontSize: 14, color: "#333", fontWeight: 500 },
  letterPrice: { fontSize: 14, color: WINE, fontWeight: 700 },
  totalRow: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16, marginTop: 24, paddingTop: 20, borderTop: "2px dashed rgba(184,150,46,0.4)" },
  totalLabel: { fontSize: 15, color: "#555", fontWeight: 600 },
  totalValue: { fontSize: 26, fontWeight: 800, color: WINE, fontFamily: "var(--font-heading)", letterSpacing: -0.5 },
  deliveryOptions: { display: "grid", gap: 12, marginBottom: 20 },
  deliveryOption: { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "#fff", border: "1.5px solid #e8d5b0", borderRadius: 12, cursor: "pointer", transition: "all 0.2s ease" },
  deliveryOptionActive: { background: `linear-gradient(135deg, ${WINE}08, ${WINE}02)`, borderColor: WINE, boxShadow: `0 0 0 2px ${WINE}15` },
  deliveryOptionLabel: { fontSize: 13, fontWeight: 600, color: "#333" },
  nameRow: { display: "grid", gap: 16, marginBottom: 10 },
  formGrid: { display: "grid", gap: 16 },
  summaryBox: { background: "linear-gradient(180deg, #fdfbf7 0%, #f9f6ef 100%)", border: "1px solid #e8d5b0", borderRadius: 12, padding: "1.5rem", marginTop: 32, boxShadow: "0 6px 16px rgba(184,150,46,0.06)" },
  summaryTitle: { fontSize: 15, fontWeight: 700, color: WINE, marginBottom: 16, borderBottom: "1px solid #e8d5b0", paddingBottom: 10, fontFamily: "var(--font-heading)" },
  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: 14, color: "#444", marginBottom: 10, fontWeight: 500 },
  summaryTotal: { display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: WINE, borderTop: "2px solid #e8d5b0", paddingTop: 16, marginTop: 10 },
  momoCard: { background: "#fff", border: "1px solid #e8d5b0", borderRadius: 16, padding: "2rem", marginBottom: 24, boxShadow: "0 8px 24px rgba(184,150,46,0.06)" },
  momoHeader: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  momoTitle: { fontSize: 18, fontWeight: 800, color: WINE, fontFamily: "var(--font-heading)" },
  momoSub: { fontSize: 13, color: "#888", marginTop: 2 },
  providers: { display: "flex", gap: 20, marginBottom: 8, flexWrap: "wrap", borderBottom: "1px solid #f0e8d8", paddingBottom: 16 },
  providerOption: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, padding: "8px 12px", borderRadius: 8, background: "#f9f6ef", border: "1px solid #e8d5b0", transition: "all 0.2s ease" },
  providerLabel: { color: "#333" },
  payTotal: { background: `linear-gradient(135deg, ${WINE} 0%, #4a1e24 100%)`, borderRadius: 12, padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, boxShadow: "0 8px 24px rgba(114,47,55,0.4)" },
  payTotalLabel: { color: "#fff", fontSize: 15, fontWeight: 500 },
  payTotalValue: { color: GOLD, fontSize: 26, fontWeight: 800, fontFamily: "var(--font-heading)" },
  payCard: { background: "#fff", border: "1px solid #e8d5b0", borderRadius: 16, padding: "2rem", marginBottom: 24, boxShadow: "0 8px 24px rgba(184,150,46,0.06)" },
  payCardHeader: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  payCardTitle: { fontSize: 18, fontWeight: 800, color: WINE, fontFamily: "var(--font-heading)" },
  payCardSub: { fontSize: 13, color: "#888", marginTop: 2 },
  payAmountBox: { background: `linear-gradient(135deg, ${WINE} 0%, #4a1e24 100%)`, borderRadius: 12, padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, boxShadow: "0 8px 24px rgba(114,47,55,0.4)" },
  payAmountLabel: { color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 500 },
  payAmountValue: { color: GOLD, fontSize: 26, fontWeight: 800, fontFamily: "var(--font-heading)" },
  payMethods: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 },
  payMethodItem: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#f9f6ef", border: "1px solid #e8d5b0", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#444" },
  payNote: { fontSize: 13, color: "#666", marginTop: 12, lineHeight: 1.6, fontStyle: "italic" },
  navRow: { display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(224,208,176,0.6)" },
  backBtn: { padding: "12px 28px", background: "#fff", border: `1.5px solid ${WINE}`, borderRadius: 10, fontSize: 15, cursor: "pointer", color: WINE, fontWeight: 600, transition: "all 0.2s ease" },
  submitBtn: { padding: "12px 32px", background: `linear-gradient(90deg, #8A3A44 0%, ${WINE} 100%)`, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 16px rgba(114,47,55,0.3)", transition: "all 0.2s ease", fontFamily: "var(--font-heading)", letterSpacing: 0.5 },
  error: { background: "#FCEBEB", border: "1px solid #F7C1C1", color: "#A32D2D", fontSize: 14, padding: "12px 16px", borderRadius: 8, marginTop: 16, fontWeight: 500 },
  /* ── CGPA Lookup ── */
  cgpaCard: { background: `linear-gradient(135deg, rgba(45,80,22,0.06) 0%, rgba(45,80,22,0.02) 100%)`, border: `1px solid rgba(45,80,22,0.2)`, borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, boxShadow: "0 4px 16px rgba(45,80,22,0.06)" },
  cgpaIcon: { fontSize: 28 },
  cgpaInfo: { flex: 1 },
  cgpaName: { fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 },
  cgpaMeta: { fontSize: 13, color: "#888" },
  cgpaValueWrap: { textAlign: "center", padding: "8px 20px", background: `linear-gradient(135deg, ${GREEN} 0%, #1a3a0e 100%)`, borderRadius: 10, boxShadow: "0 4px 12px rgba(45,80,22,0.2)" },
  cgpaLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 },
  cgpaValue: { fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "var(--font-heading)" },
  lookupBtn: { padding: "10px 18px", background: `linear-gradient(90deg, ${WINE} 0%, #5c262d 100%)`, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(114,47,55,0.2)", transition: "all 0.2s ease" },

  requestCard: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem 2rem", borderBottom: "1px solid #f5f0e8" },
  requestPurpose: { fontSize: 15, fontWeight: 600, color: "#1a0a0a", marginBottom: 6 },
  requestDate: { fontSize: 13, color: "#aaa" },
  requestCardRight: { display: "flex", alignItems: "center", gap: 16 },
  downloadBtn: { padding: "8px 20px", background: `linear-gradient(90deg, ${GREEN} 0%, #1a3a0e 100%)`, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(45,80,22,0.3)", transition: "all 0.2s ease" },
  success: { background: "rgba(45,80,22,0.1)", border: "1px solid rgba(99,153,34,0.3)", color: "#2D5016", fontSize: 14, padding: "12px 16px", borderRadius: 8, fontWeight: 500 },

  /* ── Profile Modal ── */
  modalOverlay: { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" },
  modalContent: { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90vh", overflow: "auto", boxShadow: "0 32px 64px rgba(0,0,0,0.3)" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #e8d5b0", background: "linear-gradient(135deg, #722F37 0%, #4a1e24 100%)" },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "var(--font-heading)" },
  modalClose: { background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "4px 8px" },
  modalBody: { padding: "1.5rem" },
} as const;
