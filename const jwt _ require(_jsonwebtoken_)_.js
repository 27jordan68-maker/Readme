const jwt = require('jsonwebtoken');

// Секретный ключ (лучше хранить в переменных окружения)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function authMiddleware(req, res, next) {
  // Получаем заголовок Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Токен не предоставлен' });
  }

  // Ожидаем формат "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Неверный формат токена. Используйте Bearer <token>' });
  }

  const token = parts[1];

  try {
    // Верификация токена
    const decoded = jwt.verify(token, JWT_SECRET);
    // Добавляем данные пользователя в объект запроса
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Срок действия токена истёк' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Недействительный токен' });
    }
    return res.status(500).json({ message: 'Ошибка проверки токена' });
  }
}

module.exports = authMiddleware;
const authMiddleware = require('./authMiddleware');

function adminMiddleware(req, res, next) {
  // Сначала проверяем JWT через authMiddleware
  authMiddleware(req, res, (err) => {
    if (err) {
      return next(err); // Пробрасываем ошибку от authMiddleware
    }

    // После успешной аутентификации проверяем роль
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещён. Требуется роль администратора.' });
    }

    next();
  });
}

module.exports = adminMiddleware;
const express = require('express');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./middleware/authMiddleware');
const adminMiddleware = require('./middleware/adminMiddleware');

const app = express();
app.use(express.json());

// Секретный ключ (должен совпадать с тем, что в middleware)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Роут для получения токена (пример)
app.post('/login', (req, res) => {
  // Здесь обычно проверка логина/пароля
  const { role } = req.body; // например, 'user' или 'admin'

  const payload = {
    userId: 123,
    role: role || 'user'
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Защищённый роут – доступ для любого аутентифицированного пользователя
app.get('/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Админский роут – только для администраторов
app.get('/admin/users', adminMiddleware, (req, res) => {
  res.json({ message: 'Список пользователей (только для админов)', admin: req.user });
});

app.listen(3000, () => console.log('Сервер запущен на порту 3000'));