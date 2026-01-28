import { useState } from "react";
import MedicalHeader from "@/components/MedicalHeader";
import TechnicalNoteInput from "@/components/TechnicalNoteInput";
import PatientProfile from "@/components/PatientProfile";
import { ClinicianApproval } from "@/components/ClinicianApproval";
import FinalOutput from "@/components/FinalOutput";
import { ParsedSection } from "@/utils/draftParser";

type Step = 'input' | 'profile' | 'approval' | 'output';

interface PatientData {
  age: string;
  sex: string;
  language: string;
  healthLiteracy: string;
  journeyType: string;
  riskAppetite: string;
  hasAccessibilityNeeds: boolean;
  includeRelatives: boolean;
  comorbidities: string[];
}

interface IndexProps {
  onLogout: () => void;
}

const Index = ({ onLogout }: IndexProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('input');
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [technicalNote, setTechnicalNote] = useState("");
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [aiDraft, setAiDraft] = useState("");
  const [aiSections, setAiSections] = useState<ParsedSection[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [finalText, setFinalText] = useState("");
  const [approvedSections, setApprovedSections] = useState<ParsedSection[]>([]);

  const steps: Step[] = ['input', 'profile', 'approval', 'output'];
  const currentStepIndex = steps.indexOf(currentStep);
  const totalSteps = steps.length;

  const handleTechnicalNoteSubmit = (note: string, caseId: string) => {
    setTechnicalNote(note);
    setCurrentCaseId(caseId);
    setCurrentStep('profile');
  };

  const handlePatientProfileSubmit = (data: PatientData) => {
    setPatientData(data);
    setCurrentStep('approval');
  };

  const handleAIProcessingComplete = (draft: string, analysisData?: any, sectionsData?: ParsedSection[]) => {
    setAiDraft(draft);
    setAnalysis(analysisData);
    setAiSections(sectionsData || []);
    setCurrentStep('approval');
  };

  const handleClinicianApproval = (approvedText: string, clinicianName: string, sections: ParsedSection[]) => {
    setFinalText(approvedText);
    setApprovedSections(sections);
    setCurrentStep('output');
  };

  const handleRestart = () => {
    setCurrentStep('input');
    setCurrentCaseId(null);
    setTechnicalNote("");
    setPatientData(null);
    setAiDraft("");
    setAiSections([]);
    setAnalysis(null);
    setFinalText("");
    setApprovedSections([]);
  };

  const handleBack = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleBackToProfile = () => {
    setCurrentStep('profile');
  };

  const handleLogoClick = () => {
    if (currentStepIndex >= 1) {
      setCurrentStep('input');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MedicalHeader 
        currentStep={currentStepIndex + 1} 
        totalSteps={totalSteps} 
        onLogout={onLogout}
        onLogoClick={handleLogoClick}
      />
      
      <main className="container mx-auto px-6 py-8">
        {currentStep === 'input' && (
          <TechnicalNoteInput onNext={handleTechnicalNoteSubmit} initialNote={technicalNote} />
        )}
        
        {currentStep === 'profile' && currentCaseId && (
          <PatientProfile 
            caseId={currentCaseId}
            onNext={handlePatientProfileSubmit} 
            onBack={handleBack}
            initialData={patientData || undefined}
          />
        )}
        
        {currentStep === 'approval' && currentCaseId && patientData && (
          <ClinicianApproval 
            caseId={currentCaseId}
            draft={aiDraft}
            sections={approvedSections.length > 0 ? approvedSections : aiSections}
            analysis={analysis}
            patientData={patientData}
            technicalNote={technicalNote}
            onApprove={handleClinicianApproval}
            onBack={handleBackToProfile}
          />
        )}
        
        {currentStep === 'output' && currentCaseId && (
          <FinalOutput 
            caseId={currentCaseId}
            finalText={finalText}
            onRestart={handleRestart}
            onBack={() => setCurrentStep('approval')}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
