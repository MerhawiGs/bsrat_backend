const jwt = require('jsonwebtoken');
const User = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * Generate JWT token for user
 */
function generateToken(user) {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
    );
}

/**
 * Verify JWT token from request
 */
async function verifyToken(req, res, next) {
    try {
        // Get token from header or cookie
        let token = null;
        
        // Check Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        
        // Check cookie if no header token
        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user from database
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ error: 'User not found.' });
        }
        
        if (!user.isActive) {
            return res.status(401).json({ error: 'User account is deactivated.' });
        }
        
        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired.' });
        }
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication failed.' });
    }
}

/**
 * Check if user is superadmin
 */
function requireSuperAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }
    
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Superadmin access required.' });
    }
    
    next();
}

/**
 * Check if user is admin or superadmin
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    
    next();
}

module.exports = {
    generateToken,
    verifyToken,
    requireSuperAdmin,
    requireAdmin,
    JWT_SECRET,
    JWT_EXPIRE
};
