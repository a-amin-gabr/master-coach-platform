const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database');

function authenticate(req, res, next) {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            error: 'يرجى تسجيل الدخول أولاً للوصول إلى هذه الخدمة',
            code: 'AUTH_REQUIRED'
        });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        const user = db.getUserById(decoded.id);

        if (!user) {
            return res.status(401).json({
                error: 'المستخدم المرتبط بهذا الرمز غير موجود أو تم حذفه',
                code: 'USER_NOT_FOUND'
            });
        }

        req.user = user;

        if (user.role === 'coach') {
            const coach = db.getCoachByUserId(user.id);
            req.coach = coach;
        }

        next();
    } catch (err) {
        return res.status(401).json({
            error: 'رمز الجلسة غير صالح أو منتهي الصلاحية',
            code: 'INVALID_TOKEN',
            details: err.message
        });
    }
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'يرجى تسجيل الدخول أولاً',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'غير مصرح لك بتنفيذ هذا الإجراء (صلاحيات غير كافية)',
                code: 'FORBIDDEN',
                requiredRoles: allowedRoles,
                currentRole: req.user.role
            });
        }

        next();
    };
}

module.exports = {
    authenticate,
    requireRole
};
