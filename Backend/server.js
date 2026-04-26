const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
require('dotenv').config();

// Initialize the Express application
const app = express();
require('./config/db'); // Import the database connection (this will test the connection immediately)

// ── MIDDLEWARE ────────────────────────────────────
app.use(cors({
    origin: [
        'https://ymca-campus-care-portal.vercel.app', 
        'http://localhost:5000',                      // Local testing
        'http://127.0.0.1:5500'                       // For live server testing (if used)
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // Allow cookies and authentication headers if needed
}));

// express.json() tells the server how to read JSON data sent from your frontend forms
app.use(express.json()); 



// ── TEST ROUTE ────────────────────────────────────
// A simple endpoint to keep both Render and Aiven awake
app.get('/', async (req, res) => {
    try {
        // This tiny query forces Aiven to register activity so it doesn't power off
        await pool.query('SELECT 1'); 
        
        res.status(200).send('Hello from the backend! Server and Database are up and running.');
    } catch (error) {
        console.error('Keep-alive query failed:', error);
        res.status(500).send('Server is up, but database is disconnected.');
    }
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