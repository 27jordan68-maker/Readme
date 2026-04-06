# Создайте папку проекта и перейдите в неё
mkdir my-project
cd my-project

# Инициализируйте Git репозиторий
git init

# Создайте структуру папок
mkdir -p models routes controllers middleware config

# Создайте основные файлы
touch app.js server.js .env .gitignore README.md

# Инициализируйте package.json
npm init -y
# Основные зависимости
npm install express pg dotenv cors helmet morgan

# Зависимости для разработки
npm install -D nodemon
# Server configuration
PORT=3000
NODE_ENV=development

# Database configuration (PostgreSQL example)
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database

# Для MySQL используйте:
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=your_database
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20, // максимальное количество клиентов в пуле
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Для MySQL используйте:
// const mysql = require('mysql2/promise');
// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// Проверка подключения
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ База данных успешно подключена');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error.message);
    return false;
  }
};

module.exports = { pool, testConnection };
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { testConnection } = require('./config/db');

const app = express();

// Middleware
app.use(helmet()); // Безопасность
app.use(cors()); // CORS
app.use(morgan('dev')); // Логирование
app.use(express.json()); // Парсинг JSON
app.use(express.urlencoded({ extended: true })); // Парсинг URL-encoded

// Тестовый маршрут
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Сервер работает',
    timestamp: new Date().toISOString()
  });
});

// Подключение роутов (будет добавлено позже)
// app.use('/api/users', require('./routes/userRoutes'));
// app.use('/api/products', require('./routes/productRoutes'));

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;
const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  // Проверяем подключение к БД
  const isDbConnected = await testConnection();
  
  if (!isDbConnected) {
    console.error('❌ Не удалось подключиться к базе данных');
    process.exit(1);
  }

  // Запускаем сервер
  const server = app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📝 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 http://localhost:${PORT}`);
  });

  // Обработка ошибок сервера
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Порт ${PORT} уже используется`);
    } else {
      console.error('❌ Ошибка сервера:', error);
    }
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM сигнал получен, закрываю сервер...');
    server.close(() => {
      console.log('✅ Сервер закрыт');
      process.exit(0);
    });
  });
};

startServer();
const { pool } = require('../config/db');

class User {
  static async findAll() {
    const result = await pool.query('SELECT * FROM users');
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(userData) {
    const { name, email } = userData;
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    return result.rows[0];
  }
}

module.exports = User;
const { pool } = require('../config/db');

class User {
  static async findAll() {
    const result = await pool.query('SELECT * FROM users');
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(userData) {
    const { name, email } = userData;
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    return result.rows[0];
  }
}

module.exports = User;const { pool } = require('../config/db');

class User {
  static async findAll() {
    const result = await pool.query('SELECT * FROM users');
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(userData) {
    const { name, email } = userData;
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    return result.rows[0];
  }
}

module.exports = User;const User = require('../models/userModel');

const getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUserById, createUser };
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
