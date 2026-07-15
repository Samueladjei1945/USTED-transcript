import { useState, useEffect, useCallback } from "react";
import { get, patch, post, uploadFile } from "../api";
import { generatePDF } from "../utils/generatePDF";
import { WINE, GREEN } from "../constants";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const statCards = [
  { key: "total_requests", label: "Total Requests", color: WINE },
  { key: "pending", label: "Pending Approval", color: "#EF9F27" },
  { key: "approved", label: "Approved", color: GREEN },
  { key: "rejected", label: "Rejected", color: "#A32D2D" },
  { key: "total_students", label: "Registered Students", color: "#5B7DB1" },
  { key: "requests_today", label: "Requests Today", color: "#8B5CF6" },
];

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState("overview");
  const [requests, setRequests] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Requests: search, filter, pagination
  const [reqSearch, setReqSearch] = useState("");
  const [reqFilter, setReqFilter] = useState("all");
  const [reqPage, setReqPage] = useState(1);
  const [reqTotal, setReqTotal] = useState(0);
  const [reqPageSize] = useState(25);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Students: search, pagination
  const [stuSearch, setStuSearch] = useState("");
  const [stuPage, setStuPage] = useState(1);
  const [stuTotal, setStuTotal] = useState(0);
  const [stuPageSize] = useState(25);

  // Bulk selection
  const [selectedReqs, setSelectedReqs] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("Approved");

  // Detail modal
  const [detailReq, setDetailReq] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  // Student drill-down
  const [drillStudent, setDrillStudent] = useState<any>(null);

  // Tickets / Complaints
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("all");
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [ticketPageSize] = useState(25);
  const [detailTicket, setDetailTicket] = useState<any>(null);
  const [respondText, setRespondText] = useState("");
  const [respondStatus, setRespondStatus] = useState("");

  useEffect(() => { Promise.all([fetchAnalytics(), fetchRequests(), fetchStudents()]).then(() => setLoading(false)); }, []);

  function queryParams(params: Record<string, string | number>) {
    return Object.entries(params)
      .filter(([_, v]) => v !== "" && v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&");
  }

  async function fetchAnalytics() {
    try {
      const an = await get('/admin/analytics/');
      setAnalytics(an || null);
    } catch {}
  }

  async function fetchRequests() {
    try {
      const params: Record<string, any> = { page: reqPage, page_size: reqPageSize };
      if (reqSearch) params.search = reqSearch;
      if (reqFilter !== "all") params.status = reqFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const data = await get(`/admin/requests/?${queryParams(params)}`);
      if (data) {
        setRequests(data.results || []);
        setReqTotal(data.total || 0);
      }
    } catch {}
  }

  async function fetchStudents() {
    try {
      const params: Record<string, any> = { page: stuPage, page_size: stuPageSize };
      if (stuSearch) params.search = stuSearch;
      const data = await get(`/admin/students/?${queryParams(params)}`);
      if (data) {
        setStudents(data.results || []);
        setStuTotal(data.total || 0);
      }
    } catch {}
  }

  async function fetchTickets() {
    try {
      const params: Record<string, any> = { page: ticketPage, page_size: ticketPageSize };
      if (ticketSearch) params.search = ticketSearch;
      if (ticketStatusFilter && ticketStatusFilter !== "all") params.status = ticketStatusFilter;
      const data = await get(`/admin/tickets/?${queryParams(params)}`);
      if (data) {
        setTickets(data.results || []);
        setTicketTotal(data.total || 0);
      }
    } catch {}
  }

  async function respondToTicket(ticketId: number) {
    const payload: Record<string, string> = {};
    if (respondText) payload.admin_response = respondText;
    if (respondStatus) payload.status = respondStatus;
    const result = await patch(`/admin/tickets/${ticketId}/respond/`, payload);
    if (result) {
      fetchTickets();
      setDetailTicket(result);
      setRespondText("");
      setRespondStatus("");
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchAnalytics(), fetchRequests(), fetchStudents(), fetchTickets()]);
    setRefreshing(false);
  }

  // Fetch tickets when tab becomes "complaints" or filters change
  useEffect(() => { if (tab === "complaints") fetchTickets(); }, [tab, ticketPage, ticketSearch, ticketStatusFilter]);

  async function updateStatus(reqId: number, status: string) {
    await patch(`/admin/requests/${reqId}/status/`, { status });
    fetchRequests();
    fetchAnalytics();
  }

  async function handleBulkAction() {
    if (selectedReqs.size === 0) return;
    await post('/admin/requests/bulk-status/', { ids: Array.from(selectedReqs), status: bulkStatus });
    setSelectedReqs(new Set());
    fetchRequests();
    fetchAnalytics();
  }

  function toggleSelect(id: number) {
    setSelectedReqs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedReqs.size === requests.length) {
      setSelectedReqs(new Set());
    } else {
      setSelectedReqs(new Set(requests.map((r: any) => r.id)));
    }
  }

  async function downloadCSV(path: string, filename: string) {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch {}
  }

  function handleGeneratePDF(req: any) {
    const student = students.find((s: any) => s.student_id && s.student_id === req.student_id);
    if (student) generatePDF(student, student.semesters || [], req.id);
  }

  async function handleUploadDocument(reqId: number) {
    const fileInput = document.getElementById(`file-upload-${reqId}`) as HTMLInputElement;
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    if (!file.name.toLowerCase().endsWith('.pdf')) { alert('Only PDF files are allowed.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('File size must be under 10MB.'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('document', file);
    const result = await uploadFile(`/admin/requests/${reqId}/upload-document/`, fd);
    setUploading(false);
    if (result) {
      setDetailReq(result);
      fetchRequests();
    } else {
      alert('Upload failed. Ensure the request is approved and try again.');
    }
    fileInput.value = '';
  }

  function openDetail(req: any) {
    setDetailReq(req);
  }

  async function openDrill(studentId: number) {
    try {
      const data = await get(`/admin/students/${studentId}/`);
      setDrillStudent(data || null);
    } catch {}
  }

  function Pagination({ page, total, pageSize, setPage }: { page: number; total: number; pageSize: number; setPage: (p: number) => void }) {
    const pages = Math.ceil(total / pageSize);
    if (pages <= 1) return null;
    return (
      <div className="d-flex justify-content-center align-items-center gap-2 mt-3">
        <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ borderRadius: 8 }}>← Prev</button>
        <span className="small text-muted px-2">Page {page} of {pages} ({total} total)</span>
        <button className="btn btn-outline-secondary btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)} style={{ borderRadius: 8 }}>Next →</button>
      </div>
    );
  }

  if (loading) return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="skeleton skeleton-title" style={{ width: "150px", marginBottom: 0 }} />
        <div className="skeleton" style={{ width: "80px", height: "32px", borderRadius: "8px" }} />
      </div>
      <div className="stats-grid mb-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: "100px", borderRadius: "16px" }} />)}</div>
      <div className="skeleton skeleton-card" style={{ height: "300px", borderRadius: "16px" }} />
    </div>
  );

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 1400 }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold m-0" style={{ color: WINE }}>USTED <span style={{ color: "#888", fontWeight: 500 }}>Admin</span></h3>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: 8, fontSize: 13 }} onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
          <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: 8, fontSize: 13 }} onClick={onLogout}>Sign Out</button>
        </div>
      </div>

      <div className="d-flex gap-2 mb-4 flex-wrap">
        {[["overview", "Overview"], ["requests", "Transcript Requests"], ["students", "Student Records"], ["complaints", "Complaints"]].map(([key, label]) => (
          <button key={key}
            className={`btn ${tab === key ? '' : 'btn-outline-secondary'}`}
            style={tab === key ? { background: WINE, color: "#fff", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600 } : { borderRadius: 8, fontSize: 13, fontWeight: 500, border: "1px solid #ddd", color: "#555" }}
            onClick={() => { setTab(key); if (key !== "overview") setDrillStudent(null); }}
          >{label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && analytics && (
        <>
          <div className="stats-grid mb-4">
            {statCards.map(s => (
              <div key={s.key} className="stat-card" style={{ borderTopColor: s.color }}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{analytics[s.key] ?? 0}</div>
              </div>
            ))}
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6">
              <div className="card shadow-sm h-100" style={{ borderRadius: 16, border: "1px solid rgba(224,208,176,0.6)" }}>
                <div className="card-body p-3 p-md-4">
                  <h6 className="fw-bold mb-3" style={{ color: WINE }}>Status Breakdown</h6>
                  <div className="d-flex flex-column gap-2">
                    {[["Pending Payment", "#FAC775", analytics.pending_payment], ["Pending Approval", "#EF9F27", analytics.pending], ["Approved", "#C0DD97", analytics.approved], ["Rejected", "#F7C1C1", analytics.rejected]].map(([label, color, count]) => (
                      <div key={label} className="d-flex justify-content-between align-items-center p-2 rounded" style={{ background: `${color}25` }}>
                        <span className="small fw-semibold">{label}</span>
                        <span className="badge rounded-pill" style={{ background: color, color: "#333" }}>{count || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="card shadow-sm h-100" style={{ borderRadius: 16, border: "1px solid rgba(224,208,176,0.6)" }}>
                <div className="card-body p-3 p-md-4">
                  <h6 className="fw-bold mb-3" style={{ color: WINE }}>Recent Activity</h6>
                  {analytics.recent_requests?.length === 0 && <p className="text-muted small">No recent requests.</p>}
                  {analytics.recent_requests?.map((r: any) => (
                    <div key={r.id} className="d-flex justify-content-between align-items-center py-2 border-bottom" style={{ borderColor: "#f0e8d8" }}>
                      <div className="small">
                        <span className="fw-semibold">{r.student_name}</span>
                        <span className="text-muted ms-1">{r.purpose?.slice(0, 30)}</span>
                      </div>
                      <span className="badge rounded-pill" style={{
                        background: r.status === "Approved" ? "#EAF3DE" : r.status === "Rejected" ? "#FCEBEB" : "#FAEEDA",
                        color: r.status === "Approved" ? "#3B6D11" : r.status === "Rejected" ? "#A32D2D" : "#854F0B",
                        fontSize: 11,
                      }}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6">
              <div className="card shadow-sm h-100" style={{ borderRadius: 16, border: "1px solid rgba(224,208,176,0.6)" }}>
                <div className="card-body p-3 p-md-4">
                  <h6 className="fw-bold mb-3" style={{ color: WINE }}>Weekly Trend</h6>
                  {analytics.weekly_trend?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={analytics.weekly_trend}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill={WINE} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-muted small">No data yet.</p>}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="card shadow-sm h-100" style={{ borderRadius: 16, border: "1px solid rgba(224,208,176,0.6)" }}>
                <div className="card-body p-3 p-md-4">
                  <h6 className="fw-bold mb-3" style={{ color: WINE }}>Monthly Trend</h6>
                  {analytics.monthly_trend?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={analytics.monthly_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0e8d8" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke={GREEN} strokeWidth={2} dot={{ fill: GREEN, r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p className="text-muted small">No data yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── REQUESTS ── */}
      {tab === "requests" && !drillStudent && (
        <div className="card shadow-sm" style={{ borderRadius: 16, border: "1px solid rgba(224,208,176,0.6)" }}>
          <div className="card-body p-3 p-md-4">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h6 className="fw-bold m-0" style={{ color: WINE }}>Transcript Requests</h6>
              <button className="btn btn-sm text-white" style={{ background: GREEN, borderRadius: 8, fontSize: 12 }} onClick={() => downloadCSV('/admin/requests/export/', 'transcript_requests.csv')}>Export CSV</button>
            </div>

            {/* Search + Filters */}
            <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
              <input className="form-control form-control-sm" style={{ width: 220, borderRadius: 8 }} placeholder="Search name, ID, purpose..." value={reqSearch} onChange={e => { setReqSearch(e.target.value); setReqPage(1); }} />
              <select className="form-select form-select-sm" style={{ width: "auto", borderRadius: 8 }} value={reqFilter} onChange={e => { setReqFilter(e.target.value); setReqPage(1); }}>
                {["all", "Pending Payment", "Pending", "Approved", "Rejected"].map(f => <option key={f} value={f}>{f === "all" ? "All statuses" : f}</option>)}
              </select>
              <input type="date" className="form-control form-control-sm" style={{ width: "auto", borderRadius: 8 }} value={dateFrom} onChange={e => { setDateFrom(e.target.value); setReqPage(1); }} title="From date" />
              <input type="date" className="form-control form-control-sm" style={{ width: "auto", borderRadius: 8 }} value={dateTo} onChange={e => { setDateTo(e.target.value); setReqPage(1); }} title="To date" />
            </div>

            {/* Bulk actions */}
            {selectedReqs.size > 0 && (
              <div className="d-flex align-items-center gap-2 mb-3 p-2 rounded" style={{ background: `${WINE}10`, border: `1px solid ${WINE}30` }}>
                <span className="small fw-semibold me-2">{selectedReqs.size} selected</span>
                <select className="form-select form-select-sm" style={{ width: "auto", borderRadius: 8 }} value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
                  <option value="Approved">Approve</option>
                  <option value="Rejected">Reject</option>
                  <option value="Pending">Mark Pending</option>
                </select>
                <button className="btn btn-sm text-white" style={{ background: WINE, borderRadius: 8, fontSize: 12 }} onClick={handleBulkAction}>Apply</button>
                <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8, fontSize: 12 }} onClick={() => setSelectedReqs(new Set())}>Clear</button>
              </div>
            )}

            {requests.length === 0 && <p className="text-muted small">No requests found.</p>}
            {requests.length > 0 && (
              <>
                <div className="table-responsive-wrap">
                  <table className="table align-middle mb-0" style={{ fontSize: 14 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}><input type="checkbox" checked={selectedReqs.size === requests.length && requests.length > 0} onChange={toggleSelectAll} style={{ accentColor: WINE }} /></th>
                        {["Student", "ID", "Details", "Amount", "Date", "Status", "Actions"].map(h => <th key={h} className="table-thead-th" style={{ background: "#f8f6f2" }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map(r => (
                        <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => openDetail(r)}>
                          <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedReqs.has(r.id)} onChange={() => toggleSelect(r.id)} style={{ accentColor: WINE }} /></td>
                          <td className="table-tbody-td fw-semibold">{r.student_name}</td>
                          <td className="table-tbody-td text-muted">{r.student_id}</td>
                          <td className="table-tbody-td">
                            <div className="fw-semibold" style={{ color: WINE, marginBottom: 4 }}>{r.transcript_type || r.purpose}</div>
                            {r.address && <div className="small text-muted"><strong>Dest:</strong> {r.address}</div>}
                            {r.telephone && <div className="small text-muted"><strong>Tel:</strong> {r.telephone}</div>}
                          </td>
                          <td className="table-tbody-td fw-bold">GH₵{r.total_amount || "0.00"}</td>
                          <td className="table-tbody-td text-muted">{r.created_at?.slice(0, 10)}</td>
                          <td className="table-tbody-td">
                            <span className="badge-status" style={badgeStyle(r.status)}>{r.status}</span>
                            {(r.notes || "").includes("[SIMULATION]") && <span className="badge rounded-pill ms-1" style={{ background: "#FAEEDA", color: "#854F0B", fontSize: 10, padding: "2px 6px", fontWeight: 600, border: "1px solid #FAC775" }}>🧪</span>}
                          </td>
                          <td className="table-tbody-td" onClick={e => e.stopPropagation()}>
                            {r.status === "Pending" && (
                              <div className="d-flex gap-2 flex-wrap">
                                <button className="btn btn-sm text-white" style={{ background: "#3B6D11", borderRadius: 8, fontSize: 12 }} onClick={() => updateStatus(r.id, "Approved")}>Approve</button>
                                <button className="btn btn-sm text-white" style={{ background: "#A32D2D", borderRadius: 8, fontSize: 12 }} onClick={() => updateStatus(r.id, "Rejected")}>Reject</button>
                              </div>
                            )}
                            {r.status === "Approved" && <button className="btn btn-outline-primary btn-sm" style={{ borderRadius: 8, fontSize: 12 }} onClick={() => handleGeneratePDF(r)}>PDF</button>}
                            {r.status === "Pending Payment" && (
                              <button className="btn btn-sm text-white" style={{ background: "#5B7DB1", borderRadius: 8, fontSize: 12 }} onClick={() => updateStatus(r.id, "Pending")}>Mark Paid</button>
                            )}
                            {r.status === "Rejected" && <span className="text-muted small">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={reqPage} total={reqTotal} pageSize={reqPageSize} setPage={setReqPage} />
              </>
            )}
          </div>
        </div>
      )}

      {/* ── STUDENTS ── */}
      {tab === "students" && !drillStudent && (
        <div className="card shadow-sm" style={{ borderRadius: 16, border: "1px solid rgba(224,208,176,0.6)" }}>
          <div className="card-body p-3 p-md-4">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h6 className="fw-bold m-0" style={{ color: WINE }}>Student Records</h6>
              <button className="btn btn-sm text-white" style={{ background: GREEN, borderRadius: 8, fontSize: 12 }} onClick={() => downloadCSV('/admin/students/export/', 'students.csv')}>Export CSV</button>
            </div>

            <div className="d-flex mb-3">
              <input className="form-control form-control-sm" style={{ width: 280, borderRadius: 8 }} placeholder="Search name, ID, email..." value={stuSearch} onChange={e => { setStuSearch(e.target.value); setStuPage(1); }} />
            </div>

            {students.length === 0 && <p className="text-muted small">No students found.</p>}
            {students.length > 0 && (
              <>
                <div className="table-responsive-wrap">
                  <table className="table align-middle mb-0" style={{ fontSize: 14 }}>
                    <thead><tr>{["ID", "Name", "Email", "Year", "GPA", "Requests", "Status"].map(h => <th key={h} className="table-thead-th" style={{ background: "#f8f6f2" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {students.map((s: any) => (
                        <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => openDrill(s.id)}>
                          <td className="table-tbody-td fw-semibold">{s.student_id}</td>
                          <td className="table-tbody-td">{s.name}</td>
                          <td className="table-tbody-td text-muted">{s.email}</td>
                          <td className="table-tbody-td">{s.year}</td>
                          <td className="table-tbody-td fw-semibold">{s.gpa}</td>
                          <td className="table-tbody-td"><span className="badge rounded-pill" style={{ background: `${WINE}15`, color: WINE, fontWeight: 600 }}>{s.request_count || 0}</span></td>
                          <td className="table-tbody-td"><span className="badge-status" style={badgeStyle("Approved")}>{s.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={stuPage} total={stuTotal} pageSize={stuPageSize} setPage={setStuPage} />
              </>
            )}
          </div>
        </div>
      )}

      {/* ── DRILL-DOWN ── */}
      {drillStudent && (
        <div>
          <button className="btn btn-outline-secondary btn-sm mb-3" style={{ borderRadius: 8 }} onClick={() => setDrillStudent(null)}>← Back to student list</button>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <div className="card shadow-sm h-100" style={{ borderRadius: 16, border: "1px solid rgba(224,208,176,0.6)" }}>
                <div className="card-body p-3 p-md-4">
                  <h6 className="fw-bold mb-3" style={{ color: WINE }}>Student Profile</h6>
                  {drillStudent.profile && (
                    <div className="d-flex flex-column gap-2">
                      <div><span className="text-muted small">Name</span><div className="fw-semibold">{drillStudent.profile.name}</div></div>
                      <div><span className="text-muted small">Student ID</span><div className="fw-semibold">{drillStudent.profile.student_id || "N/A"}</div></div>
                      <div><span className="text-muted small">Email</span><div>{drillStudent.profile.email}</div></div>
                      <div><span className="text-muted small">Year / Level</span><div>{drillStudent.profile.year || "N/A"}</div></div>
                      <div><span className="text-muted small">CGPA</span><div className="fw-bold" style={{ color: GREEN }}>{drillStudent.profile.gpa || "—"}</div></div>
                      <div><span className="text-muted small">Status</span><div><span className="badge-status" style={badgeStyle("Approved")}>{drillStudent.profile.status}</span></div></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-8">
              <div className="card shadow-sm h-100" style={{ borderRadius: 16, border: "1px solid rgba(224,208,176,0.6)" }}>
                <div className="card-body p-3 p-md-4">
                  <h6 className="fw-bold mb-3" style={{ color: WINE }}>Request History ({drillStudent.requests?.length || 0})</h6>
                  {(!drillStudent.requests || drillStudent.requests.length === 0) && <p className="text-muted small">No requests yet.</p>}
                  {drillStudent.requests?.map((r: any) => (
                    <div key={r.id} className="d-flex justify-content-between align-items-center py-2 border-bottom" style={{ borderColor: "#f0e8d8" }}>
                      <div className="small">
                        <div className="fw-semibold">{r.transcript_type || r.purpose}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>{r.created_at?.slice(0, 10)} · GH₵{r.total_amount}</div>
                      </div>
                      <span className="badge-status" style={badgeStyle(r.status)}>{r.status}</span>
                      {(r.notes || "").includes("[SIMULATION]") && <span className="badge rounded-pill ms-1" style={{ background: "#FAEEDA", color: "#854F0B", fontSize: 10, padding: "2px 6px", fontWeight: 600, border: "1px solid #FAC775" }}>🧪</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Academic record */}
          {drillStudent.profile?.semesters && drillStudent.profile.semesters.length > 0 && (
            <div className="card shadow-sm" style={{ borderRadius: 16, border: "1px solid rgba(224,208,176,0.6)" }}>
              <div className="card-body p-3 p-md-4">
                <h6 className="fw-bold mb-3" style={{ color: WINE }}>Academic Record</h6>
                {drillStudent.profile.semesters.map((sem: any) => (
                  <div key={sem.id} className="mb-3">
                    <div className="fw-semibold mb-2 text-gold text-uppercase" style={{ fontSize: 13, letterSpacing: 0.5 }}>{sem.name}</div>
                    <div className="table-responsive">
                      <table className="table table-borderless table-sm mb-0" style={{ fontSize: 13 }}>
                        <thead><tr>{["Code", "Course", "Credits", "Grade"].map(h => <th key={h} className="table-thead-th">{h}</th>)}</tr></thead>
                        <tbody>{sem.courses.map((c: any) => (
                          <tr key={c.id}>
                            <td className="table-tbody-td">{c.code}</td>
                            <td className="table-tbody-td">{c.title}</td>
                            <td className="table-tbody-td">{c.credit}</td>
                            <td className="table-tbody-td"><span style={{ color: gradeColor(c.grade), fontWeight: 600 }}>{c.grade}</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COMPLAINTS ── */}
      {tab === "complaints" && (
        <div className="card shadow-sm" style={{ borderRadius: 16, border: "1px solid rgba(224,208,176,0.6)" }}>
          <div className="card-body p-3 p-md-4">
            <h6 className="fw-bold mb-3" style={{ color: WINE }}>Student Complaints / Tickets</h6>

            <div className="d-flex mb-3 gap-2 flex-wrap">
              <input className="form-control form-control-sm" style={{ width: 260, borderRadius: 8 }} placeholder="Search subject, student name/ID..." value={ticketSearch} onChange={e => { setTicketSearch(e.target.value); setTicketPage(1); }} />
              <select className="form-select form-select-sm" style={{ width: 160, borderRadius: 8 }} value={ticketStatusFilter} onChange={e => { setTicketStatusFilter(e.target.value); setTicketPage(1); }}>
                <option value="all">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {tickets.length === 0 && <p className="text-muted small">No tickets found.</p>}
            {tickets.length > 0 && (
              <>
                <div className="table-responsive-wrap">
                  <table className="table align-middle mb-0" style={{ fontSize: 14 }}>
                    <thead><tr>{["Subject", "Student", "Status", "Submitted", "Response"].map(h => <th key={h} className="table-thead-th" style={{ background: "#f8f6f2" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {tickets.map((t: any) => (
                        <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => { setDetailTicket(t); setRespondText(""); setRespondStatus(""); }}>
                          <td className="table-tbody-td fw-semibold">{t.subject}</td>
                          <td className="table-tbody-td">{t.student_name}<br/><span className="text-muted" style={{ fontSize: 12 }}>{t.student_id}</span></td>
                          <td className="table-tbody-td"><span className="badge rounded-pill" style={{ background: t.status === "Open" ? "#FAEEDA" : t.status === "In Progress" ? "#E3EEF9" : t.status === "Resolved" ? "#EAF3DE" : "#EAEAEA", color: t.status === "Open" ? "#854F0B" : t.status === "In Progress" ? "#185FA5" : t.status === "Resolved" ? "#3B6D11" : "#666", fontWeight: 600 }}>{t.status}</span></td>
                          <td className="table-tbody-td text-muted" style={{ fontSize: 13 }}>{t.created_at?.slice(0, 10)}</td>
                          <td className="table-tbody-td" style={{ fontSize: 13 }}>{t.admin_response ? `${t.admin_response.slice(0, 40)}${t.admin_response.length > 40 ? "…" : ""}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={ticketPage} total={ticketTotal} pageSize={ticketPageSize} setPage={setTicketPage} />
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TICKET DETAIL MODAL ── */}
      {detailTicket && (
        <div className="modal d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDetailTicket(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: 16, border: "none", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid #f0e8d8" }}>
                <h6 className="modal-title fw-bold" style={{ color: WINE }}>Ticket Details</h6>
                <button className="btn-close" onClick={() => setDetailTicket(null)} />
              </div>
              <div className="modal-body">
                <div className="d-flex flex-column gap-3">
                  <div className="row g-2">
                    <div className="col-12">
                      <span className="text-muted small">Subject</span>
                      <div className="fw-semibold" style={{ fontSize: 16 }}>{detailTicket.subject}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">Student</span>
                      <div className="fw-semibold">{detailTicket.student_name}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">Student ID</span>
                      <div>{detailTicket.student_id}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">Status</span>
                      <div><span className="badge rounded-pill" style={{ background: detailTicket.status === "Open" ? "#FAEEDA" : detailTicket.status === "In Progress" ? "#E3EEF9" : detailTicket.status === "Resolved" ? "#EAF3DE" : "#EAEAEA", color: detailTicket.status === "Open" ? "#854F0B" : detailTicket.status === "In Progress" ? "#185FA5" : detailTicket.status === "Resolved" ? "#3B6D11" : "#666", fontWeight: 600 }}>{detailTicket.status}</span></div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">Submitted</span>
                      <div>{detailTicket.created_at?.slice(0, 10)}</div>
                    </div>
                    <div className="col-12">
                      <span className="text-muted small">Message</span>
                      <div style={{ background: "#faf8f4", padding: "12px 14px", borderRadius: 8, fontSize: 14, whiteSpace: "pre-wrap", border: "1px solid #e8d5b0" }}>{detailTicket.message}</div>
                    </div>
                    {detailTicket.admin_response && (
                      <div className="col-12">
                        <span className="text-muted small">Admin Response</span>
                        <div style={{ background: "rgba(45,80,22,0.06)", padding: "12px 14px", borderRadius: 8, fontSize: 14, borderLeft: "3px solid #3B6D11" }}>
                          {detailTicket.admin_response}
                          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{detailTicket.responded_by} &middot; {detailTicket.responded_at ? new Date(detailTicket.responded_at).toLocaleDateString() : ""}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <hr style={{ borderColor: "#e8d5b0" }} />
                  <h6 className="fw-bold" style={{ color: WINE, fontSize: 14 }}>Respond</h6>
                  <div className="d-flex flex-column gap-2">
                    <select className="form-select form-select-sm" style={{ width: 200, borderRadius: 8 }} value={respondStatus} onChange={e => setRespondStatus(e.target.value)}>
                      <option value="">Keep current status</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <textarea className="form-control" rows={3} placeholder="Write your response..." value={respondText} onChange={e => setRespondText(e.target.value)} style={{ borderRadius: 8, fontSize: 14, resize: "vertical" }} />
                    <div>
                      <button className="btn btn-sm text-white" style={{ background: WINE, borderRadius: 8 }} onClick={() => respondToTicket(detailTicket.id)} disabled={!respondText && !respondStatus}>Send Response</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: "1px solid #f0e8d8" }}>
                <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => setDetailTicket(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {detailReq && (
        <div className="modal d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDetailReq(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: 16, border: "none", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid #f0e8d8" }}>
                <h6 className="modal-title fw-bold" style={{ color: WINE }}>Request Details</h6>
                <button className="btn-close" onClick={() => setDetailReq(null)} />
              </div>
              <div className="modal-body">
                <div className="d-flex flex-column gap-3">
                  <div className="row g-2">
                    <div className="col-6"><span className="text-muted small">Student</span><div className="fw-semibold">{detailReq.student_name}</div></div>
                    <div className="col-6"><span className="text-muted small">Student ID</span><div className="fw-semibold">{detailReq.student_id}</div></div>
                    <div className="col-6"><span className="text-muted small">Transcript Type</span><div>{detailReq.transcript_type || "—"}</div></div>
                    <div className="col-6"><span className="text-muted small">Purpose</span><div>{detailReq.purpose}</div></div>
                    <div className="col-6"><span className="text-muted small">Amount</span><div className="fw-bold">GH₵{detailReq.total_amount || "0.00"}</div></div>
                    <div className="col-6"><span className="text-muted small">Status</span><div><span className="badge-status" style={badgeStyle(detailReq.status)}>{detailReq.status}</span>{(detailReq.notes || "").includes("[SIMULATION]") && <span className="badge rounded-pill ms-1" style={{ background: "#FAEEDA", color: "#854F0B", fontSize: 10, padding: "2px 6px", fontWeight: 600, border: "1px solid #FAC775" }}>🧪 Sim</span>}</div></div>
                    <div className="col-6"><span className="text-muted small">Submitted</span><div>{detailReq.created_at?.slice(0, 10)}</div></div>
                    <div className="col-6"><span className="text-muted small">Reviewed</span><div>{detailReq.reviewed_at ? detailReq.reviewed_at.slice(0, 10) : "—"}</div></div>
                    <div className="col-6"><span className="text-muted small">Telephone</span><div>{detailReq.telephone || "—"}</div></div>
                    <div className="col-6"><span className="text-muted small">Payment Ref</span><div style={{ fontSize: 12 }}>{detailReq.payment_reference || "—"}</div></div>
                    <div className="col-12"><span className="text-muted small">Delivery Address</span><div>{detailReq.address || "—"}</div></div>
                    {detailReq.notes && <div className="col-12"><span className="text-muted small">Notes</span><div style={{ whiteSpace: "pre-wrap" }}>{detailReq.notes}</div></div>}
                    <div className="col-12"><span className="text-muted small">Document</span><div>{detailReq.document ? <a href={detailReq.document} target="_blank" rel="noopener noreferrer" style={{ color: "#3B6D11" }}>View uploaded file</a> : "Not uploaded"}</div></div>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: "1px solid #f0e8d8" }}>
                {detailReq.status === "Pending" && (
                  <div className="d-flex gap-2 ms-auto">
                    <button className="btn btn-sm text-white" style={{ background: "#3B6D11", borderRadius: 8 }} onClick={() => { updateStatus(detailReq.id, "Approved"); setDetailReq(null); }}>Approve</button>
                    <button className="btn btn-sm text-white" style={{ background: "#A32D2D", borderRadius: 8 }} onClick={() => { updateStatus(detailReq.id, "Rejected"); setDetailReq(null); }}>Reject</button>
                  </div>
                )}
                {detailReq.status === "Approved" && (
                  <div className="d-flex gap-2 ms-auto flex-wrap align-items-center">
                    {detailReq.document && (
                      <a className="btn btn-sm text-white" style={{ background: "#3B6D11", borderRadius: 8 }} href={detailReq.document} target="_blank" rel="noopener noreferrer">Download Document</a>
                    )}
                    <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 8 }} onClick={() => { handleGeneratePDF(detailReq); setDetailReq(null); }}>PDF (auto)</button>
                    <label className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1 }}>
                      {uploading ? "Uploading..." : detailReq.document ? "Replace Document" : "Upload Document"}
                      <input id={`file-upload-${detailReq.id}`} type="file" accept=".pdf" hidden disabled={uploading} onChange={() => handleUploadDocument(detailReq.id)} />
                    </label>
                  </div>
                )}
                <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => setDetailReq(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const badgeColors: Record<string, { background: string; color: string; border: string }> = {
  "Pending Payment": { background: "#FFF0E0", color: "#B85C00", border: "1px solid #FFD6A8" },
  Pending: { background: "#FAEEDA", color: "#854F0B", border: "1px solid #FAC775" },
  Approved: { background: "#EAF3DE", color: "#3B6D11", border: "1px solid #C0DD97" },
  Rejected: { background: "#FCEBEB", color: "#A32D2D", border: "1px solid #F7C1C1" },
};

function badgeStyle(status: string): React.CSSProperties {
  return { ...(badgeColors[status] || badgeColors.Pending), fontSize: 12, padding: "4px 12px", borderRadius: 20, fontWeight: 600, display: "inline-block", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" };
}

function gradeColor(grade: string): string {
  const g = grade?.charAt(0);
  return g === "A" ? "#3B6D11" : g === "B" ? "#185FA5" : g === "C" ? "#854F0B" : "#A32D2D";
}
