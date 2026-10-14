const path = require('path');

module.exports = {
    PORT: process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET || 'tamkeen-master-coach-alroaya-v3-secret-key-2026',
    JWT_EXPIRES_IN: '7d',
    DB_PATH: process.env.DB_PATH || path.resolve(__dirname, '../data/platform.db'),
    UPLOADS_DIR: process.env.UPLOADS_DIR || path.resolve(__dirname, '../uploads'),
    STATIC_DIR: path.resolve(__dirname, '../')
};
