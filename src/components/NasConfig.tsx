
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { configureNasStorage } from "@/utils/dataStorage";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

const NasConfig = ({ onClose }: { onClose: () => void }) => {
  const [nasEndpoints, setNasEndpoints] = useState<Array<{url: string, path: string}>>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved endpoints from localStorage
    const savedEndpoints = localStorage.getItem('nasEndpoints');
    if (savedEndpoints) {
      try {
        setNasEndpoints(JSON.parse(savedEndpoints));
      } catch (error) {
        console.error("Failed to parse saved NAS endpoints", error);
        // Initialize with default if parsing failed
        initializeDefaultEndpoints();
      }
    } else {
      // Initialize with default endpoints
      initializeDefaultEndpoints();
    }
  }, []);

  const initializeDefaultEndpoints = () => {
    // Use the provided IP addresses
    const defaultEndpoints = [
      { url: 'http://192.168.2.7', path: '/data' },
      { url: 'http://192.168.2.8', path: '/data' }
    ];
    setNasEndpoints(defaultEndpoints);
  };

  const handleAddEndpoint = () => {
    setNasEndpoints([...nasEndpoints, { url: 'http://', path: '/data' }]);
  };

  const handleRemoveEndpoint = (index: number) => {
    const newEndpoints = [...nasEndpoints];
    newEndpoints.splice(index, 1);
    setNasEndpoints(newEndpoints);
  };

  const handleEndpointChange = (index: number, field: 'url' | 'path', value: string) => {
    const newEndpoints = [...nasEndpoints];
    newEndpoints[index][field] = value;
    setNasEndpoints(newEndpoints);
  };

  const handleSave = () => {
    try {
      // Filter out any incomplete endpoints
      const validEndpoints = nasEndpoints.filter(ep => ep.url && ep.url !== 'http://');
      
      if (validEndpoints.length === 0) {
        toast({
          title: "Configuration Error",
          description: "At least one valid NAS endpoint is required",
          variant: "destructive",
        });
        return;
      }
      
      // Save to localStorage for persistence
      localStorage.setItem('nasEndpoints', JSON.stringify(validEndpoints));
      
      // Configure the NAS storage with the primary endpoint
      // (the first one is considered primary)
      configureNasStorage(validEndpoints[0].url, validEndpoints[0].path, validEndpoints);
      
      toast({
        title: "NAS Configuration Saved",
        description: `Primary NAS: ${validEndpoints[0].url}${validEndpoints[0].path} (${validEndpoints.length} endpoints configured)`,
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
      <p className="text-sm text-gray-500">Configure multiple NAS endpoints for redundancy. The first endpoint is used as primary.</p>
      
      {nasEndpoints.map((endpoint, index) => (
        <div key={index} className="space-y-2 p-3 border rounded-md bg-gray-50 relative">
          <div className="absolute right-2 top-2">
            {nasEndpoints.length > 1 && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleRemoveEndpoint(index)}
                className="h-8 w-8 text-red-500"
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`nas-url-${index}`}>NAS Server URL {index === 0 ? "(Primary)" : ""}</Label>
            <Input 
              id={`nas-url-${index}`} 
              value={endpoint.url} 
              onChange={(e) => handleEndpointChange(index, 'url', e.target.value)}
              placeholder="http://192.168.2.7"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`nas-path-${index}`}>API Path</Label>
            <Input 
              id={`nas-path-${index}`} 
              value={endpoint.path} 
              onChange={(e) => handleEndpointChange(index, 'path', e.target.value)}
              placeholder="/data"
            />
          </div>
        </div>
      ))}
      
      <Button 
        variant="outline" 
        className="w-full" 
        onClick={handleAddEndpoint}
      >
        <Plus size={16} className="mr-2" /> Add Endpoint
      </Button>
      
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save Configuration</Button>
      </div>
    </div>
  );
};

export default NasConfig;
