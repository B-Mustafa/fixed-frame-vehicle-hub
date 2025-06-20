import React, { forwardRef, TextareaHTMLAttributes } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface HighlightTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
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

// Component that renders a textarea with highlighted content
const HighlightTextarea = forwardRef<HTMLTextAreaElement, HighlightTextareaProps>(
  ({ className, highlightQuery, value, ...props }, ref) => {
    // Create highlighted HTML if there's a search query
    const highlightedValue = highlightQuery?.trim() 
      ? highlightText(value?.toString(), highlightQuery) 
      : undefined;
    
    return (
      <div className="relative w-full">
        {/* The visible highlighted content */}
        {highlightedValue && (
          <div 
            className={cn(
              "absolute inset-0 pointer-events-none p-2 overflow-hidden text-black bg-white whitespace-pre-wrap",
              className
            )}
            dangerouslySetInnerHTML={{ __html: highlightedValue }}
          />
        )}
        
        {/* The actual textarea that users interact with */}
        <Textarea
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

HighlightTextarea.displayName = "HighlightTextarea";

export default HighlightTextarea;