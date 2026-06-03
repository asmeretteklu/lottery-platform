require('dotenv').config({ path: '../../.env' }); // Load from root .env
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const lotteriesRoutes = require('./routes/lotteries');
const drawsRoutes = require('./routes/draws');
const ticketsRoutes = require('./routes/tickets');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/lotteries', lotteriesRoutes);
app.use('/draws', drawsRoutes);
app.use('/tickets', ticketsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
