
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { configureNasStorage } from "@/utils/dataStorage";
import { useToast } from "@/hooks/use-toast";

const NasConfig = ({ onClose }: { onClose: () => void }) => {
  const [nasUrl, setNasUrl] = useState(localStorage.getItem('nasUrl') || 'http://');
  const [nasPath, setNasPath] = useState(localStorage.getItem('nasPath') || '/data');
  const { toast } = useToast();

  const handleSave = () => {
    try {
      // Save to localStorage for persistence
      localStorage.setItem('nasUrl', nasUrl);
      localStorage.setItem('nasPath', nasPath);
      
      // Configure the NAS storage
      configureNasStorage(nasUrl, nasPath);
      
      toast({
        title: "NAS Configuration Saved",
        description: `Connected to ${nasUrl}${nasPath}`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Configuration Error",
        description: "Failed to save NAS configuration",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-semibold">NAS Storage Configuration</h2>
      <div className="space-y-2">
        <Label htmlFor="nas-url">NAS Server URL</Label>
        <Input 
          id="nas-url" 
          value={nasUrl} 
          onChange={(e) => setNasUrl(e.target.value)}
          placeholder="http://192.168.1.100:3000"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nas-path">API Path</Label>
        <Input 
          id="nas-path" 
          value={nasPath} 
          onChange={(e) => setNasPath(e.target.value)}
          placeholder="/data"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save Configuration</Button>
      </div>
    </div>
  );
};

export default NasConfig;
