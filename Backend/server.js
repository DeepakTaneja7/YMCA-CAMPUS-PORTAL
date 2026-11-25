const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./config/db');

const app = express();

app.use(cors({
  origin: [
    'https://ymca-campus-care-portal.vercel.app',
    'http://localhost:5000',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Backend is awake and running.');
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const complaintRoutes = require('./routes/complaints');
app.use('/api/complaints', complaintRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is officially running on http://localhost:${PORT}`);
});