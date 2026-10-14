const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const db = require('./database');

// Initialize Database on startup
db.initializeDatabase();

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static file serving
app.use('/uploads', express.static(config.UPLOADS_DIR));
app.use(express.static(config.STATIC_DIR));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/coaches', require('./routes/coaches'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/rubrics', require('./routes/rubrics'));
app.use('/api/ethics', require('./routes/ethics'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/admin', require('./routes/admin'));

// Healthcheck
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        service: 'Tamkeen Al-Roaya Master Coach Platform v3.0',
        platformUrl: 'cyce52.com',
        founder: 'الماستر كوتش عبدالكريم الخليفي',
        timestamp: new Date().toISOString()
    });
});

// Explicit JSON 404 for unrecognized API endpoints
app.use('/api', (req, res) => {
    res.status(404).json({
        error: 'المسار البرمجي المطلوب غير موجود في واجهة المنصة (404 Not Found)',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Single Page Application Fallback (Express 5 compatible)
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
        return res.sendFile(path.resolve(config.STATIC_DIR, 'index.html'));
    }
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
        error: 'حدث خطأ غير متوقع في الخادم',
        details: err.message
    });
});

let server = null;
if (require.main === module) {
    server = app.listen(config.PORT, () => {
        console.log(`\n================================================================`);
        console.log(`  منظومة إعداد وتأهيل الماستر كوتش (الإصدار 3.0) - تمكين الرؤية`);
        console.log(`  إعداد: الماستر كوتش عبدالكريم الخليفي (cyce52.com)`);
        console.log(`  الخادم يعمل بنجاح على: http://localhost:${config.PORT}`);
        console.log(`================================================================\n`);
    });
}

module.exports = { app, server };
