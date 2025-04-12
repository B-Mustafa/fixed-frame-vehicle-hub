import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Keyboard } from "lucide-react";

export interface KeyBind {
  id: string;
  description: string;
  key: string;
}

export const DEFAULT_KEYBINDS: KeyBind[] = [
  { id: "search", description: "Search", key: "Ctrl+F" },
  { id: "new", description: "New Record", key: "Ctrl+N" },
  { id: "save", description: "Save Record", key: "Ctrl+S" },
  { id: "delete", description: "Delete Record", key: "Ctrl+D" },
  { id: "first", description: "First Record", key: "Home" },
  { id: "last", description: "Last Record", key: "End" },
  { id: "prev", description: "Previous Record", key: "PageUp" },
  { id: "next", description: "Next Record", key: "PageDown" },
  { id: "search_prev", description: "Previous Search Result", key: "Shift+F3" },
  { id: "search_next", description: "Next Search Result", key: "F3" },
  { id: "print", description: "Print", key: "Ctrl+P" },
  { id: "export", description: "Export", key: "Ctrl+E" },
];

interface KeyBindDialogProps {
  onBindsChange?: (binds: KeyBind[]) => void;
}

const KeyBindDialog: React.FC<KeyBindDialogProps> = ({ onBindsChange }) => {
  const [keybinds, setKeybinds] = useState<KeyBind[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load keybinds from localStorage or use defaults
    const savedBinds = localStorage.getItem("app_keybinds");
    if (savedBinds) {
      try {
        setKeybinds(JSON.parse(savedBinds));
      } catch (e) {
        console.error("Failed to parse saved keybinds:", e);
        setKeybinds(DEFAULT_KEYBINDS);
      }
    } else {
      setKeybinds(DEFAULT_KEYBINDS);
    }
  }, []);

  useEffect(() => {
    // When dialog opens, apply any saved keybinds
    if (isOpen && onBindsChange) {
      onBindsChange(keybinds);
    }
  }, [isOpen, keybinds, onBindsChange]);

  const handleSave = () => {
    localStorage.setItem("app_keybinds", JSON.stringify(keybinds));
    if (onBindsChange) {
      onBindsChange(keybinds);
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    setKeybinds(DEFAULT_KEYBINDS);
    localStorage.setItem("app_keybinds", JSON.stringify(DEFAULT_KEYBINDS));
    if (onBindsChange) {
      onBindsChange(DEFAULT_KEYBINDS);
    }
  };

  const startRecording = (id: string) => {
    setEditingId(id);
    setIsRecording(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (!isRecording) return;
    
    e.preventDefault();
    
    // Create a readable key combination
    let key = "";
    
    if (e.ctrlKey) key += "Ctrl+";
    if (e.shiftKey) key += "Shift+";
    if (e.altKey) key += "Alt+";
    if (e.metaKey) key += "Meta+";
    
    // For special keys like arrow keys, home, end, etc.
    const specialKeys: Record<string, string> = {
      "ArrowUp": "↑",
      "ArrowDown": "↓",
      "ArrowLeft": "←",
      "ArrowRight": "→",
      "Escape": "Esc",
      "Delete": "Del",
      " ": "Space",
    };
    
    if (e.key in specialKeys) {
      key += specialKeys[e.key];
    } else if (e.key.length === 1) {
      key += e.key.toUpperCase();
    } else {
      key += e.key;
    }
    
    // Update the keybind
    setKeybinds(prev => 
      prev.map(kb => 
        kb.id === id ? { ...kb, key } : kb
      )
    );
    
    setIsRecording(false);
    setEditingId(null);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setEditingId(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex gap-1 items-center">
          <Keyboard className="h-4 w-4" />
          <span>Key Bindings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Customize keyboard shortcuts for common actions. Click on any shortcut to change it.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-80 pr-4">
          <div className="space-y-2">
            {keybinds.map((kb) => (
              <div key={kb.id} className="flex items-center justify-between py-1">
                <div className="text-sm">{kb.description}</div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => startRecording(kb.id)}
                    onKeyDown={(e) => handleKeyDown(e, kb.id)}
                    onBlur={stopRecording}
                    className={`min-w-28 text-center ${editingId === kb.id ? 'bg-yellow-50' : ''}`}
                  >
                    {editingId === kb.id ? "Press keys..." : kb.key}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KeyBindDialog;