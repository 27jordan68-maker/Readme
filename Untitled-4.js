<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8
// utils/validation.js
const validateAge = (age) => {
  if (age === undefined || age === null) return true; // поле необязательное
  const num = Number(age);
  return Number.isInteger(num) && num >= 14 && num <= 100;
};

const validatePhone = (phone) => {
  if (!phone) return true;
  // Пример для российских номеров: +7XXXXXXXXXX или 8XXXXXXXXXX (11 цифр)
  const phoneRegex = /^(\+7|8)?\d{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

module.exports = { validateAge, validatePhone };
// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { profile: true },
    });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
// controllers/profileController.js
const { PrismaClient } = require('@prisma/client');
const { validateAge, validatePhone } = require('../utils/validation');
const prisma = new PrismaClient();

// GET /api/profile
const getProfile = async (req, res) => {
  try {
    // req.user уже содержит User + profile (благодаря include в middleware)
    const { passwordHash, ...userWithoutPassword } = req.user;
    res.json({
      user: userWithoutPassword,
      profile: req.user.profile,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/profile
const updateProfile = async (req, res) => {
  try {
    const { age, phone, telegram, vk_link } = req.body;

    // Валидация
    if (age !== undefined && !validateAge(age)) {
      return res.status(400).json({ error: 'Age must be an integer between 14 and 100' });
    }
    if (phone !== undefined && !validatePhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone format. Use +7XXXXXXXXXX or 8XXXXXXXXXX' });
    }

    const userId = req.user.id;

    // Обновляем или создаём профиль
    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        age: age !== undefined ? Number(age) : undefined,
        phone,
        telegram,
        vkLink: vk_link,
      },
      create: {
        userId,
        age: age !== undefined ? Number(age) : null,
        phone: phone || null,
        telegram: telegram || null,
        vkLink: vk_link || null,
      },
    });

    // Возвращаем обновлённые данные (можно также вернуть req.user + profile)
    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getProfile, updateProfile };
// routes/profileRoutes.js
const express = require('express');
const { getProfile, updateProfile } = require('../controllers/profileController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;
const express = require('express');
const profileRoutes = require('./routes/profileRoutes');

const app = express();
app.use(express.json());
app.use('/api', profileRoutes);