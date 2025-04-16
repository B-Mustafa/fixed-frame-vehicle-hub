import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { join } from 'path';

// Using a fixed path for data storage instead of user selection
const DATA_PATH = join(process.env.USERPROFILE || process.env.HOME || '', 'Documents', 'SalesApp');

// Interface definitions for FileSystem API
interface FileSystemDirectoryHandle {
  getDirectoryHandle(
    name: string,
    options?: { create: boolean }
  ): Promise<FileSystemDirectoryHandle>;
  getFileHandle(
    name: string,
    options?: { create: boolean }
  ): Promise<FileSystemFileHandle>;
  values(): AsyncIterable<FileSystemHandle>;
  requestPermission?: (options?: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
}

interface FileSystemFileHandle {
  createWritable(options?: {
    keepExistingData: boolean;
  }): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: any): Promise<void>;
  close(): Promise<void>;
}

// Only used in Electron environment
declare const window: Window & {
  electron?: {
    saveFile: (data: string | Blob, filePath: string) => Promise<boolean>;
  };
  showDirectoryPicker?(options?: {
    id?: string;
    mode?: "read" | "readwrite";
    startIn?: string;
  }): Promise<FileSystemDirectoryHandle>;
};

const handleBackup = async (
  data: any,
  fileName: string,
  type: "excel" | "image"
) => {
  try {
    // Check if we're in an Electron environment
    if (window.electron) {
      if (type === "excel") {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data]);
        XLSX.utils.book_append_sheet(wb, ws, "SalesData");

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        // Save to the fixed path using Electron's API
        const filePath = `${DATA_PATH}/${fileName}.xlsx`;
        await window.electron.saveFile(blob, filePath);
        return true;
      } else if (type === "image") {
        const blob = await fetch(data).then((res) => res.blob());
        const filePath = `${DATA_PATH}/${fileName}.jpg`; // Default to jpg if format not specified
        await window.electron.saveFile(blob, filePath);
        return true;
      }
    }

    // Fall back to browser download if not in Electron or if Electron API fails
    if (type === "excel") {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data]);
      XLSX.utils.book_append_sheet(wb, ws, "SalesData");

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, `${fileName}.xlsx`);
    } else if (type === "image") {
      const blob = await fetch(data).then((res) => res.blob());
      saveAs(blob, fileName);
    }

    return true;
  } catch (error) {
    console.error("Error creating backup:", error);
    return false;
  }
};

export const saveToBackup = async (data: any, fileName: string, type: "excel" | "image") => {
  try {
    // For Electron environment, use the fixed path
    if (window.electron) {
      return await handleBackup(data, fileName, type);
    }
    
    // For browser environment with FileSystem API
    if (window.showDirectoryPicker) {
      // Use previously created fixed structure instead of prompting
      // This will create a data directory in the user's documents folder
      try {
        const electronSaved = await handleBackup(data, fileName, type);
        if (electronSaved) return true;
      } catch (err) {
        console.warn("Error saving with Electron API, falling back to browser", err);
      }
    }
    
    // Fallback: Just download the file
    return await handleBackup(data, fileName, type);
  } catch (error) {
    console.error("Error saving backup:", error);
    return await handleBackup(data, fileName, type);
  }
};

export const exportSalesToExcel = (sales: any[]) => {
  try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sales);
    XLSX.utils.book_append_sheet(wb, ws, "SalesData");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `SalesExport_${new Date().toISOString().slice(0, 10)}.xlsx`);
    return true;
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    return false;
  }
};

export const importSalesFromExcel = async (file: File) => {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Get data as JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    // Process the data to convert installment fields back to array
    const processedData = jsonData.map((item: any) => {
      const sale: any = { ...item };
      const installments = [];
      
      // Look for instl fields and reconstruct the installments array
      for (let i = 1; i <= 18; i++) {
        const dateField = `instl${i}_date`;
        const amountField = `instl${i}_amount`;
        const paidField = `instl${i}_paid`;
        
        if (sale[dateField] || sale[amountField]) {
          installments.push({
            date: sale[dateField] || "",
            amount: parseFloat(sale[amountField] || 0),
            paid: parseFloat(sale[paidField] || 0),
            enabled: true
          });
          
          // Remove these fields from the main object
          delete sale[dateField];
          delete sale[amountField];
          delete sale[paidField];
        }
      }
      
      // If installments were found, add them to the sale object
      if (installments.length > 0) {
        sale.installments = installments;
      }
      
      return sale;
    });
    
    return processedData;
  } catch (error) {
    console.error("Error importing from Excel:", error);
    return [];
  }
};
