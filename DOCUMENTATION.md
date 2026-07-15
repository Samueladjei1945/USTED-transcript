# USTED Transcript Portal — Project Walkthrough

## 1. System Overview & Purpose

The **USTED Transcript Portal** is a web-based system developed for the **University of Education, Winneba — Department of Applied Mathematics (USTED)**. It digitizes and streamlines the process of requesting, processing, and delivering academic transcripts.

### Core Objectives

- Allow students to **request transcripts online** with a guided 5-step wizard
- Integrate **secure online payment** via Paystack (Mobile Money, Visa/Mastercard)
- Enable administrators to **manage, approve/reject, and track** all requests
- Generate **official PDF transcripts** offline with complete academic records
- Provide **real-time analytics** and **CSV export** for administrative reporting

### Key Features

| Feature | Description |
|---------|-------------|
| **Student Registration** | Self-registration with email verification |
| **JWT Authentication** | Token-based secure login with auto-refresh |
| **Profile Management** | Update index number, level; CGPA lookup |
| **5-Step Request Wizard** | Service selection → Academic details → Delivery → Confirmation → Payment |
| **Paystack Payment** | Secure payment with automatic verification |
| **Request Tracking** | Real-time status: Pending Payment → Pending Review → Under Review → Approved/Rejected → Completed |
| **PDF Transcript Generation** | Client-side PDF with branding, academic record, and verification ID |
| **Admin Dashboard** | Analytics, search, pagination, bulk actions, date filters, student drill-down |
| **CSV Export** | One-click export of requests and student records |
| **Email Notifications** | Registration confirmation, status updates, password reset |

---

## 2. Languages & Technologies

### Backend

| Technology | Purpose |
|------------|---------|
| **Python 3.13** | Core programming language |
| **Django 6.0.3** | Web framework |
| **Django REST Framework** | REST API layer |
| **SimpleJWT** | JWT authentication (access + refresh tokens) |
| **SQLite** | Development database |
| **Paystack API** | Payment gateway integration |
| **SMTP** | Email notifications |

### Frontend

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Type-safe JavaScript |
| **React 19** | UI component library |
| **Vite 8** | Build tool and dev server |
| **Bootstrap 5** | CSS framework (grid, utilities) |
| **jsPDF + jspdf-autotable** | Client-side PDF generation |
| **Recharts** | Analytics charts (bar, line) |
| **Paystack Popup** | In-browser payment iframe |

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React + Vite)            │
│  Localhost:5173                                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │Login/     │  │Student       │  │Admin          │  │
│  │Register   │  │Dashboard     │  │Dashboard      │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
│                      ↕ HTTP (JWT)                    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│               Backend (Django + DRF)                  │
│  Localhost:8000/api/                                  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │Auth Views│  │Student Views │  │Admin Views    │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
│                      ↕ ORM                            │
│              ┌──────────────────┐                     │
│              │    SQLite DB     │                     │
│              └──────────────────┘                     │
└──────────────────────────────────────────────────────┘
```

---

## 3. System Flowchart

```mermaid
flowchart TD
    A([Start]) --> B{Has Account?}
    B -->|No| C[Register]
    C --> D[Login]
    B -->|Yes| D
    D --> E{Valid Credentials?}
    E -->|No| D
    E -->|Yes| F{Check Role}
    F -->|Student| G[Student Dashboard]
    F -->|Admin| H[Admin Dashboard]
    
    G --> I{Choose Action}
    I -->|View Overview| J[Check Stats & Academic Record]
    I -->|Request Transcript| K[5-Step Request Wizard]
    I -->|View Requests| L[Track Request Status]
    
    K --> M[Step 1: Service & Type]
    M --> N[Step 2: Academic Details]
    N --> O[Step 3: Delivery Details]
    O --> P[Step 4: Confirmation Review]
    P --> Q[Step 5: Paystack Payment]
    Q --> R{Payment Successful?}
    R -->|No| Q
    R -->|Yes| S[Request Submitted - Pending Review]
    S --> L
    
    H --> T{Choose Action}
    T -->|Analytics| U[View Dashboard Stats]
    T -->|Manage Requests| V[Search, Filter, Bulk Actions]
    T -->|View Students| W[Search, Drill-down]
    
    V --> X[Start Review]
    X --> Y[Approve / Reject]
    Y --> Z[Email Notification to Student]
    Z --> AC{Approved?}
    AC -->|Yes| AD[Admin Uploads Final PDF]
    AD --> AA[Request Marked Completed]
    AC -->|No| AB[Student Sees Rejection Reason]
    
    AA --> L
```

---

## 4. UML Class Diagram

```mermaid
classDiagram
    class User {
        +int id
        +string password
        +string username
        +string email
        +authenticate()
    }
    
    class Student {
        +int id
        +string student_id
        +string name
        +string email
        +string year
        +decimal gpa
        +string status
        +datetime created_at
        +getProfile()
        +updateProfile()
    }
    
    class Admin {
        +int id
        +string name
        +string email
        +isAdmin(user)
    }
    
    class Semester {
        +int id
        +string name
        +datetime created_at
    }
    
    class Course {
        +int id
        +string code
        +string title
        +int credit
        +string grade
    }
    
    class TranscriptRequest {
        +int id
        +string purpose
        +string transcript_type
        +string momo_name
        +string momo_number
        +string telephone
        +string address
        +decimal total_amount
        +string notes
        +string payment_reference
        +string status
        +datetime created_at
        +datetime reviewed_at
        +string reviewed_by
        +getStatus()
        +approve()
        +reject()
    }
    
    class ServicePrice {
        +int id
        +string category
        +string label
        +decimal price
        +bool is_active
        +int order
    }
    
    class PasswordResetCode {
        +int id
        +uuid token
        +datetime created_at
        +is_expired()
    }
    
    User "1" -- "1" Student : linked
    User "1" -- "1" Admin : linked
    User "1" -- "*" PasswordResetCode : owns
    Student "1" -- "*" Semester : has
    Student "1" -- "*" TranscriptRequest : makes
    Semester "1" -- "*" Course : contains
```

### Frontend Component Hierarchy

```mermaid
classDiagram
    class App {
        -role: string|null
        -loading: bool
        +handleLogin()
        +handleLogout()
        +checkSession()
    }
    
    class Login {
        -username: string
        -password: string
        -loading: bool
        -showRegister: bool
        -showForgot: bool
        +onLogin(username, password)
    }
    
    class Register {
        -form: object
        -loading: bool
        -error: string
        -success: bool
        +onBack()
    }
    
    class StudentDashboard {
        -tab: string
        -student: object
        -requests: array
        -step: number
        -form: FormState
        -showProfileModal: bool
        +fetchData()
        +nextStep()
        +handlePaystackPayment()
        +lookupCgpa()
    }
    
    class AdminDashboard {
        -tab: string
        -requests: array
        -students: array
        -analytics: object
        -selectedReqs: Set
        +fetchAnalytics()
        +updateStatus()
        +handleBulkAction()
        +openDrill()
    }
    
    class ResetPassword {
        -token: string
        -password: string
        -confirm: string
        -loading: bool
        -success: bool
        -error: string
        +handleSubmit()
    }
    
    class api {
        +login(username, password)
        +logout()
        +get(path)
        +post(path, body)
        +patch(path, body)
        +refreshAccessToken()
    }
    
    App --> Login : renders
    App --> StudentDashboard : renders (student role)
    App --> AdminDashboard : renders (admin role)
    App --> ResetPassword : renders (hash route)
    Login --> Register : renders
    Login --> api : calls
    StudentDashboard --> api : calls
    AdminDashboard --> api : calls
```

---

## 5. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o| Student : has
    User ||--o| Admin : has
    User ||--o{ PasswordResetCode : owns
    Student ||--o{ Semester : enrolls
    Student ||--o{ TranscriptRequest : submits
    Semester ||--o{ Course : includes
    
    User {
        int id PK
        varchar password
        varchar username UK
        varchar email UK
        boolean is_active
    }
    
    Student {
        int id PK
        int user_id FK UK
        varchar student_id UK
        varchar name
        varchar email UK
        varchar year
        decimal gpa
        varchar status
        datetime created_at
    }
    
    Admin {
        int id PK
        int user_id FK UK
        varchar name
        varchar email UK
    }
    
    PasswordResetCode {
        int id PK
        int user_id FK
        uuid token UK
        datetime created_at
    }
    
    Semester {
        int id PK
        int student_id FK
        varchar name
        datetime created_at
    }
    
    Course {
        int id PK
        int semester_id FK
        varchar code
        varchar title
        int credit
        varchar grade
    }
    
    TranscriptRequest {
        int id PK
        int student_id FK
        varchar purpose
        varchar transcript_type
        varchar momo_name
        varchar momo_number
        varchar telephone
        text address
        decimal total_amount
        text notes
        varchar payment_reference
        varchar status
        datetime created_at
        datetime reviewed_at
        varchar reviewed_by
    }
    
    ServicePrice {
        int id PK
        varchar category
        varchar label
        decimal price
        boolean is_active
        int order
    }
```

---

## 6. Use Case Diagram

```mermaid
flowchart TD
    subgraph Student[Student Actor]
        S1[Register Account]
        S2[Login / Authenticate]
        S3[View Profile / Update Index]
        S4[Lookup CGPA]
        S5[Submit Transcript Request]
        S6[Make Payment via Paystack]
        S7[Track Request Status]
        S8[Download Approved PDF]
        S9[Reset Password]
    end
    
    subgraph Admin[Admin Actor]
        A1[Login / Authenticate]
        A2[View Analytics Dashboard]
        A3[Search & Filter Requests]
        A4[Approve / Reject Requests]
        A5[Bulk Update Request Status]
        A6[View Student Details]
        A7[Export CSV Data]
        A8[Generate PDF for Student]
    end
    
    subgraph System[System Boundaries]
        Sys1[Send Email Notifications]
        Sys2[Process Payments]
        Sys3[Generate PDF Transcripts]
        Sys4[Validate JWT Tokens]
        Sys5[Manage Database]
    end
    
    Student --- S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8 & S9
    Admin --- A1 & A2 & A3 & A4 & A5 & A6 & A7 & A8
    S6 -.-> Sys2
    S8 -.-> Sys3
    A4 & A8 -.-> Sys1
    S1 & S9 -.-> Sys1
    S2 -.-> Sys4
    Sys5 --- Sys1 & Sys2 & Sys3 & Sys4
```

### Use Case Narrative

| Actor | Use Case | Description |
|-------|----------|-------------|
| Student | Register Account | Creates account with name, email, password |
| Student | Login | Authenticates via JWT (email + password) |
| Student | Submit Request | 5-step wizard: type, details, delivery, confirmation, payment |
| Student | Make Payment | Paystack checkout: MoMo or card |
| Student | Track Requests | View status (Pending Payment, Pending, Approved, Rejected) |
| Student | Download PDF | Download official transcript for approved requests |
| Admin | Manage Requests | Search, filter, approve/reject, bulk actions |
| Admin | View Analytics | Stats, charts, trends |
| Admin | Export Data | CSV download of requests or students |
| System | Send Email | Confirmations, status updates, password resets |

---

## 7. Context Diagram (DFD Level 0)

```mermaid
flowchart LR
    subgraph ExternalEntities
        Student([Student])
        Admin([Admin])
        Paystack([Paystack API])
        Email([Email Server])
    end
    
    subgraph System[USTED Transcript Portal]
        TP[Transcript Processing System]
    end
    
    Student <-->|"Login Credentials\nRequests\nPayments\nProfile Updates"| TP
    TP -->|"Status Updates\nPDF Transcripts\nConfirmation Emails"| Student
    
    Admin <-->|"Login Credentials\nManagement Actions\nFilters/Searches"| TP
    TP -->|"Analytics\nExported Data\nStudent Info"| Admin
    
    TP <-->|"Payment Initialization\nPayment Verification"| Paystack
    
    TP -->|"Welcome Email\nStatus Notification\nReset Code"| Email
```

---

## 8. Data Flow Diagram (DFD Level 1)

```mermaid
flowchart TD
    Student([Student])
    Admin([Admin])
    Paystack([Paystack])
    Email([Email Server])
    
    subgraph System[USTED Transcript Portal]
        Auth[1.0 Authentication]
        Profile[2.0 Profile Management]
        Request[3.0 Request Processing]
        Payment[4.0 Payment Handling]
        AdminMod[5.0 Admin Management]
        Report[6.0 Reporting]
        
        DB[(Database)]
    end
    
    Student -->|Credentials| Auth
    Auth -->|JWT Token| Student
    Auth <-->|Verify| DB
    
    Student -->|Update Info| Profile
    Profile <-->|Read/Write| DB
    Profile -->|CGPA Request| Profile
    
    Student -->|Request Details| Request
    Request <-->|CRUD| DB
    Request -->|Confirmation| Student
    
    Request -->|Payment Init| Payment
    Payment <-->|Initialize/Verify| Paystack
    Payment -->|Status| Request
    Payment -->|Payment Ref| DB
    
    Admin -->|Management Actions| AdminMod
    AdminMod <-->|Read/Update| DB
    AdminMod -->|Status Change Email| Email
    
    Admin -->|Export Request| Report
    Report <-->|Read| DB
    Report -->|CSV / PDF| Admin
    
    Request -->|Status Email| Email
    Auth -->|Reset Email| Email
    
    Email -->|Deliver| Student
    Email -->|Deliver| Admin
```

---

## 9. Activity Diagram — Request Submission Flow

```mermaid
stateDiagram-v2
    [*] --> Login
    Login --> Dashboard
    
    state Dashboard {
        [*] --> Overview
        Overview --> RequestTranscript
        RequestTranscript --> MyRequests
        MyRequests --> Overview
    }
    
    Dashboard --> SelectService : "Click Request Transcript"
    
    state RequestWizard {
        [*] --> Step1_Service
        Step1_Service --> Step2_Academic : "Next →"
        Step2_Academic --> Step3_Delivery : "Next →"
        Step3_Delivery --> Step4_Confirmation : "Next →"
        Step4_Confirmation --> Step5_Payment : "Proceed to Payment →"
        Step5_Payment --> PaymentProcessing : "Pay Now"
        Step4_Confirmation --> Step3_Delivery : "← Back"
        Step3_Delivery --> Step2_Academic : "← Back"
        Step2_Academic --> Step1_Service : "← Back"
        Step5_Payment --> Step4_Confirmation : "← Back"
    }
    
    state Step1_Service {
        [*] --> ChooseTranscriptType
        ChooseTranscriptType --> SelectExtraCopy
        SelectExtraCopy --> PickLetters
        PickLetters --> Validate
        Validate --> [*]
    }
    
    state Step5_Payment {
        [*] --> ReviewTotal
        ReviewTotal --> PaystackPopup
        PaystackPopup --> VerifyPayment
        VerifyPayment --> [*]
    }
    
    PaymentProcessing --> RequestSubmitted : "Success"
    PaymentProcessing --> Step5_Payment : "Failed/Cancelled"
    
    RequestSubmitted --> [*] : "Redirect to My Requests"
    
    state MyRequests {
        [*] --> PendingPayment
        PendingPayment --> Pending : "Admin marks Paid"
        Pending --> Approved : "Admin approves"
        Pending --> Rejected : "Admin rejects"
        Approved --> DownloadPDF
        DownloadPDF --> [*]
    }
```

---

## 10. Sequence Diagrams

### 10.1 Login & Authentication Flow

```mermaid
sequenceDiagram
    actor Student
    participant Login as Login Component
    participant App as App Root
    participant API as API Layer (api.ts)
    participant Backend as Django Backend
    participant DB as Database
    
    Student->>Login: Enter email & password
    Login->>App: handleLogin(username, password)
    App->>API: login(username, password)
    API->>Backend: POST /api/token/
    Backend->>DB: Verify credentials
    DB-->>Backend: User found
    Backend-->>API: {access_token, refresh_token}
    API->>API: Store tokens in localStorage
    API-->>App: success = true
    App->>API: GET /api/role/
    API->>Backend: GET /api/role/ (with Bearer token)
    Backend-->>API: {role: "student", name: "..."}
    API-->>App: data
    App->>App: setRole("student")
    App-->>Student: Render StudentDashboard
    Note over Student,App: Session persists with auto-refresh
    API->>Backend: POST /api/token/refresh/ (when expired)
    Backend-->>API: New access_token
```

### 10.2 Payment & Request Submission Flow

```mermaid
sequenceDiagram
    actor Student
    participant SD as StudentDashboard
    participant API as API Layer
    participant Backend as Django Backend
    participant Paystack as Paystack API
    
    Note over Student,Paystack: Step 5 — Payment
    Student->>SD: Click "Pay GH₵X.00 Now"
    SD->>API: post("/student/requests/initialize-payment/", {amount})
    API->>Backend: POST /api/student/requests/initialize-payment/
    Backend->>Paystack: POST /transaction/initialize
    Paystack-->>Backend: {reference, access_code, authorization_url}
    Backend-->>API: {reference, access_code, authorization_url}
    API-->>SD: {reference, ...}
    SD->>Paystack: PaystackPop.setup({key, email, amount, ref})
    Paystack-->>Student: Open payment iframe
    Student->>Paystack: Complete payment (MoMo/Card)
    Paystack-->>SD: callback(response)
    SD->>API: post("/student/requests/verify-and-create/", {reference, purpose, notes, ...})
    API->>Backend: POST /api/student/requests/verify-and-create/
    Backend->>Paystack: GET /transaction/verify/{reference}
    Paystack-->>Backend: {status: "success", ...}
    Backend->>Backend: Create TranscriptRequest record
    Backend-->>API: {id, status: "Pending", ...}
    API-->>SD: Request created
    SD->>SD: Show success message, reset form
    SD->>SD: Redirect to My Requests tab
    Backend-->>Student: Confirmation email sent
```

### 10.3 Admin Approval Flow

```mermaid
sequenceDiagram
    actor Admin
    participant AD as AdminDashboard
    participant API as API Layer
    participant Backend as Django Backend
    participant DB as Database
    participant Email as Email Server
    actor Student
    
    Admin->>AD: Click Approve on request
    AD->>API: patch("/admin/requests/{id}/status/", {status: "Approved"})
    API->>Backend: PATCH /api/admin/requests/{id}/status/
    Backend->>DB: Update status, set reviewed_at, reviewed_by
    DB-->>Backend: Success
    Backend->>Email: Send approval email to student
    Email-->>Student: "Your transcript request has been approved"
    Backend-->>API: {status: "Approved", ...}
    API-->>AD: Updated request
    AD->>AD: Refresh request list
    Student->>StudentDashboard: View My Requests
    StudentDashboard-->>Student: Status shows "Approved" with Download button
    Student->>StudentDashboard: Click "Download PDF"
    StudentDashboard->>StudentDashboard: generatePDF(student, semesters, reqId)
    StudentDashboard-->>Student: Official_Transcript_{id}.pdf
```

---

## 11. API Endpoint Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/token/` | No | Obtain JWT access + refresh tokens |
| POST | `/api/token/refresh/` | No | Refresh expired access token |
| GET | `/api/role/` | Yes | Get current user's role (student/admin) |

### Student Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/register/` | No | Create new student account |
| GET | `/api/student/profile/` | Yes | Get full profile + academic record |
| PATCH | `/api/student/profile/update/` | Yes | Update index number and level |
| GET | `/api/student/requests/` | Yes | List all student requests |
| POST | `/api/student/requests/initialize-payment/` | Yes | Initialize Paystack payment |
| POST | `/api/student/requests/verify-and-create/` | Yes | Verify payment and create request |
| GET | `/api/student/cgpa/{student_id}/` | Yes | Lookup CGPA by index number |

### Admin Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/analytics/` | Yes | Dashboard stats and charts data |
| GET | `/api/admin/requests/` | Yes | List all requests (search, filter, paginate) |
| PATCH | `/api/admin/requests/{id}/status/` | Yes | Update single request status |
| POST | `/api/admin/requests/bulk-status/` | Yes | Bulk update request statuses |
| GET | `/api/admin/requests/export/` | Yes | Export requests as CSV |
| GET | `/api/admin/students/` | Yes | List all students (search, paginate) |
| GET | `/api/admin/students/{id}/` | Yes | Get student detail + requests |
| GET | `/api/admin/students/export/` | Yes | Export students as CSV |

### Public Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/prices/` | No | List all active service prices |
| POST | `/api/password-reset/` | No | Request password reset email |
| POST | `/api/password-reset/confirm/` | No | Reset password with token |

---

## 12. Database Schema (SQLite)

```sql
-- Core tables (managed by Django ORM)

CREATE TABLE core_student (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES auth_user(id),
    student_id VARCHAR(20) UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    year VARCHAR(20),
    gpa DECIMAL(4,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE core_admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES auth_user(id),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE
);

CREATE TABLE core_semester (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES core_student(id),
    name VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE core_course (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_id INTEGER NOT NULL REFERENCES core_semester(id),
    code VARCHAR(20) NOT NULL,
    title VARCHAR(100) NOT NULL,
    credit INTEGER NOT NULL,
    grade VARCHAR(5) NOT NULL
);

CREATE TABLE core_transcriptrequest (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES core_student(id),
    purpose VARCHAR(100) NOT NULL,
    transcript_type VARCHAR(200) DEFAULT '',
    momo_name VARCHAR(100) DEFAULT '',
    momo_number VARCHAR(50) DEFAULT '',
    telephone VARCHAR(50) DEFAULT '',
    address TEXT DEFAULT '',
    total_amount DECIMAL(8,2) DEFAULT 0.00,
    notes TEXT DEFAULT '',
    payment_reference VARCHAR(100) DEFAULT '',
    status VARCHAR(20) DEFAULT 'Pending Payment',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    reviewed_by VARCHAR(100) DEFAULT ''
);

CREATE TABLE core_serviceprice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category VARCHAR(20) NOT NULL,
    label VARCHAR(200) NOT NULL,
    price DECIMAL(8,2) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    "order" INTEGER DEFAULT 0
);
```
