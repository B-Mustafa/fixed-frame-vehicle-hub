
// Helper functions for DOM manipulation

/**
 * Safely handles textarea change events and returns the textarea element
 * Use this to avoid TypeScript errors when working with textarea events
 */
export const handleTextAreaEvent = (
  e: React.ChangeEvent<HTMLTextAreaElement>
): HTMLTextAreaElement => {
  return e.target;
};

/**
 * Safely focuses an element if it exists and has a focus method
 */
export const focusElement = (element: Element | null): void => {
  if (element && 'focus' in element && typeof element.focus === 'function') {
    element.focus();
  }
};

/**
 * Creates a directory for data storage at the application root
 * This is used to initialize the data directory structure
 */
export const initializeDataDirectory = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // In browser environment, we can't create directories at the root
      // In Electron environment, the main process handles this
      if (window.electron) {
        window.electron
          .createDirectory('./data')
          .then(() => resolve(true))
          .catch((err: any) => {
            console.error('Error creating data directory:', err);
            resolve(false);
          });
      } else {
        // In browser, just report success since we'll fall back to downloads
        resolve(true);
      }
    } catch (error) {
      console.error('Error initializing data directory:', error);
      resolve(false);
    }
  });
};
