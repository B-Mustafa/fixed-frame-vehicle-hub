
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { configureNasStorage } from "@/utils/dataStorage";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Info } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="deployment">
          <AccordionTrigger className="text-sm text-blue-600">
            <Info className="h-4 w-4 mr-2" />
            How to deploy to NAS without sharing codebase
          </AccordionTrigger>
          <AccordionContent>
            <div className="text-sm space-y-2 bg-gray-50 p-3 rounded-md">
              <h3 className="font-medium">Deployment Instructions:</h3>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Build the app using: <code className="bg-gray-200 px-1">npm run build</code></li>
                <li>The build output will be in the <code className="bg-gray-200 px-1">dist</code> folder</li>
                <li>Upload only the <code className="bg-gray-200 px-1">dist</code> folder contents to your NAS</li>
                <li>Configure your NAS to serve these static files (using a web server like nginx or a simple HTTP server)</li>
                <li>Create a <code className="bg-gray-200 px-1">/data</code> folder on your NAS to store the application data</li>
                <li>The NAS should have CORS enabled to allow the frontend to access the API</li>
              </ol>
              <p className="mt-2 text-xs text-gray-500">Note: This only shares the compiled files, not the source code.</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save Configuration</Button>
      </div>
    </div>
  );
};

export default NasConfig;
