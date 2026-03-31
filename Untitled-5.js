// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'users',
    timestamps: true,
  });

  User.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.password_hash;
    return values;
  };

  return User;
};

// models/UserProfile.js
module.exports = (sequelize, DataTypes) => {
  const UserProfile = sequelize.define('UserProfile', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    // дополнительные поля пустые по умолчанию
  }, {
    tableName: 'user_profiles',
    timestamps: true,
  });

  return UserProfile;
};
// routes/auth.js
const express = require('express');
const router = express.Router();
const { User, UserProfile } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

// Параметры окружения для JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Валидация входных данных
const registerValidation = [
  check('email')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  check('full_name')
    .notEmpty().withMessage('Full name is required'),
  check('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// POST /api/auth/register
router.post(
  '/register',
  registerValidation,
  async (req, res) => {
    // Валидация
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, full_name, password } = req.body;

    try {
      // Проверка уникальности email
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      // Хеширование пароля
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Создание пользователя
      const user = await User.create({
        email,
        full_name,
        password_hash,
      });

      // Автоматически создать пустую запись в UserProfile
      await UserProfile.create({
        user_id: user.id,
        // дополнительные поля по умолчанию
      });

      // Генерация JWT-токена
      const token = jwt.sign(
        { sub: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Ответ: данные пользователя без пароля и токен
      const userData = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        // любые другие безопасные поля
      };

      return res.status(201).json({
        token,
        user: userData,
      });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
// app.js
const express = require('express');
const app = express();
app.use(express.json());

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Прочие настройки (порты, БД и т.д.)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});