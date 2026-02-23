const path = require('path');
const dotenv = require('dotenv');
// Load .env FIRST before any other imports that might read process.env
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());

// Relax helmet CSP so API responses aren't blocked (adjust for prod as needed)
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' })); // allow larger payloads for raw text input
app.use(express.urlencoded({ extended: true }));

// Serve composed Instagram slides (if stored as local files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Database ─────────────────────────────────────────────────────────────────
const mongoURI =
    process.env.MONGO_URI || 'mongodb://localhost:27017/ai-repurpose';

mongoose
    .connect(mongoURI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'AI Repurpose API is running',
        mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('💥 Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Debug config: http://localhost:${PORT}/api/debug-config`);

    if (!process.env.GEMINI_API_KEY) {
        console.warn('⚠️  GEMINI_API_KEY is not set — add it to .env');
    } else {
        console.log('✅ GEMINI_API_KEY is configured');
    }

    if (!process.env.MONGO_URI) {
        console.warn('⚠️  MONGO_URI not set — using localhost default');
    }
});

// Graceful shutdown
const shutdown = () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close(() => {
        mongoose.connection.close(false, () => {
            console.log('✅ MongoDB connection closed');
            process.exit(0);
        });
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);