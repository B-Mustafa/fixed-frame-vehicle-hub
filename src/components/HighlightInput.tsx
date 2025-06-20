import React, { forwardRef, InputHTMLAttributes } from 'react';
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface HighlightInputProps extends InputHTMLAttributes<HTMLInputElement> {
  highlightQuery?: string;
  value?: string;
}

// Function to highlight text based on search query
const highlightText = (text: string | undefined, query: string | undefined): string => {
  if (!query?.trim() || !text) return text || '';
  
  // Escape special characters in the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create a case-insensitive regular expression
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  
  // Replace matches with highlighted spans
  return text.replace(regex, '<mark class="bg-yellow-300">$1</mark>');
};

// Component that renders an input with highlighted placeholder text
const HighlightInput = forwardRef<HTMLInputElement, HighlightInputProps>(
  ({ className, highlightQuery, value, ...props }, ref) => {
    // Create highlighted HTML if there's a search query
    const highlightedValue = highlightQuery?.trim() 
      ? highlightText(value?.toString(), highlightQuery) 
      : undefined;
    
    // Render a wrapper div with the highlighted content and a transparent input on top
    return (
      <div className="relative w-full">
        {/* The visible highlighted content */}
        {highlightedValue && (
          <div 
            className={cn(
              "absolute inset-0 pointer-events-none p-2 overflow-hidden text-black bg-white",
              className
            )}
            dangerouslySetInnerHTML={{ __html: highlightedValue }}
          />
        )}
        
        {/* The actual input that users interact with */}
        <Input
          className={cn(
            "relative bg-white", 
            highlightedValue ? "text-transparent bg-transparent caret-black selection:bg-blue-200 selection:text-blue-800" : "",
            className
          )}
          value={value}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

HighlightInput.displayName = "HighlightInput";

export default HighlightInput;