import { ArrowRight, CheckCircle2, FileText, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import careboksLogo from "@/assets/careboks-logo.png";
import clinicianPatientPhoto from "@/assets/careboks-photo-1800.jpg";
import heroLogo from "@/assets/hero-logo.png";
import heroLeftCards from "@/assets/hero-left-cards.png";
import heroRightCards from "@/assets/hero-right-cards.png";
const Landing = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="container mx-auto max-w-7xl">
          {/* Login Button */}
          <Button onClick={() => navigate("/auth")} className="absolute top-6 right-6 z-20" variant="outline">
            Login
          </Button>

          <div className="relative flex items-center justify-center min-h-[600px]">
            {/* Left Floating Cards */}
            <img src={heroLeftCards} alt="" className="absolute left-0 top-[28%] -translate-y-[28%] w-64 lg:w-80 hidden lg:block" aria-hidden="true" />
            
            {/* Center Content */}
            <div className="text-center max-w-2xl mx-auto z-10 px-6">
              <img src={heroLogo} alt="Careboks Logo" className="w-24 h-24 mx-auto mb-8" />
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6">Careboks</h1>
              <p className="text-xl lg:text-2xl text-foreground mb-4 font-medium">
                Your medical expertise, delivered with clarity.
              </p>
              <p className="text-base lg:text-lg text-muted-foreground mb-8 max-w-xl mx-auto">Careboks helps clinicians communicate complex medical information in a clear, structured, patient-appropriate format, reducing misunderstandings and improving confidence in the care journey.</p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button size="lg" onClick={() => navigate("/auth")}>
                  Request Pilot
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => document.getElementById("output-example")?.scrollIntoView({
                behavior: "smooth"
              })}>
                  See Example Output
                </Button>
              </div>
            </div>

            {/* Right Floating Cards */}
            <img src={heroRightCards} alt="" className="absolute right-0 top-[28%] -translate-y-[28%] w-64 lg:w-80 hidden lg:block" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Clinician-Patient Communication Section */}
      <section className="py-16 px-6 bg-[hsl(var(--muted)/0.20)]">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1">
              <img src={clinicianPatientPhoto} alt="Clinician explaining medical information to patient" className="w-full h-auto rounded-2xl object-cover aspect-[4/3]" />
            </div>
            <div className="order-1 md:order-2">
              <p className="text-xl md:text-2xl text-foreground leading-relaxed">
                Careboks supports clinicians in explaining what matters most. Calmly, clearly, and in everyday language that patients can truly understand.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Communication Problem */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">
            Clinical Communication Was Not Designed for Patients
          </h3>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-semibold text-foreground mb-3">Medical language is built for clinical precision, not lay understanding.</h4>
                <p className="text-sm text-muted-foreground">
                  Terminology designed for specialists can overwhelm patients, even when explained verbally.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-semibold text-foreground mb-3">Patients have different levels of health literacy and cognitive load.</h4>
                <p className="text-sm text-muted-foreground">
                  What is clear to one patient may be completely inaccessible to another. Standardized information doesn't fit everyone.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-semibold text-foreground mb-3">Time pressure limits how much doctors can adapt communication.</h4>
                <p className="text-sm text-muted-foreground">
                  Even when clinicians want to explain thoroughly, workflows allow only minutes for complex discussion.
                </p>
              </CardContent>
            </Card>
          </div>
          <p className="text-center text-muted-foreground italic">
            This isn't a question of effort — it's a question of structure.
          </p>
        </div>
      </section>

      {/* Why This Matters */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">Why This Matters</h3>
          <div className="space-y-4 mb-8">
            {["Clear communication improves treatment adherence.", "Understanding reduces anxiety and uncertainty.", "Confidence helps patients engage in their own recovery and self-care.", "Better comprehension lowers preventable complications and return visits."].map((point, i) => <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-lg text-foreground">{point}</p>
              </div>)}
          </div>
          <p className="text-center text-xl font-semibold text-foreground">
            Better understanding leads to better outcomes.
          </p>
        </div>
      </section>

      {/* The Carebox Approach */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-3xl font-bold text-center text-foreground mb-4">
            Turning Clinical Expertise Into Patient-Ready Understanding
          </h3>
          <p className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto">
            Carebox restructures medical information into concise, clear "Care Boxes" — tailored to the patient's level of understanding and needs.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-3">Clarity</h4>
                <p className="text-sm text-muted-foreground">
                  Translates clinical terminology into plain language without losing medical accuracy.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-3">Structure</h4>
                <p className="text-sm text-muted-foreground">
                  Organizes guidance into focused informational blocks that patients can follow.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-3">Personalization</h4>
                <p className="text-sm text-muted-foreground">
                  Adapts tone, depth, and emphasis based on patient literacy, age, and context.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Where Carebox Fits */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-5xl">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">
            Where Carebox Fits in the Journey
          </h3>
          <div className="space-y-4 mb-8">
            {[{
            scenario: "Discharge from hospital",
            role: "Summarizing condition, next steps, medication guidance. (Current MVP)"
          }, {
            scenario: "Outpatient consultation",
            role: "Turning exam findings into understandable explanations for home care."
          }, {
            scenario: "Chronic condition follow-up",
            role: "Helping patients track ongoing treatment changes."
          }, {
            scenario: "Pre-procedure preparation",
            role: "Clarifying what will happen and how to prepare."
          }].map((item, i) => <Card key={i}>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="font-semibold text-foreground">{item.scenario}</div>
                    <div className="text-muted-foreground">{item.role}</div>
                  </div>
                </CardContent>
              </Card>)}
          </div>
          <p className="text-center text-lg font-medium text-foreground">
            Carebox supports communication anywhere patients need clarity.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">How It Works</h3>
          <p className="text-center text-muted-foreground mb-8">Clinical → Structured → Patient-ready.</p>
          <div className="space-y-6">
            {["Clinician inputs or pastes documentation", "Selects patient context markers (age, literacy, communication considerations)", "Carebox restructures and simplifies content", "Clinician reviews and approves", "Output provided to patient (paper or digital)"].map((step, i) => <div key={i} className="flex gap-4 items-start">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-lg text-foreground pt-0.5">{step}</p>
              </div>)}
          </div>
          <p className="text-center text-lg font-semibold text-foreground mt-8">
            Total time: under 2 minutes.
          </p>
        </div>
      </section>

      {/* Output Example */}
      <section id="output-example" className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">
            A Clear, Patient-Ready Summary
          </h3>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold text-foreground mb-2">Understanding Your Condition</h4>
                <p className="text-sm text-muted-foreground">Clear explanation of diagnosis in patient-friendly language</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold text-foreground mb-2">What To Do Day-to-Day</h4>
                <p className="text-sm text-muted-foreground">Practical guidance for daily activities and lifestyle adjustments</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold text-foreground mb-2">Medication Guidance and Purpose</h4>
                <p className="text-sm text-muted-foreground">What each medication does and why it's important</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold text-foreground mb-2">Warning Signs</h4>
                <p className="text-sm text-muted-foreground">Symptoms to watch for and when to seek help</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold text-foreground mb-2">Follow-up and Support</h4>
                <p className="text-sm text-muted-foreground">Next appointments and available resources</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Designed for Real Hospital Environments */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">
            Designed for Real Hospital Environments
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {["No EMR integration required for pilot use", "Paper-first approach ensures universal access", "Future-ready for local, privacy-safe digital expansion"].map((point, i) => <Card key={i}>
                <CardContent className="pt-6">
                  <CheckCircle2 className="h-8 w-8 text-primary mb-3" />
                  <p className="text-foreground">{point}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Pilot Invitation */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h3 className="text-3xl font-bold text-foreground mb-6">Partner With Us</h3>
          <p className="text-lg text-muted-foreground mb-8">
            We are currently collaborating with clinical teams to refine Carebox through real-world use.
            Join our pilot program to help shape the standard of clear patient communication.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")}>
            Request Pilot Participation
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 Carebox. Supporting clinicians in delivering clear, patient-centered communication.</p>
        </div>
      </footer>
    </div>;
};
export default Landing;