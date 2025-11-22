const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./database/database.js');

const appointmentRoutes = require('./routes/appointmentRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/appointments', appointmentRoutes);

app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Bisrat Travel Agency API!',
    version: '1.0.0',
    endpoints: {
      appointments: '/appointments',
      health: '/health'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: db.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, () => {
  console.log('═══════════════════════════════════════════');
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📅 Appointments API: http://localhost:${port}/appointments`);
  console.log(`💚 Health check: http://localhost:${port}/health`);
  console.log('═══════════════════════════════════════════');
});