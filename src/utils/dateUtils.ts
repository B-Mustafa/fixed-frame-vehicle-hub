// utils/dateUtils.ts
export const getCurrentDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  export const formatToDisplayDate = (dateString: string | undefined): string => {
    if (!dateString) return getCurrentDate();
  
    // If already in dd/mm/yyyy format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString;
    }
  
    try {
      // Handle yyyy-mm-dd format (from date inputs)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split("-");
        return `${day}/${month}/${year}`;
      }
  
      // Handle other date strings
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return getCurrentDate();
  
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return getCurrentDate();
    }
  };
  
  export const formatToInputDate = (dateString: string | undefined): string => {
    if (!dateString) return new Date().toISOString().split('T')[0];
  
    // Convert from dd/mm/yyyy to yyyy-mm-dd for date inputs
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split("/");
      return `${year}-${month}-${day}`;
    }
  
    // Handle if it's already in yyyy-mm-dd format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
  
    return new Date().toISOString().split('T')[0];
  };