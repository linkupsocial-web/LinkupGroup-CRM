const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const Admin = require('../models/Admin');

const {
  protect,
  superAdminOnly,
  JWT_SECRET,
} = require('../middleware/auth');

const generateToken = (email) => {
  return jwt.sign(
    {
      id: 'env-admin',
      email,
      name: 'Super Admin',
      role: 'admin',
      isSuperAdmin: true,
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
};


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD;

    if (!envEmail || !envPassword) {
      console.error('ADMIN_EMAIL or ADMIN_PASSWORD is missing in .env');

      return res.status(500).json({
        success: false,
        message: 'Admin credentials are not configured on server',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const isValidEmail = normalizedEmail === envEmail;
    const isValidPassword = password === envPassword;

    if (!isValidEmail || !isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT_SECRET is not configured on server',
      });
    }

    const token = generateToken(envEmail);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: 'env-admin',
        name: 'Super Admin',
        email: envEmail,
        role: 'admin',
        isSuperAdmin: true,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
});


router.get('/me', protect, async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});


router.get(
  '/users',
  protect,
  superAdminOnly,
  async (req, res) => {
    try {
      const users = await Admin.find()
        .select('-password')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


router.post(
  '/register',
  protect,
  superAdminOnly,
  async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, email and password are required',
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const exists = await Admin.findOne({
        email: normalizedEmail,
      });

      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }

      const admin = await Admin.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: role || 'admin',
        isSuperAdmin: false,
      });

      return res.status(201).json({
        success: true,
        message: 'Admin created successfully',
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isSuperAdmin: admin.isSuperAdmin,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

router.post('/logout', protect, async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

module.exports = router;



