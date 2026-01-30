# CareBoks - AI Communication Tool for Cardiac Patients

A proof-of-concept tool that transforms complex technical clinical notes into clear, personalised, patient-friendly explanations of cardiac conditions.

## 🎯 Project Vision

CareBoks adapts medical content to patient attributes (age, sex, health literacy, comorbidities, language, etc.) and ensures clinical safety via mandatory clinician approval before communication.

**Supported Languages:** Estonian, Russian, English

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                  │
├─────────────────────────────────────────────────────────────────┤
│  Pages                    │  Components                          │
│  ├── Landing.tsx          │  ├── TechnicalNoteInput.tsx         │
│  ├── Auth.tsx             │  ├── PatientProfile.tsx             │
│  ├── Index.tsx (Main)     │  ├── ClinicianApproval.tsx          │
│  ├── Account.tsx          │  ├── FinalOutput.tsx                │
│  └── NotFound.tsx         │  └── ui/ (shadcn components)        │
├─────────────────────────────────────────────────────────────────┤
│                      Backend (Lovable Cloud)                     │
├─────────────────────────────────────────────────────────────────┤
│  Edge Functions                                                  │
│  ├── generate-patient-document-v2  (AI document generation)    │
│  ├── regenerate-section            (Single section regeneration)│
│  └── extract-text-from-document    (OCR/PDF text extraction)   │
├─────────────────────────────────────────────────────────────────┤
│  Database Tables                                                 │
│  ├── profiles              (User accounts)                      │
│  ├── patient_cases         (Case management)                    │
│  ├── patient_profiles      (Patient attributes)                 │
│  ├── ai_analyses           (AI-generated drafts)                │
│  ├── approvals             (Clinician approvals)                │
│  ├── clinician_contacts    (Contact directory)                  │
│  └── user_documents        (Uploaded files)                     │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
src/
├── assets/                  # Static images and logos
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── account/             # Account management sections
│   ├── TechnicalNoteInput   # Step 1: Note input with OCR
│   ├── PatientProfile       # Step 2: Patient attributes
│   ├── ClinicianApproval    # Step 3: AI review & approval
│   ├── FinalOutput          # Step 4: Print & teach-back
│   ├── SectionBox           # Reusable content section
│   ├── RichTextEditor       # TipTap-based editor
│   └── MedicalHeader        # Navigation header
├── hooks/
│   ├── useCasePersistence   # Database CRUD operations
│   └── use-toast            # Toast notifications
├── integrations/
│   └── supabase/            # Auto-generated Supabase client
├── pages/
│   ├── Index.tsx            # Main 4-step workflow
│   ├── Landing.tsx          # Public landing page
│   ├── Auth.tsx             # Authentication
│   ├── Account.tsx          # User settings
│   └── NotFound.tsx         # 404 page
├── utils/
│   ├── draftParser          # V1 markdown parsing
│   ├── structuredDocumentParser # V2 JSON parsing
│   ├── pdfTextExtraction    # Native PDF text extraction
│   └── pdfToImages          # PDF to images for OCR
└── lib/
    └── utils.ts             # Tailwind utilities

supabase/
└── functions/
    ├── generate-patient-document-v2/
    │   ├── index.ts         # Main handler
    │   ├── prompts.ts       # AI prompt templates
    │   └── validation.ts    # Input validation
    ├── regenerate-section/
    │   └── index.ts         # Section regeneration
    └── extract-text-from-document/
        └── index.ts         # OCR processing
```

## 🔄 Application Workflow

### 4-Step Document Generation Process

1. **Technical Note Input** (`TechnicalNoteInput.tsx`)
   - Paste clinical notes or upload PDF/images
   - Automatic OCR for scanned documents
   - Creates a new patient case in database

2. **Patient Profile** (`PatientProfile.tsx`)
   - Collect patient attributes for personalisation
   - Age, sex, language, health literacy
   - Journey type, comorbidities, accessibility needs

3. **Clinician Approval** (`ClinicianApproval.tsx`)
   - AI generates personalised patient document
   - 6 structured sections with rich text editing
   - Section-by-section regeneration capability
   - Mandatory clinician review and approval

4. **Final Output** (`FinalOutput.tsx`)
   - Print-ready A4 document
   - Teach-back comprehension questions
   - Case completion and archiving

## 📊 Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts with name, email, role, language |
| `patient_cases` | Case tracking with status workflow |
| `patient_profiles` | Patient attributes linked to cases |
| `ai_analyses` | Stored AI drafts and analysis data |
| `approvals` | Clinician approval records with audit trail |
| `clinician_contacts` | Hospital contact directory |
| `user_documents` | Uploaded file metadata |

### Case Status Flow
```
draft → processing → pending_approval → approved → completed
```

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Rich Text:** TipTap editor
- **Backend:** Lovable Cloud (Supabase)
- **AI:** IBM granite-4-h-small & meta-llama/llama-3-2-11b-vision-instruct via IBM Wotson prompt lab.
- **PDF Processing:** pdf.js, OCR via edge functions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Environment Variables

The following variables are automatically configured by Lovable Cloud:

- `VITE_SUPABASE_URL` - Backend API URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Public API key
- `VITE_SUPABASE_PROJECT_ID` - Project identifier

## 🔐 Security Features

- **Row Level Security (RLS)** on all tables
- Users can only access their own cases and data
- Clinician approval required before patient communication
- Audit trail for all approvals
- No unapproved outputs reach patients

## 📝 Output Document Sections

The AI generates 6 personalised sections:

1. **What do I have** - Plain-language diagnosis explanation
2. **How should I live next** - Lifestyle changes and physical activity
3. **Next 6 months** - Short-term recovery expectations
4. **What it means for my life** - Long-term consequences
5. **My medications** - Drug list with purpose and importance
6. **My contacts** - Relevant hospital contacts

## 🎨 Design System

Uses semantic Tailwind tokens defined in `index.css`:

- `--background`, `--foreground` - Base colors
- `--primary`, `--secondary` - Brand colors
- `--muted`, `--accent` - Supporting colors
- `--destructive` - Error/warning states

## 📚 Key Dependencies

| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` | Backend client |
| `@tanstack/react-query` | Data fetching |
| `@tiptap/react` | Rich text editing |
| `pdfjs-dist` | PDF text extraction |
| `lucide-react` | Icons |
| `sonner` | Toast notifications |

## 🔗 Links

- **Preview:** https://id-preview--423bb879-b2c1-4d85-a117-0bbe70a9ea66.lovable.app
- **Published:** https://careboks.lovable.app
- **Lovable Project:** https://lovable.dev/projects/423bb879-b2c1-4d85-a117-0bbe70a9ea66

## 📄 License

This project is a proof-of-concept for healthcare communication improvement.
