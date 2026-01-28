/**
 * @fileoverview Rich Text Editor Component
 * 
 * WYSIWYG editor built on TipTap for clinical note input.
 * Supports common formatting: bold, italic, headings, lists.
 * 
 * @module components/RichTextEditor
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Undo, Redo, Heading1, Heading2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

/**
 * Props for the RichTextEditor component
 */
interface RichTextEditorProps {
  /** Current HTML content value */
  value: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

/**
 * Props for individual menu button
 */
interface MenuButtonProps {
  /** Click handler */
  onClick: () => void;
  /** Whether this formatting is currently active */
  isActive: boolean;
  /** Lucide icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Tooltip text */
  title: string;
  /** Whether button is disabled */
  disabled?: boolean;
}

/**
 * Menu Button Component
 * 
 * Toolbar button for formatting actions
 */
const MenuButton = ({ onClick, isActive, icon: Icon, title, disabled }: MenuButtonProps) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className={cn("h-8 w-8 p-0", isActive && "bg-muted")}
    title={title}
  >
    <Icon className="h-4 w-4" />
  </Button>
);

/**
 * Toolbar separator for visual grouping
 */
const ToolbarSeparator = () => (
  <div className="w-px h-8 bg-border mx-1" />
);

/**
 * Rich Text Editor Component
 * 
 * A WYSIWYG editor for inputting clinical notes with formatting support.
 * Uses TipTap editor with StarterKit extensions.
 * 
 * @example
 * ```tsx
 * <RichTextEditor
 *   value={note}
 *   onChange={setNote}
 *   placeholder="Enter clinical notes..."
 *   disabled={isProcessing}
 * />
 * ```
 */
export const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Enter text...",
  className,
  disabled = false
}: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Handle loading state
  if (!editor) {
    return null;
  }

  // Sync external value changes to editor
  if (editor.getHTML() !== value && value !== editor.getHTML()) {
    editor.commands.setContent(value);
  }

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      {/* Formatting Toolbar */}
      <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1">
        {/* Text Formatting */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={Bold}
          title="Bold (Ctrl+B)"
          disabled={disabled}
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={Italic}
          title="Italic (Ctrl+I)"
          disabled={disabled}
        />
        
        <ToolbarSeparator />
        
        {/* Headings */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          icon={Heading1}
          title="Heading 1"
          disabled={disabled}
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          icon={Heading2}
          title="Heading 2"
          disabled={disabled}
        />
        
        <ToolbarSeparator />
        
        {/* Lists */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={List}
          title="Bullet List"
          disabled={disabled}
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          icon={ListOrdered}
          title="Numbered List"
          disabled={disabled}
        />
        
        <ToolbarSeparator />
        
        {/* Undo/Redo */}
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          isActive={false}
          icon={Undo}
          title="Undo (Ctrl+Z)"
          disabled={disabled}
        />
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          isActive={false}
          icon={Redo}
          title="Redo (Ctrl+Shift+Z)"
          disabled={disabled}
        />
      </div>
      
      {/* Editor Content Area */}
      <EditorContent
        editor={editor}
        className={cn(
          "prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
    </div>
  );
};
