import { useEffect } from 'react';
import { Button } from "@/components/ui/button";

export const AccessModal = ({ message }: { message: string }) => {
  // Prevent closing with escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent right-click and dev tools
  useEffect(() => {
    const disableInteractions = (e: Event) => {
      e.preventDefault();
    };
    
    document.addEventListener('contextmenu', disableInteractions);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
      }
    });
    
    return () => {
      document.removeEventListener('contextmenu', disableInteractions);
      document.removeEventListener('keydown', disableInteractions);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-4 text-red-600">Important Notice</h2>
        <div className="prose mb-6">
          {message.split('\n').map((paragraph, i) => (
            <p key={i} className="mb-4">{paragraph}</p>
          ))}
        </div>
        <div className="text-center">
          <Button 
            variant="destructive" 
            className="px-8 py-4 text-lg cursor-not-allowed opacity-50"
            disabled
          >
            Access Denied
          </Button>
        </div>
      </div>
    </div>
  );
};