import express from 'express';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import XLSX from 'xlsx';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SALES_FILE = path.join(__dirname, 'sales_data.xlsx');
// File paths configuration
const PURCHASE_FILE = path.join(__dirname, 'purchase_data.xlsx');
const PURCHASE_IMAGES_DIR = path.join(__dirname, 'Purchase_Images');
1;

// Create directories if they don't exist
fs.mkdirSync(PURCHASE_IMAGES_DIR, { recursive: true });

const app = express();
const PORT = 3001;

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://192.168.2.7:8080',
    'http://192.168.2.7',
    'http://192.168.2.71:8080',
    'http://192.168.2.71'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));



app.use(express.json());

const updateExcelFile = (newData) => {
  let workbook;
  let worksheet;
  let sales = [];

  try {
    console.log('Updating Excel file with data:', JSON.stringify(newData, null, 2));
    
    // Ensure ID is properly set
    if (!newData.id) {
      console.error('Missing ID in sale data');
      return false;
    }
    
    // Read existing file if it exists
    if (fs.existsSync(SALES_FILE)) {
      console.log('Reading existing sales file:', SALES_FILE);
      workbook = XLSX.readFile(SALES_FILE);
      worksheet = workbook.Sheets[workbook.SheetNames[0]];
      sales = XLSX.utils.sheet_to_json(worksheet);
    } else {
      console.log('Creating new sales file:', SALES_FILE);
      workbook = XLSX.utils.book_new();
      worksheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    }

    // Deep clone the data to avoid modifying the original
    const flattenedData = JSON.parse(JSON.stringify(newData));
    
    // Add installment fields to the flattened data
    if (newData.installments && Array.isArray(newData.installments)) {
      newData.installments.forEach((inst, index) => {
        if (inst && inst.enabled) {
          flattenedData[`installment_${index + 1}_date`] = inst.date || '';
          flattenedData[`installment_${index + 1}_amount`] = Number(inst.amount) || 0;
          flattenedData[`installment_${index + 1}_paid`] = Number(inst.paid) || 0;
        }
      });
    }
    
    // Remove the original installments array to avoid duplication
    delete flattenedData.installments;

    // Make sure ID is treated as a number if it's numeric
    const idToMatch = typeof newData.id === 'string' && !isNaN(newData.id) 
      ? Number(newData.id) 
      : newData.id;
    
    // Find and update existing record or add new
    const existingIndex = sales.findIndex(s => 
      (typeof s.id === 'number' && typeof idToMatch === 'number' && s.id === idToMatch) || 
      (String(s.id) === String(idToMatch))
    );
    
    if (existingIndex >= 0) {
      console.log(`Updating existing sale at index ${existingIndex}`);
      sales[existingIndex] = flattenedData;
    } else {
      console.log('Adding new sale record');
      sales.push(flattenedData);
    }

    // Write updated data back to file
    const newWorksheet = XLSX.utils.json_to_sheet(sales);
    workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;
    XLSX.writeFile(workbook, SALES_FILE);
    console.log('Excel file updated successfully');

    return true;
  } catch (error) {
    console.error('Excel update error:', error);
    return false;
  }
};

// Updated endpoint for better error handling
app.post('/api/update-sales', (req, res) => {
  try {
    const saleData = req.body;
    
    if (!saleData) {
      return res.status(400).json({ error: 'No data provided' });
    }
    
    // Ensure we have an ID (use timestamp if not provided)
    if (!saleData.id) {
      saleData.id = Date.now();
    }

    console.log('Received update request for sale ID:', saleData.id);
    
    const success = updateExcelFile(saleData);
    
    if (success) {
      return res.status(200).json({ 
        message: 'Sales record updated successfully',
        id: saleData.id 
      });
    } else {
      return res.status(500).json({ error: 'Failed to update sales record' });
    }
  } catch (error) {
    console.error('Error in /api/update-sales endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Multer configuration with error handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'Vehicle_Images');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

app.post('/api/import-sales', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the uploaded Excel file
    const workbook = XLSX.readFile(req.file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Process the data to match your VehicleSale structure
    const processedSales = jsonData.map((item) => {
      const installments = [];
      
      // Process installment fields (if they exist in the Excel)
      for (let i = 1; i <= 30; i++) {
        const dateKey = `installment_${i}_date`;
        const amountKey = `installment_${i}_amount`;
        const paidKey = `installment_${i}_paid`;
        
        if (item[dateKey] || item[amountKey]) {
          installments.push({
            date: item[dateKey] || "",
            amount: item[amountKey] || 0,
            paid: item[paidKey] || 0,
            enabled: true
          });
        } else {
          installments.push({
            date: "",
            amount: 0,
            paid: 0,
            enabled: false
          });
        }
      }

      return {
        id: item.id || Date.now(),
        manualId: item.manualId || item.id?.toString() || "",
        date: item.date || new Date().toISOString().split('T')[0],
        party: item.party || "",
        address: item.address || "",
        phone: item.phone || "",
        model: item.model || "",
        vehicleNo: item.vehicleNo || "",
        chassis: item.chassis || "",
        price: item.price || 0,
        transportCost: item.transportCost || 0,
        insurance: item.insurance || 0,
        finance: item.finance || 0,
        repair: item.repair || 0,
        penalty: item.penalty || 0,
        total: item.total || 0,
        dueDate: item.dueDate || new Date().toISOString().split('T')[0],
        dueAmount: item.dueAmount || 0,
        witness: item.witness || "",
        witnessAddress: item.witnessAddress || "",
        witnessContact: item.witnessContact || "",
        witnessName2: item.witnessName2 || "",
        remark: item.remark || "",
        photoUrl: item.photoUrl || "",
        remark_installment: item.remark_installment || "",
        installments: installments
      };
    });

    // Save to Excel file
    const excelWorkbook = XLSX.utils.book_new();
    const excelWorksheet = XLSX.utils.json_to_sheet(processedSales);
    XLSX.utils.book_append_sheet(excelWorkbook, excelWorksheet, "Sales");
    XLSX.writeFile(excelWorkbook, SALES_FILE);

    // Return the processed data
    res.json({
      success: true,
      count: processedSales.length,
      sales: processedSales
    });

    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to import sales data',
      details: error.message
    });
  }
});
// File upload endpoint
app.post('/upload-vehicle-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({
    success: true,
    imageUrl: `/Vehicle_Images/${req.file.filename}`
  });
});

// Serve uploaded images
app.use('/Vehicle_Images', express.static(path.join(__dirname, 'Vehicle_Images')));

// Purchase Excel file operations
const updatePurchaseExcelFile = (newData) => {
  try {
    let workbook;
    let purchases = [];

    // Read existing file if it exists
    if (fs.existsSync(PURCHASE_FILE)) {
      workbook = XLSX.readFile(PURCHASE_FILE);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      purchases = XLSX.utils.sheet_to_json(worksheet);
    } else {
      workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([]), 'Purchases');
    }

    // Find and update existing record or add new
    const existingIndex = purchases.findIndex(p => p.id === newData.id);
    if (existingIndex >= 0) {
      purchases[existingIndex] = newData;
    } else {
      purchases.push(newData);
    }

    // Create new worksheet with updated data
    const newWorksheet = XLSX.utils.json_to_sheet(purchases);
    
    // Replace the worksheet in the workbook
    workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;
    
    // Write updated data back to file
    XLSX.writeFile(workbook, PURCHASE_FILE);

    return true;
  } catch (error) {
    console.error('Purchase Excel update error:', error);
    return false;
  }
};

// API endpoint to handle purchase data updates
app.post('/api/update-purchase', (req, res) => {
  try {
    const purchaseData = req.body;
    
    if (!purchaseData?.id) {
      return res.status(400).json({ 
        error: 'Invalid data format',
        details: 'Missing required field: id'
      });
    }

    const success = updatePurchaseExcelFile(purchaseData);
    
    if (success) {
      return res.json({ 
        message: 'Purchase record updated successfully',
        record: purchaseData
      });
    } else {
      return res.status(500).json({ 
        error: 'Failed to update purchase record',
        details: 'Check server logs for more information'
      });
    }
  } catch (error) {
    console.error('Error in /api/update-purchase:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Add this to your server endpoints
app.delete('/api/delete-purchase/:id', (req, res) => {
  try {
    const purchaseId = req.params.id;
    
    if (!purchaseId) {
      return res.status(400).json({ error: 'Missing purchase ID' });
    }

    let workbook;
    let purchases = [];

    // Read existing file
    if (fs.existsSync(PURCHASE_FILE)) {
      workbook = XLSX.readFile(PURCHASE_FILE);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      purchases = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return res.status(404).json({ error: 'Purchase file not found' });
    }

    // Filter out the deleted purchase
    const updatedPurchases = purchases.filter(p => p.id != purchaseId);

    // Update the Excel file
    const newWorksheet = XLSX.utils.json_to_sheet(updatedPurchases);
    workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;
    XLSX.writeFile(workbook, PURCHASE_FILE);

    res.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    res.status(500).json({ error: 'Failed to delete purchase' });
  }
});

// Multer configuration for purchase images
const purchaseImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PURCHASE_IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'purchase-' + uniqueSuffix + ext);
  }
});

const purchaseImageUpload = multer({ 
  storage: purchaseImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Purchase image upload endpoint
app.post('/upload-purchase-image', purchaseImageUpload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    success: true,
    imageUrl: `/Purchase_Images/${req.file.filename}`
  });
});

// Serve purchase images
app.use('/Purchase_Images', express.static(PURCHASE_IMAGES_DIR));


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


