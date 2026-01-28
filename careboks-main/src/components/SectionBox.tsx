/**
 * @fileoverview Section Box Component
 * 
 * Reusable card component for displaying and editing individual sections
 * of the patient communication document. Supports:
 * - Inline editing with textarea
 * - AI regeneration of content
 * - Visual status indicators (complete/empty)
 * 
 * @module components/SectionBox
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Edit2, Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for the SectionBox component
 */
interface SectionBoxProps {
  /** Icon element to display in section header */
  icon: React.ReactNode;
  /** Title of the section */
  title: string;
  /** Content of the section */
  content: string;
  /** Callback when content is edited */
  onEdit: (newContent: string) => void;
  /** Tailwind color class for theming (e.g., "text-blue-600") */
  themeColor: string;
  /** Additional CSS classes */
  className?: string;
  /** Callback to regenerate section content with AI */
  onRegenerate?: () => Promise<void>;
  /** Whether regeneration is in progress */
  isRegenerating?: boolean;
}

/**
 * Section Box Component
 * 
 * Displays a single section of the patient communication document with
 * edit and AI regeneration capabilities.
 * 
 * @example
 * ```tsx
 * <SectionBox
 *   icon={<Heart />}
 *   title="What do I have"
 *   content="You have been diagnosed with..."
 *   onEdit={(newContent) => updateSection(0, newContent)}
 *   onRegenerate={() => regenerateSection(0)}
 *   themeColor="text-blue-600"
 * />
 * ```
 */
export const SectionBox = ({
  icon,
  title,
  content,
  onEdit,
  themeColor,
  className,
  onRegenerate,
  isRegenerating = false,
}: SectionBoxProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const isEmpty = !content || content.trim().length === 0;

  /**
   * Saves the edited content and exits edit mode
   */
  const handleSave = () => {
    onEdit(editedContent);
    setIsEditing(false);
  };

  /**
   * Discards changes and exits edit mode
   */
  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  /**
   * Enters edit mode with current content
   */
  const handleStartEditing = () => {
    setEditedContent(content);
    setIsEditing(true);
  };

  return (
    <Card className={cn("relative", className)}>
      {/* Section Header */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className={cn("text-2xl", themeColor)}>{icon}</div>
            <CardTitle className="text-lg leading-tight">{title}</CardTitle>
          </div>
          
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {!isEmpty ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Check className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                Empty
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Section Content */}
      <CardContent className="space-y-3">
        {isEditing ? (
          /* Edit Mode */
          <>
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[200px] font-sans"
              placeholder="Enter content for this section..."
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" className="flex-1">
                <Check className="w-4 h-4 mr-1" />
                Save Changes
              </Button>
              <Button onClick={handleCancel} size="sm" variant="outline">
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </>
        ) : (
          /* View Mode */
          <>
            {isEmpty ? (
              <p className="text-muted-foreground italic text-sm py-4">
                No content generated for this section. Click Edit to add information.
              </p>
            ) : (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-foreground">{content}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleStartEditing}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit Section
              </Button>
              
              {onRegenerate && (
                <Button
                  onClick={onRegenerate}
                  size="sm"
                  variant="outline"
                  disabled={isRegenerating}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  {isRegenerating ? "Regenerating..." : "Regenerate with AI"}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
