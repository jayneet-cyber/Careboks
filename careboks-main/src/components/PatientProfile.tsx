/**
 * @fileoverview Patient Profile Component
 * 
 * Second step of the patient communication workflow. Collects patient-specific
 * attributes that will be used to personalize the AI-generated communication:
 * - Demographics (age, sex)
 * - Language preference
 * - Health literacy level
 * - Patient journey type
 * - Risk communication preferences
 * - Comorbidities
 * - Accessibility needs
 * 
 * @module components/PatientProfile
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { User, ArrowLeft } from "lucide-react";
import { useCasePersistence } from "@/hooks/useCasePersistence";
import { useToast } from "@/hooks/use-toast";

/**
 * Patient data structure containing all personalization attributes
 */
export interface PatientData {
  /** Age bracket (e.g., "20-30", "60+") */
  age: string;
  /** Biological sex for medical relevance */
  sex: string;
  /** Preferred language for communication (estonian, russian, english) */
  language: string;
  /** Health literacy level affecting complexity of explanations */
  healthLiteracy: string;
  /** Type of patient journey affecting tone and detail */
  journeyType: string;
  /** Preference for detail level in risk communication */
  riskAppetite: string;
  /** Whether patient has vision/hearing impairments */
  hasAccessibilityNeeds: boolean;
  /** Whether to include information for caregivers */
  includeRelatives: boolean;
  /** List of relevant comorbidities */
  comorbidities: string[];
}

/**
 * Props for the PatientProfile component
 */
interface PatientProfileProps {
  /** ID of the current case being processed */
  caseId: string;
  /** Callback fired when user proceeds with patient data */
  onNext: (data: PatientData) => void;
  /** Callback to return to previous step */
  onBack: () => void;
  /** Pre-filled patient data (optional, for editing) */
  initialData?: PatientData;
}

/** Default empty patient data structure */
const DEFAULT_PATIENT_DATA: PatientData = {
  age: "",
  sex: "",
  language: "",
  healthLiteracy: "",
  journeyType: "",
  riskAppetite: "",
  hasAccessibilityNeeds: false,
  includeRelatives: false,
  comorbidities: []
};

/** Available comorbidity options */
const COMORBIDITY_OPTIONS = ['Depression'];

/**
 * Patient Profile Component
 * 
 * Collects patient attributes to personalize the AI-generated medical communication.
 * Validates required fields before allowing progression to next step.
 * 
 * @example
 * ```tsx
 * <PatientProfile
 *   caseId="123-abc"
 *   onNext={(data) => handlePatientData(data)}
 *   onBack={() => goToTechnicalNote()}
 * />
 * ```
 */
const PatientProfile = ({
  caseId,
  onNext,
  onBack,
  initialData
}: PatientProfileProps) => {
  const { savePatientProfile, updateCase } = useCasePersistence();
  const { toast } = useToast();
  
  const [data, setData] = useState<PatientData>(initialData || DEFAULT_PATIENT_DATA);

  /**
   * Toggles a comorbidity in the patient's comorbidity list
   */
  const handleComorbidityChange = (comorbidity: string, checked: boolean) => {
    setData(prev => ({
      ...prev,
      comorbidities: checked
        ? [...prev.comorbidities, comorbidity]
        : prev.comorbidities.filter(c => c !== comorbidity)
    }));
  };

  /**
   * Updates a single field in the patient data
   */
  const updateField = <K extends keyof PatientData>(field: K, value: PatientData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Validates and saves patient profile, then proceeds to next step
   */
  const handleNext = async () => {
    if (!isValid) return;

    // Save patient profile to database
    const { error: profileError } = await savePatientProfile(caseId, data);
    if (profileError) {
      toast({
        title: "Error",
        description: "Failed to save patient profile",
        variant: "destructive"
      });
      return;
    }

    // Update case status to processing
    const { error: updateError } = await updateCase(caseId, { status: 'processing' });
    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to update case status",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Patient profile saved"
    });
    
    onNext(data);
  };

  /** Validates that all required fields are filled */
  const isValid = Boolean(
    data.age &&
    data.sex &&
    data.language &&
    data.healthLiteracy &&
    data.journeyType
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Patient Profile</CardTitle>
          </div>
          <CardDescription>
            Configure patient attributes to personalize the communication output.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Demographics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Age Selection */}
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Select value={data.age} onValueChange={value => updateField('age', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select age bracket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20-30">20-30 years old</SelectItem>
                  <SelectItem value="30-45">30-45 years old</SelectItem>
                  <SelectItem value="45-60">45-60 years old</SelectItem>
                  <SelectItem value="60+">60+ years old</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sex Selection */}
            <div className="space-y-2">
              <Label htmlFor="sex">Sex</Label>
              <Select value={data.sex} onValueChange={value => updateField('sex', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <Label htmlFor="language">Preferred Language</Label>
              <Select value={data.language} onValueChange={value => updateField('language', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estonian">Estonian</SelectItem>
                  <SelectItem value="russian">Russian</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Health Literacy Selection */}
            <div className="space-y-2">
              <Label htmlFor="literacy">Health Literacy Level</Label>
              <Select value={data.healthLiteracy} onValueChange={value => updateField('healthLiteracy', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select literacy level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Simple terms, large text)</SelectItem>
                  <SelectItem value="medium">Medium (Balanced approach)</SelectItem>
                  <SelectItem value="high">High (Detailed explanations)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Journey Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="journey">Patient Journey Type</Label>
              <Select value={data.journeyType} onValueChange={value => updateField('journeyType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select journey type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elective">Elective Care</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="chronic">Chronic Management</SelectItem>
                  <SelectItem value="first-time">First-time Diagnosis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Risk Appetite Selection */}
            <div className="space-y-2">
              <Label htmlFor="risk">Risk Communication Preference</Label>
              <Select value={data.riskAppetite} onValueChange={value => updateField('riskAppetite', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal details</SelectItem>
                  <SelectItem value="balanced">Balanced information</SelectItem>
                  <SelectItem value="detailed">Detailed explanation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comorbidities Section */}
          <div className="space-y-4">
            <Label>Comorbidities</Label>
            <div className="grid grid-cols-2 gap-4">
              {COMORBIDITY_OPTIONS.map(condition => (
                <div key={condition} className="flex items-center space-x-2">
                  <Checkbox
                    id={condition}
                    checked={data.comorbidities.includes(condition)}
                    onCheckedChange={checked => handleComorbidityChange(condition, !!checked)}
                  />
                  <Label htmlFor={condition}>{condition}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accessibility"
                checked={data.hasAccessibilityNeeds}
                onCheckedChange={checked => updateField('hasAccessibilityNeeds', !!checked)}
              />
              <Label htmlFor="accessibility">
                Patient has vision/hearing accessibility needs
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="relatives"
                checked={data.includeRelatives}
                onCheckedChange={checked => updateField('includeRelatives', !!checked)}
              />
              <Label htmlFor="relatives">
                Include information for relatives/caregivers
              </Label>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-border">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Clinical Documents
            </Button>
            <Button onClick={handleNext} disabled={!isValid}>
              Generate AI Draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientProfile;
