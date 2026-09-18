const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not configured in .env');
}

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, please login',
      });
    }

    const token = authHeader.split(' ')[1];

    if (
      !token ||
      token === 'null' ||
      token === 'undefined' ||
      token.trim() === ''
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT configuration is missing on server',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !decoded.email) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }

    // Verify that this JWT belongs to the admin configured in .env
    const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    if (!envEmail || decoded.email !== envEmail) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin session',
      });
    }

    req.user = {
      id: decoded.id || 'env-admin',
      name: decoded.name || 'Super Admin',
      email: decoded.email,
      role: decoded.role || 'admin',
      isSuperAdmin: decoded.isSuperAdmin === true,
    };

    next();
  } catch (error) {
    console.error('Authentication Error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. Please login again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized, please login',
    });
  }
};

const superAdminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, please login',
    });
  }

  if (req.user.isSuperAdmin || req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: Admin privileges required',
  });
};

module.exports = {
  protect,
  superAdminOnly,
  JWT_SECRET,
};


