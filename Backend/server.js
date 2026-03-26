const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize the Express application
const app = express();
require('./config/db'); // Import the database connection (this will test the connection immediately)

// ── MIDDLEWARE ────────────────────────────────────
// cors() gives your frontend HTML files permission to talk to this backend
app.use(cors()); 

// express.json() tells the server how to read JSON data sent from your frontend forms
app.use(express.json()); 

// ── TEST ROUTE ────────────────────────────────────
// A simple endpoint to check if the server is alive
app.get('/', (req, res) => {
    res.send('Hello from the backend! The server is up and running.');
});

// ── API ROUTES ────────────────────────────────────
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const complaintRoutes = require('./routes/complaints');
app.use('/api/complaints', complaintRoutes);

// ── START THE SERVER ──────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server is officially running on http://localhost:${PORT}`);
});