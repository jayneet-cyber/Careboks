import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FileText, Users, Settings } from "lucide-react";
import ProfileSection from "@/components/account/ProfileSection";
import DocumentsSection from "@/components/account/DocumentsSection";
import ContactsSection from "@/components/account/ContactsSection";
import SettingsSection from "@/components/account/SettingsSection";
import MedicalHeader from "@/components/MedicalHeader";

interface AccountProps {
  onLogout: () => void;
}

const Account = ({ onLogout }: AccountProps) => {
  return (
    <div className="min-h-screen bg-background">
      <MedicalHeader currentStep={0} totalSteps={0} onLogout={onLogout} />
      
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">My Account</h1>
          
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Contacts</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <ProfileSection />
            </TabsContent>

            <TabsContent value="documents">
              <DocumentsSection />
            </TabsContent>

            <TabsContent value="contacts">
              <ContactsSection />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsSection onLogout={onLogout} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Account;
