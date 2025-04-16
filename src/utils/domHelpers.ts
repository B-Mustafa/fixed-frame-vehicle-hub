
/**
 * Helper function to safely focus an HTML element
 * @param element The element to focus
 */
export const focusElement = (element: Element | null): void => {
  if (element && 'focus' in element && typeof (element as HTMLElement).focus === 'function') {
    (element as HTMLElement).focus();
  }
};

/**
 * Helper function to safely handle textarea events
 * @param e The event object
 * @returns The event target properly typed
 */
export const handleTextAreaEvent = (
  e: React.ChangeEvent<HTMLTextAreaElement>
): HTMLTextAreaElement => {
  return e.target;
};
