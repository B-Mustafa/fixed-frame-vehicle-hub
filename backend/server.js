const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    vehicleSales: [],
    vehiclePurchases: [],
    duePayments: [],
    lastSaleId: 0,
    lastPurchaseId: 0
  }));
}

// Helper function to read data
const readData = () => {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
};

// Helper function to write data
const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Sales endpoints
app.get('/api/sales', (req, res) => {
  const data = readData();
  res.json(data.vehicleSales);
});

app.get('/api/sales/:id', (req, res) => {
  const data = readData();
  const sale = data.vehicleSales.find(s => s.id === parseInt(req.params.id));
  res.json(sale || null);
});

app.post('/api/sales', (req, res) => {
  const data = readData();
  const newId = ++data.lastSaleId;
  const newSale = { ...req.body, id: newId };
  data.vehicleSales.push(newSale);
  writeData(data);
  res.json(newSale);
});

app.put('/api/sales/:id', (req, res) => {
  const data = readData();
  const index = data.vehicleSales.findIndex(s => s.id === parseInt(req.params.id));
  if (index >= 0) {
    data.vehicleSales[index] = { ...data.vehicleSales[index], ...req.body };
    writeData(data);
    res.json(data.vehicleSales[index]);
  } else {
    res.status(404).json({ error: 'Sale not found' });
  }
});

app.delete('/api/sales/:id', (req, res) => {
  const data = readData();
  data.vehicleSales = data.vehicleSales.filter(s => s.id !== parseInt(req.params.id));
  writeData(data);
  res.json({ success: true });
});
app.delete('/api/purchase/:id', (req, res) => {
  const data = readData();
  data.vehiclePurchases = data.vehiclePurchases.filter(s => s.id !== parseInt(req.params.id));
  writeData(data);
  res.json({ success: true });
});
app.delete('/api/duelist/:id', (req, res) => {
  const data = readData();
  data.vehcicleDuelist = data.vehcicleDuelist.filter(s => s.id !== parseInt(req.params.id));
  writeData(data);
  res.json({ success: true });
});

// Similar endpoints for purchases and duePayments...

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});