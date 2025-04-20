
// Function to initialize the data directory
export const initializeDataDirectory = async () => {
  try {
    // For browser environment
    const dataDir = './data';
    
    // Create directory if it doesn't exist
    try {
      await window.electron?.createDirectory(dataDir);
      console.log('Data directory created/verified:', dataDir);
      return true;
    } catch (error) {
      console.warn('Could not create data directory:', error);
      return false;
    }
  } catch (error) {
    console.error('Error initializing data directory:', error);
    return false;
  }
};

// Simple helper for handling textarea events
export const handleTextAreaEvent = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const textarea = e.target;
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
  return textarea;
};

// Helper to focus an element
export const focusElement = (element: HTMLElement | null) => {
  if (element && typeof element.focus === 'function') {
    element.focus();
  }
};

