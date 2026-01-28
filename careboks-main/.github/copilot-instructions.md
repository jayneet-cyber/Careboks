# CareBoks Copilot Instructions

## Project Overview
CareBoks is an AI-powered medical communication tool that transforms complex cardiac clinical notes into personalized, patient-friendly explanations. It enforces a mandatory 4-step workflow with clinical approval gates.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Edge Functions via Deno)
- **AI**: Lovable/Claude API with tool calling for structured JSON output
- **Build**: Bun (lockfile), not npm
- **Styling**: TailwindCSS via Radix UI components (no custom CSS)

## Architecture Essentials

### Core 4-Step Workflow (Data Flow)
```
1. TechnicalNoteInput → Creates patient_case, optionally extracts text via OCR
2. PatientProfile → Collects personalization attributes (age, language, literacy, comorbidities)
3. AIProcessing (hidden step) → Calls generate-patient-document-v2 edge function
4. ClinicianApproval → Mandatory human review before final output
5. FinalOutput → Print/teach-back delivery
```

### Critical Files Structure
- **Main workflow**: [src/pages/Index.tsx](src/pages/Index.tsx) - Manages step state and data threading
- **AI generation**: [supabase/functions/generate-patient-document-v2/](supabase/functions/generate-patient-document-v2/) - Single-stage API (V1 pipeline deprecated, removed from production)
- **Database layer**: [src/hooks/useCasePersistence.ts](src/hooks/useCasePersistence.ts) - All CRUD ops scoped by RLS to authenticated user
- **Section parsing**: [src/utils/structuredDocumentParser.ts](src/utils/structuredDocumentParser.ts) - Converts JSON output to `Section[]` type
- **Text extraction**: [supabase/functions/extract-text-from-document/index.ts](supabase/functions/extract-text-from-document/index.ts) - OCR wrapper

### Key Design Patterns

#### 1. State Threading in Index.tsx
Data flows down as props, callbacks flow up. State variables to track:
- `currentStep` - Controls which component renders
- `technicalNote`, `patientData` - Persist across workflow
- `aiDraft`, `aiSections` - Both exist: text version for storage, structured for rendering
- `approvedSections` - Final approved content

#### 2. Structured Document Format (V2 Only)
Edge function returns JSON with 7 sections. Parse via `parseStructuredDocument()` to get `Section[]`:
```typescript
interface Section {
  title: string;
  type: 'introduction' | 'explanation' | 'treatment' | 'lifestyle' | 'monitoring' | 'risks' | 'summary';
  content: string;
  editableContent?: string;
}
```
This structure passes directly to `ClinicianApproval` for rendering and editing.

#### 3. Optional Section Passing
- **If V2 (structured)**: Pass `sections` prop to ClinicianApproval - component uses pre-parsed data
- **Fallback**: Component parses `draft` text string for backward compatibility
- This dual-support prevents breaking changes

#### 4. Component Composition with shadcn/ui
All UI components from [src/components/ui/](src/components/ui/) are auto-generated shadcn components. Never edit these directly—regenerate via `npx shadcn-ui@latest add <component>`. Use `cn()` utility from `lib/utils.ts` for conditional class merging (not `clsx` directly in components).

#### 5. Database RLS Policies
All Supabase queries via `useCasePersistence` are scoped to authenticated user. No raw SQL—only call hook functions. Queries fail silently if user lacks RLS access (security by default).

### Edge Function Pattern
Lovable-hosted functions (in `supabase/functions/`) use Deno + tool calling:
- **Environment variables**: `LOVABLE_API_KEY` injected by Lovable platform
- **Structured output**: Use Claude tool_use for JSON (no string parsing)
- **Error handling**: Throw with descriptive messages; Deno auto-converts to JSON responses
- **CORS**: Always include corsHeaders for browser calls

### Language Support
Estonian, Russian, English defined in `prompts.ts`. Language-specific prompts auto-route based on `patientData.language`.

## Development Workflows

### Local Development
```bash
bun dev           # Start Vite dev server (port 8080)
bun build         # Production build
bun lint          # ESLint + TypeScript check
```

### Supabase Functions
Local testing requires Supabase CLI. Functions invoke via `supabase.functions.invoke()` from client.

### Build System
- Vite handles `@/` path alias (resolves to `src/`)
- React SWC compiler for fast builds
- Mode-specific builds: `vite build --mode development` for unminified output

## Common Patterns & Anti-Patterns

### ✅ DO
- Use `useCasePersistence` hook for all database operations
- Pass `sections` down props when available; don't call parse in sibling components
- Import types from `@/utils/draftParser` (`Section`, `ParsedSection`, etc.)
- Use React Query (already installed) for cache management if adding features
- Test multipart file uploads against Edge Functions (streaming may differ)

### ❌ DON'T
- Don't edit `supabase/integrations/client.ts`—it auto-regenerates
- Don't manually parse markdown in multiple places; centralize via `parseStructuredDocument()`
- Don't create CSS files; use TailwindCSS classes + shadcn/ui
- Don't call generate-patient-draft or analyze-medical-note (V1 deprecated 2025-12-01)
- Don't add direct SQL—use hook abstraction layer

## Debugging Tips
- **AI output issues**: Check [supabase/functions/generate-patient-document-v2/validation.ts](supabase/functions/generate-patient-document-v2/validation.ts) for schema validation rules
- **Section parsing failures**: Test `parseStructuredDocument()` with edge function response; schema mismatch is common
- **Component rendering blanks**: Confirm `sections` array is populated in Index.tsx state before passed to children
- **Database errors silently fail**: Enable Supabase RLS audit logs to see actual errors
- **Types mismatch**: Supabase types auto-generate in `src/integrations/supabase/types.ts`—rebuild if schema changes

## File Naming Conventions
- React components: PascalCase (e.g., `ClinicianApproval.tsx`)
- Utilities/hooks: camelCase (e.g., `useCasePersistence.ts`, `draftParser.ts`)
- Edge functions: kebab-case directories (e.g., `generate-patient-document-v2`)
