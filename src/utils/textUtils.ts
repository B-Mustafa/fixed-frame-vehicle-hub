export const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  
  export const highlightText = (text: string, searchQuery: string): string => {
    if (!searchQuery.trim() || !text) return text;
    
    const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
    return text.toString().replace(regex, '<mark class="bg-yellow-300">$1</mark>');
  };