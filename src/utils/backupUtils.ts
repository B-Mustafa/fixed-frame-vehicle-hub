
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

let savedDirectoryHandle: FileSystemDirectoryHandle | null = null;

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

declare global {
  interface Window {
    showDirectoryPicker(options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?: string;
    }): Promise<FileSystemDirectoryHandle>;
  }
}

const handleBackup = async (
  data: any,
  fileName: string,
  type: "excel" | "image"
) => {
  try {
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
    if (!window.showDirectoryPicker) {
      console.warn("File System Access API not supported in this browser");
      return await handleBackup(data, fileName, type);
    }

    if (!savedDirectoryHandle) {
      try {
        savedDirectoryHandle = await window.showDirectoryPicker({
          id: "dataFolder",
          mode: "readwrite",
          startIn: "documents",
        });

        if (navigator.storage && navigator.storage.persist) {
          await navigator.storage.persist();
        }
      } catch (err) {
        console.warn(
          "User denied directory access, falling back to download",
          err
        );
        return await handleBackup(data, fileName, type);
      }
    }

    try {
      await savedDirectoryHandle.requestPermission({ mode: "readwrite" });
    } catch (e) {
      try {
        savedDirectoryHandle = await window.showDirectoryPicker({
          id: "dataFolder",
          mode: "readwrite",
          startIn: "documents",
        });
      } catch (err) {
        console.warn(
          "User denied directory access on retry, falling back to download",
          err
        );
        return await handleBackup(data, fileName, type);
      }
    }

    // Create the data directory
    const dataHandle = await savedDirectoryHandle.getDirectoryHandle(
      "data",
      { create: true }
    );

    if (type === "excel") {
      const fileHandle = await dataHandle.getFileHandle(`${fileName}.xlsx`, {
        create: true,
      });
      const writable = await fileHandle.createWritable();

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data]);
      XLSX.utils.book_append_sheet(wb, ws, "SalesData");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      await writable.write(excelBuffer);
      await writable.close();
    } else if (type === "image" && typeof data === "string") {
      const extension = data.split(";")[0].split("/")[1] || "jpg";
      const fileHandle = await dataHandle.getFileHandle(
        `${fileName}.${extension}`,
        { create: true }
      );
      const writable = await fileHandle.createWritable();

      const blob = await fetch(data).then((res) => res.blob());
      await writable.write(blob);
      await writable.close();
    }

    return true;
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
