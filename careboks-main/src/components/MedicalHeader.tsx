/**
 * @fileoverview Medical Header Component
 * 
 * Application header displaying branding, step progress indicator,
 * and user action buttons (account, logout).
 * 
 * @module components/MedicalHeader
 */

import { LogOut, User, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import careboksLogo from "@/assets/careboks-logo.png";

/**
 * Props for the MedicalHeader component
 */
interface MedicalHeaderProps {
  /** Current step number in the workflow (1-indexed) */
  currentStep: number;
  /** Total number of steps in the workflow */
  totalSteps: number;
  /** Callback when user clicks logout */
  onLogout: () => void;
  /** Callback when user clicks the logo (optional) */
  onLogoClick?: () => void;
}

/**
 * Medical Header Component
 * 
 * Renders the application header with:
 * - Careboks logo (clickable)
 * - Step progress indicator (when in multi-step workflow)
 * - Navigation buttons (account/home toggle, logout)
 * 
 * @example
 * ```tsx
 * <MedicalHeader
 *   currentStep={2}
 *   totalSteps={4}
 *   onLogout={() => handleLogout()}
 *   onLogoClick={() => goToHome()}
 * />
 * ```
 */
const MedicalHeader = ({
  currentStep,
  totalSteps,
  onLogout,
  onLogoClick
}: MedicalHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isAccountPage = location.pathname === '/account';
  const showStepProgress = currentStep > 0 && totalSteps > 0;
  const stepProgressPercent = (currentStep / totalSteps) * 100;

  /**
   * Toggles between account page and main app
   */
  const handleAccountToggle = () => {
    navigate(isAccountPage ? '/app' : '/account');
  };

  return (
    <header className="bg-card border-b border-border shadow-md">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img
              src={careboksLogo}
              alt="Careboks"
              className="h-10 w-auto cursor-pointer"
              onClick={onLogoClick}
            />
          </div>
          
          {/* Right Section: Progress + Actions */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              {/* Step Progress Indicator */}
              {showStepProgress && (
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">
                    Step {currentStep} of {totalSteps}
                  </div>
                  <div className="w-32 h-2 bg-muted rounded-full mt-1">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${stepProgressPercent}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Account/Home Toggle Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAccountToggle}
                className="text-muted-foreground hover:text-foreground"
                aria-label={isAccountPage ? "Go to home" : "Go to account"}
              >
                {isAccountPage ? (
                  <Home className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </Button>
              
              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MedicalHeader;
