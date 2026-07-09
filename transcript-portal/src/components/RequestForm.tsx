import { useState, useEffect } from "react";
import { post, get } from "../api";
import { WINE, GOLD, USTED_PROGRAMMES } from "../constants";

interface FormState {
  [key: string]: any;
  transcript_type: string; extra_copy: string; letters: string[];
  first_name: string; middle_name: string; surname: string;
  dob: string; index_number: string; level: string; programme: string;
  year_entry: string; year_completion: string; passport_number: string;
  address: string; telephone: string; delivery_method: string; pickup_location: string; delivery_email: string;
  country_code: string; payment_method: string; momo_number: string; momo_name: string;
}

export default function RequestForm({ student, onSubmitted }: { student: any; onSubmitted: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    transcript_type: "", extra_copy: "No", letters: [],
    first_name: "", middle_name: "", surname: "",
    dob: "", index_number: "", level: "", programme: "",
    year_entry: "", year_completion: "", passport_number: "",
    address: "", telephone: "", delivery_method: "", pickup_location: "", delivery_email: "",
    country_code: "+233", payment_method: "momo", momo_number: "", momo_name: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [prices, setPrices] = useState<any[]>([]);
  const [transcriptOptions, setTranscriptOptions] = useState([
    { label: "Undergraduate (Same day) within 24hrs", price: 69 },
    { label: "Undergraduate (2 days) / 48hrs", price: 46 },
    { label: "Undergraduate (One week)", price: 23 },
    { label: "Additional Copy", price: 12 },
    { label: "Postgraduate (Same day) within 24hrs", price: 104 },
    { label: "Postgraduate (2 days) / 48hrs", price: 69 },
    { label: "Postgraduate (One week)", price: 35 },
    { label: "Additional Copy (Postgraduate)", price: 18 },
    { label: "Transcript (Overseas)", price: 231 },
    { label: "Transcript Overseas (Self Postage)", price: 190 },
    { label: "Transcript Overseas (Email)", price: 120 },
    { label: "Certification (5 Copies)", price: 23 },
  ]);

  const [letterOptions, setLetterOptions] = useState([
    { label: "Proficiency in English", price: 18 },
    { label: "Attestation letter", price: 18 },
    { label: "Confirmation letter", price: 18 },
    { label: "Introductory letter (Visa)", price: 35 },
    { label: "Introductory letter (other purposes)", price: 18 },
  ]);

  useEffect(() => {
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
    fetchPrices();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    let { name, value } = e.target;
    
    if (["first_name", "middle_name", "surname", "momo_name"].includes(name)) {
      value = value.replace(/[^a-zA-Z\s]/g, "");
    }
    if (name === "telephone") {
      value = value.replace(/[^0-9]/g, "");
    }
    if (name === "country_code") {
      value = value.replace(/[^+0-9]/g, "");
    }
    if (["index_number", "momo_number", "year_entry", "year_completion"].includes(name)) {
      value = value.replace(/[^0-9]/g, "");
    }
    if (e.target.value !== value) e.target.value = value;
    
    setForm({ ...form, [name]: value });
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: "" });
  }

  function handleLetterToggle(letter: string) {
    const cur = form.letters;
    setForm({ ...form, letters: cur.includes(letter) ? cur.filter(l => l !== letter) : [...cur, letter] });
  }

  const transcriptPrice = transcriptOptions.find(o => o.label === form.transcript_type)?.price || 0;
  const extraCopyPrice = form.extra_copy === "Yes" ? (transcriptOptions.find(o => o.label === "Additional Copy")?.price || 12) : 0;
  const lettersPrice = form.letters.reduce((sum: number, l: string) => {
    const opt = letterOptions.find(o => o.label === l);
    return sum + (opt?.price || 0);
  }, 0);
  const total = transcriptPrice + extraCopyPrice + lettersPrice;

  const steps = ["Service & Request Type", "Academic Details", "Delivery Details", "Payment Confirmation"];

  function validateStep() {
    const errs: Record<string, string> = {};
    if (step === 2) {
      if (!form.first_name || form.first_name.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(form.first_name.trim())) errs.first_name = "Enter a valid first name (letters only, min 2 characters).";
      if (!form.surname || form.surname.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(form.surname.trim())) errs.surname = "Enter a valid surname (letters only, min 2 characters).";
      if (form.middle_name && !/^[a-zA-Z\s]+$/.test(form.middle_name.trim())) errs.middle_name = "Middle name should only contain letters.";
      if (!form.index_number || !/^\d{6,}$/.test(form.index_number)) errs.index_number = "Enter a valid index number (at least 6 digits).";
      if (!form.level) errs.level = "Select your level.";
      if (!form.dob) errs.dob = "Date of birth is required.";
      if (!form.programme) errs.programme = "Select or enter your programme.";
      if (form.year_entry && !/^\d{4}$/.test(form.year_entry)) errs.year_entry = "Enter a valid 4-digit year (e.g. 2021).";
      if (form.year_completion && !/^\d{4}$/.test(form.year_completion)) errs.year_completion = "Enter a valid 4-digit year (e.g. 2025).";
    }
    if (step === 3) {
      if (!form.delivery_method) errs.delivery_method = "Select a delivery method.";
      if (form.delivery_method === "pickup" && !form.pickup_location) errs.pickup_location = "Select a pickup location.";
      if (form.delivery_method === "email" && (!form.delivery_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.delivery_email))) errs.delivery_email = "Enter a valid email address.";
      if ((form.delivery_method === "postal" || form.delivery_method === "courier") && !form.address) errs.address = "Enter your delivery address.";
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
    setError("");
    setFieldErrors({});
    if (step === 1 && !form.transcript_type && form.letters.length === 0) {
      setError("Please select at least one transcript type or letter.");
      return;
    }
    if (!validateStep()) return;
    setStep(step + 1);
  }

  async function handlePaystackPayment() {
    setError("");
    setSubmitting(true);
    try {
      const init = await post('/student/requests/initialize-payment/', { amount: total });
      if (!init || !init.reference) {
        setError("Failed to initialize payment. Please try again.");
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
        onClose: () => { setSubmitting(false); setError("Payment cancelled. You can try again."); },
        callback: async function(response: any) {
          const result = await post('/student/requests/verify-and-create/', {
            reference: response.reference,
            purpose,
            notes,
            transcript_type: form.transcript_type,
            momo_name: form.momo_name,
            momo_number: form.momo_number,
            telephone: (form.country_code || "+233") + form.telephone.replace(/^0/, ""),
            address: form.address,
            total_amount: total,
          });
          if (!result) {
            setError("Payment was successful but we couldn't create your request. Please contact support.");
            setSubmitting(false);
            return;
          }
          setSuccess(true);
          setSubmitting(false);
          setTimeout(() => { if (onSubmitted) onSubmitted(); }, 3000);
        }
      });
      handler.openIframe();
    } catch (err: any) {
      setError("Payment failed: " + (err.message || "Unknown error"));
      setSubmitting(false);
    }
  }

  if (success) return (
    <div style={ss.successPage}>
      <div style={ss.successCircle}>✓</div>
      <h2 style={ss.successTitle}>Request Submitted!</h2>
      <p style={ss.successSub}>Your request has been sent to the Academic Affairs Directorate.</p>
      <p style={ss.successSub}>Total Amount: <strong>GH₵{total}.00</strong> — Please complete payment at the Finance Office.</p>
      {form.delivery_method && <p style={{ ...ss.successSub, marginTop: 8 }}>
        Delivery: <strong>{form.delivery_method === "pickup" ? `Pickup at ${form.pickup_location}` : form.delivery_method === "email" ? `Sent to ${form.delivery_email}` : form.delivery_method === "postal" ? `Posted to ${form.address}` : `Courier to ${form.address}`}</strong>
      </p>}
    </div>
  );

  return (
    <div style={ss.shell}>
      <div style={ss.sidebar}>
        <div style={ss.sidebarBranding}>
          <div style={ss.sidebarLogoContainer}>
             <svg viewBox="0 0 24 24" width="48" height="48" stroke={GOLD} strokeWidth="2" fill="none">
               <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
               <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path>
             </svg>
          </div>
          <div style={ss.sidebarTitle}>Academic Affairs<br/>Directorate</div>
        </div>
        <div style={ss.sidebarNote}>Please make sure you provide accurate details and complete all the steps.</div>
        <div style={ss.stepsList}>
          {steps.map((label, i) => {
            const num = i + 1;
            const active = step === num;
            const done = step > num;
            return (
              <div key={num} style={ss.stepItem}>
                <div style={{ ...ss.stepCircle, ...(done ? ss.stepDone : active ? ss.stepActive : ss.stepInactive) }}>
                  {done ? "✓" : num}
                </div>
                <div style={{ ...ss.stepLabel, ...(active ? ss.stepLabelActive : {}) }}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={ss.content}>
        {step === 1 && (
          <div className="fade-in">
            <div style={ss.stepHeader}>Select The Request & Service You Want</div>
            <div style={ss.stepSub}>Select one of the services below and click next step.</div>

            <div style={{ marginBottom: "25px" }}>
              <label className="form-label">Select Transcript Type</label>
              <select style={{...ss.input, width: "100%", marginTop: "8px"}} name="transcript_type" value={form.transcript_type} onChange={handleChange}>
                <option value="">-- Choose your transcript type --</option>
                {transcriptOptions.map(o => <option key={o.label} value={o.label}>{o.label} — GH₵{o.price}.00</option>)}
              </select>
            </div>

            <div className="cards-grid" style={ss.cardsGrid}>
              {transcriptOptions.map((opt, i) => {
                 const isActive = form.transcript_type === opt.label;
                 return (
                  <div
                    key={opt.label}
                    style={{ ...ss.serviceCard, ...(isActive ? ss.serviceCardActive : {}) }}
                    onClick={() => setForm({ ...form, transcript_type: opt.label })}
                  >
                    <div style={{ ...ss.cardIcon, ...(isActive ? ss.cardIconActive : {}) }}>
                      <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                        <path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/>
                      </svg>
                    </div>
                    <div style={ss.cardTitle}>{opt.label}</div>
                    <div style={ss.cardPrice}>GH₵{opt.price}.00</div>
                  </div>
                 );
              })}
            </div>

            <div style={ss.blockSpacer} />
            <h3 style={ss.sectionTitle}>Request For Additional Letters (Optional)</h3>
            <div className="letters-grid" style={ss.lettersGrid}>
              {letterOptions.map(o => (
                <label key={o.label} style={ss.letterLabel}>
                  <input type="checkbox" checked={form.letters.includes(o.label)} onChange={() => handleLetterToggle(o.label)} style={ss.checkbox} />
                  <span style={ss.letterText}>{o.label} — GH₵{o.price}.00</span>
                </label>
              ))}
            </div>

            <div style={ss.blockSpacer} />
            <div style={ss.errorContainer}>{error && <p style={ss.error}>{error}</p>}</div>
            <div style={ss.actions}>
              <div style={ss.totalWrap}>
                <span className="text-muted" style={{fontSize: 16, fontWeight: 500}}>Total Amount:</span>
                <span className="text-wine fw-800" style={{fontSize: 28}}>GH₵{total}.00</span>
              </div>
              <button className="btn btn-wine" onClick={nextStep}>Next Step ➔</button>
            </div>
          </div>
        )}

        {step === 2 && (
            <div className="fade-in">
            <div style={ss.stepHeader}>Academic Details</div>
            <div style={ss.stepSub}>Provide your academic and personal information.</div>

            <div className="form-grid-2" style={ss.inputGrid}>
              <div style={ss.inputGroup}>
                <label className="form-label">First Name *</label>
                <input style={{ ...ss.input, ...(fieldErrors.first_name ? ss.inputError : {}) }} name="first_name" value={form.first_name} onChange={handleChange} placeholder="Kwame" />
                {fieldErrors.first_name && <div className="field-error">{fieldErrors.first_name}</div>}
              </div>
              <div style={ss.inputGroup}>
                <label className="form-label">Middle Name</label>
                <input style={{ ...ss.input, ...(fieldErrors.middle_name ? ss.inputError : {}) }} name="middle_name" value={form.middle_name} onChange={handleChange} placeholder="Optional" />
                {fieldErrors.middle_name && <div className="field-error">{fieldErrors.middle_name}</div>}
              </div>
              <div style={ss.inputGroup}>
                <label className="form-label">Surname *</label>
                <input style={{ ...ss.input, ...(fieldErrors.surname ? ss.inputError : {}) }} name="surname" value={form.surname} onChange={handleChange} placeholder="Mensah" />
                {fieldErrors.surname && <div className="field-error">{fieldErrors.surname}</div>}
              </div>
              <div style={ss.inputGroup}>
                <label className="form-label">Date of Birth *</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input style={{ ...ss.input, flex: 1, ...(fieldErrors.dob ? ss.inputError : {}) }} type="date" name="dob" value={form.dob} onChange={handleChange} />
                  {form.dob && <span style={{ fontSize: 14, color: "#666", whiteSpace: "nowrap", fontWeight: 500 }}>
                    Age: {Math.floor((new Date().getTime() - new Date(form.dob).getTime()) / 31557600000)}
                  </span>}
                </div>
                {fieldErrors.dob && <div className="field-error">{fieldErrors.dob}</div>}
              </div>
              <div style={ss.inputGroup}>
                <label className="form-label">Index Number *</label>
                <input style={{ ...ss.input, ...(fieldErrors.index_number ? ss.inputError : {}) }} name="index_number" value={form.index_number} onChange={handleChange} placeholder="413999999" />
                {fieldErrors.index_number && <div className="field-error">{fieldErrors.index_number}</div>}
              </div>
              <div style={ss.inputGroup}>
                <label className="form-label">Level *</label>
                <select style={{ ...ss.input, ...(fieldErrors.level ? ss.inputError : {}) }} name="level" value={form.level} onChange={handleChange}>
                  <option value="">Select Level</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="300">300</option>
                  <option value="400">400</option>
                  <option value="Completed">Completed</option>
                </select>
                {fieldErrors.level && <div className="field-error">{fieldErrors.level}</div>}
              </div>
              <div style={ss.inputGroup}>
                <label className="form-label">Programme *</label>
                <input style={{ ...ss.input, ...(fieldErrors.programme ? ss.inputError : {}) }} name="programme" value={form.programme} onChange={handleChange} placeholder="Select or type your programme" list="prog-list" />
                <datalist id="prog-list">
                  {USTED_PROGRAMMES.map(p => <option key={p} value={p} />)}
                </datalist>
                {fieldErrors.programme && <div className="field-error">{fieldErrors.programme}</div>}
              </div>
              <div style={ss.inputGroup}>
                <label className="form-label">Passport Number</label>
                <input style={ss.input} name="passport_number" value={form.passport_number} onChange={handleChange} placeholder="For overseas requests" />
              </div>
              <div style={ss.inputGroup}>
                <label className="form-label">Year of Entry</label>
                <input style={{ ...ss.input, ...(fieldErrors.year_entry ? ss.inputError : {}) }} name="year_entry" value={form.year_entry} onChange={handleChange} placeholder="2019" />
                {fieldErrors.year_entry && <div className="field-error">{fieldErrors.year_entry}</div>}
              </div>
              <div style={ss.inputGroup}>
                <label className="form-label">Year of Completion</label>
                <input style={{ ...ss.input, ...(fieldErrors.year_completion ? ss.inputError : {}) }} name="year_completion" value={form.year_completion} onChange={handleChange} placeholder="2023" />
                {fieldErrors.year_completion && <div className="field-error">{fieldErrors.year_completion}</div>}
              </div>
            </div>

            <div style={ss.blockSpacer} />
            <div style={ss.errorContainer}>{error && <p style={ss.error}>{error}</p>}</div>
            <div style={ss.actions}>
              <button className="btn btn-wine-outline" onClick={() => setStep(step - 1)}>Go Back</button>
              <button className="btn btn-wine" onClick={nextStep}>Next Step ➔</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <div style={ss.stepHeader}>Delivery Details</div>
            <div style={ss.stepSub}>How would you like to receive your document?</div>

            <label className="form-label">Delivery Method *</label>
            <div className="delivery-options-grid" style={ss.deliveryOptions}>
              {[
                { value: "pickup", label: "Pickup from Campus", icon: "🏛️" },
                { value: "postal", label: "Postal Delivery", icon: "📮" },
                { value: "email", label: "Email (Soft Copy)", icon: "📧" },
                { value: "courier", label: "Courier Service", icon: "🚚" },
              ].map(opt => (
                <label key={opt.value} style={{ ...ss.deliveryOption, ...(form.delivery_method === opt.value ? ss.deliveryOptionActive : {}) }}>
                  <input type="radio" name="delivery_method" value={opt.value} checked={form.delivery_method === opt.value} onChange={handleChange} style={{ display: "none" }} />
                  <span style={{ fontSize: 24 }}>{opt.icon}</span>
                  <span style={ss.deliveryOptionLabel}>{opt.label}</span>
                </label>
              ))}
            </div>
            {fieldErrors.delivery_method && <div style={{ ...ss.fieldError, marginBottom: 12 }}>{fieldErrors.delivery_method}</div>}

            {form.delivery_method === "pickup" && (
              <div style={ss.inputGroup}>
                <label className="form-label">Preferred Pickup Location *</label>
                <select style={{ ...ss.input, ...(fieldErrors.pickup_location ? ss.inputError : {}) }} name="pickup_location" value={form.pickup_location} onChange={handleChange}>
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
              <div style={ss.inputGroup}>
                <label className="form-label">Email Address for Soft Copy *</label>
                <input style={{ ...ss.input, ...(fieldErrors.delivery_email ? ss.inputError : {}) }} type="email" name="delivery_email" value={form.delivery_email} onChange={handleChange} placeholder="your.email@example.com" />
                {fieldErrors.delivery_email && <div className="field-error">{fieldErrors.delivery_email}</div>}
              </div>
            )}

            {(form.delivery_method === "postal" || form.delivery_method === "courier") && (
              <div style={{ ...ss.inputGroup, gridColumn: "span 2" }}>
                <label className="form-label">Delivery Address *</label>
                <input style={{ ...ss.input, ...(fieldErrors.address ? ss.inputError : {}) }} name="address" value={form.address} onChange={handleChange} placeholder="Full postal address" />
                {fieldErrors.address && <div className="field-error">{fieldErrors.address}</div>}
              </div>
            )}

            <div className="form-grid-2" style={ss.inputGrid}>
              <div style={ss.inputGroup}>
                <label className="form-label">Telephone / Active WhatsApp *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select name="country_code" value={form.country_code} onChange={handleChange} style={{ ...ss.input, width: "auto", minWidth: 100, flexShrink: 0 }}>
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
                  <input style={{ ...ss.input, flex: 1, ...(fieldErrors.telephone ? ss.inputError : {}) }} name="telephone" value={form.telephone} onChange={handleChange} placeholder="24XXXXXXX" />
                </div>
                {fieldErrors.telephone && <div className="field-error">{fieldErrors.telephone}</div>}
              </div>
              <div style={ss.inputGroup}>
                <label className="form-label">Extra Copy Required?</label>
                <select style={ss.input} name="extra_copy" value={form.extra_copy} onChange={handleChange}>
                  <option value="No">No - Just One Copy</option>
                  <option value="Yes">Yes (+GH₵{transcriptOptions.find(o => o.label === "Additional Copy")?.price || 12}.00)</option>
                </select>
              </div>
            </div>

            <div style={ss.blockSpacer} />
            <div style={ss.errorContainer}>{error && <p style={ss.error}>{error}</p>}</div>
            <div style={ss.actions}>
              <button className="btn btn-wine-outline" onClick={() => setStep(step - 1)}>Go Back</button>
              <button className="btn btn-wine" onClick={nextStep}>Next Step ➔</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="fade-in">
            <div style={ss.stepHeader}>Payment Confirmation</div>
            <div style={ss.stepSub}>Complete your payment securely via Paystack.</div>

            <div style={ss.payCard}>
              <div style={ss.totalWrap}>
                <span className="text-muted" style={{fontSize: 16, fontWeight: 500}}>Total Due</span>
                <span className="text-wine fw-800" style={{fontSize: 28}}>GH₵{total}.00</span>
              </div>

              <div style={ss.payMethods}>
                <div style={ss.payMethodItem}><span>📱</span> MTN MoMo</div>
                <div style={ss.payMethodItem}><span>📱</span> Vodafone Cash</div>
                <div style={ss.payMethodItem}><span>📱</span> AirtelTigo Money</div>
                <div style={ss.payMethodItem}><span>💳</span> Visa / Mastercard</div>
              </div>

              <div style={{ textAlign: "center", padding: "1.5rem", background: "#F9F6EF", borderRadius: 12, border: "1px solid #E8D5B0" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
                <div style={{ fontSize: 14, color: "#666" }}>Secured by Paystack. Your payment information is encrypted and never stored by us.</div>
              </div>
            </div>

            <div style={ss.blockSpacer} />
            <div style={ss.errorContainer}>{error && <p style={ss.error}>{error}</p>}</div>
            <div style={ss.actions}>
              <button className="btn btn-wine-outline" onClick={() => setStep(step - 1)} disabled={submitting}>Go Back</button>
              <button className="btn btn-wine" onClick={handlePaystackPayment} disabled={submitting}>
                {submitting ? "Processing..." : `Pay GH₵${total}.00 Now`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ss = {
  shell: {
    display: "flex",
    minHeight: "80vh",
    backgroundColor: "#fff",
    borderRadius: "20px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
    overflow: "hidden",
    fontFamily: "'Inter', sans-serif"
  },
  sidebar: {
    width: "300px",
    backgroundColor: "#FAFAFA",
    padding: "40px",
    borderRight: "1px solid #EAEAEA",
    display: "flex",
    flexDirection: "column"
  },
  sidebarBranding: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "30px"
  },
  sidebarLogoContainer: {
    width: "60px",
    height: "60px",
    borderRadius: "15px",
    background: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
  },
  sidebarTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: WINE,
    lineHeight: "1.3"
  },
  sidebarNote: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "40px",
    lineHeight: "1.5"
  },
  stepsList: {
    display: "flex",
    flexDirection: "column",
    gap: "25px"
  },
  stepItem: {
    display: "flex",
    alignItems: "center",
    gap: "15px"
  },
  stepCircle: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.3s ease"
  },
  stepInactive: {
    backgroundColor: "#EAEAEA",
    color: "#999"
  },
  stepActive: {
    backgroundColor: GOLD,
    color: "#fff",
    boxShadow: `0 0 0 4px rgba(184, 150, 46, 0.2)`
  },
  stepDone: {
    backgroundColor: WINE,
    color: "#fff"
  },
  stepLabel: {
    fontSize: "15px",
    color: "#666",
    fontWeight: "500",
    transition: "color 0.3s ease"
  },
  stepLabelActive: {
    color: "#111",
    fontWeight: "600"
  },
  content: {
    flex: 1,
    padding: "50px 60px",
    display: "flex",
    flexDirection: "column"
  },
  deliveryOptions: { display: "grid", gap: 12, marginBottom: 24 },
  deliveryOption: { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "#fff", border: "1.5px solid #ddd", borderRadius: 12, cursor: "pointer", transition: "all 0.2s ease" },
  deliveryOptionActive: { background: `linear-gradient(135deg, ${WINE}08, ${WINE}02)`, borderColor: WINE, boxShadow: `0 0 0 2px ${WINE}15` },
  deliveryOptionLabel: { fontSize: 13, fontWeight: 600, color: "#333" },
  stepHeader: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#111",
    marginBottom: "10px",
    letterSpacing: "-0.5px"
  },
  stepSub: {
    fontSize: "16px",
    color: "#666",
    marginBottom: "40px"
  },
  cardsGrid: {
    display: "grid",
    gap: "20px",
    marginBottom: "20px"
  },
  serviceCard: {
    padding: "24px",
    borderRadius: "16px",
    border: "2px solid #EAEAEA",
    backgroundColor: "#fff",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "12px"
  },
  serviceCardActive: {
    borderColor: GOLD,
    backgroundColor: "#FFFDF5",
    transform: "translateY(-4px)",
    boxShadow: "0 10px 25px rgba(184, 150, 46, 0.15)"
  },
  cardIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "#F5F5F5",
    color: "#666",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    transition: "all 0.3s ease"
  },
  cardIconActive: {
    backgroundColor: GOLD,
    color: "#fff"
  },
  cardTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#222",
    lineHeight: "1.4"
  },
  cardPrice: {
    fontSize: "18px",
    fontWeight: "700",
    color: WINE,
    marginTop: "auto"
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#111",
    marginBottom: "20px"
  },
  lettersGrid: {
    display: "grid",
    gap: "15px"
  },
  letterLabel: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 20px",
    backgroundColor: "#FAFAFA",
    border: "1px solid #EAEAEA",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  checkbox: {
    width: "20px",
    height: "20px",
    accentColor: GOLD,
    cursor: "pointer"
  },
  letterText: {
    fontSize: "15px",
    color: "#333",
    fontWeight: "500"
  },
  inputGrid: {
    display: "grid",
    gap: "24px"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#444"
  },
  fieldError: { fontSize: 12, color: "#A32D2D", marginTop: 4, fontWeight: 500 },
  inputError: { border: "1.5px solid #A32D2D", background: "#FFF5F5" },
  input: {
    padding: "14px 18px",
    borderRadius: "12px",
    border: "1.5px solid #EAEAEA",
    fontSize: "15px",
    color: "#111",
    outline: "none",
    transition: "border-color 0.2s ease",
    backgroundColor: "#FAFAFA"
  },
  paymentBox: {
    backgroundColor: "#FAFAFA",
    border: "1.5px solid #EAEAEA",
    padding: "30px",
    borderRadius: "16px",
  },
  note: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "25px"
  },
  blockSpacer: {
    flex: 1,
    minHeight: "40px"
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "30px",
    borderTop: "1px solid #EAEAEA",
    marginTop: "auto"
  },
  btnPrimary: {
    backgroundColor: WINE,
    color: "#fff",
    border: "none",
    padding: "16px 32px",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s ease",
    boxShadow: "0 4px 12px rgba(114, 47, 55, 0.2)",
    marginLeft: "auto"
  },
  payCard: { marginBottom: 24 },
  payMethods: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 },
  payMethodItem: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#f9f6ef", border: "1px solid #e8d5b0", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#444" },
  btnSecondary: {
    backgroundColor: "#fff",
    color: "#444",
    border: "1.5px solid #EAEAEA",
    padding: "16px 32px",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  btnSubmit: {
    backgroundColor: GOLD,
    color: "#fff",
    border: "none",
    padding: "16px 36px",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s ease",
    boxShadow: "0 4px 12px rgba(184, 150, 46, 0.2)"
  },
  totalWrap: {
    display: "flex",
    alignItems: "baseline",
    gap: "12px"
  },
  totalLabel: {
    fontSize: "16px",
    color: "#666",
    fontWeight: "500"
  },
  totalValue: {
    fontSize: "28px",
    color: WINE,
    fontWeight: "800"
  },
  errorContainer: {
    minHeight: "24px",
    marginBottom: "10px"
  },
  error: {
    color: "#E53935",
    fontSize: "14px",
    fontWeight: "500",
    margin: 0
  },
  successPage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    backgroundColor: "#fff",
    borderRadius: "20px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.05)"
  },
  successCircle: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    backgroundColor: "#E8F5E9",
    color: "#4CAF50",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "40px",
    marginBottom: "24px"
  },
  successTitle: {
    fontSize: "32px",
    color: "#111",
    marginBottom: "16px"
  },
  successSub: {
    fontSize: "16px",
    color: "#666",
    marginBottom: "8px"
  }
} as const;