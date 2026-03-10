# Readme
# Создание папки проекта
mkdir fidjital-sport-api
cd fidjital-sport-api

# Инициализация Git
git init

# Создание .gitignore
echo "node_modules/
.env
.DS_Store
dist/
coverage/
*.log" > .gitignore

# Инициализация npm проекта
npm init -
# Основные зависимости
npm install express cors dotenv helmet morgan

# Для работы с БД (выберите один вариант)
# Для PostgreSQL:
npm install pg sequelize

# ИЛИ для MySQL:
npm install mysql2 sequelize

# Для разработки
npm install -D nodemon
# Создание структуры папок
mkdir -p src/{models,routes,controllers,middleware,config,utils}
mkdir -p src/models
mkdir -p src/routes
mkdir -p src/controllers
mkdir -p src/middleware
mkdir -p src/config
mkdir -p src/utils
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false
  }
);

module.exports = sequelize;
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const sequelize = require('./config/database');
const apiRoutes = require('./routes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
# Создание папки проекта
mkdir fidjital-sport-api
cd fidjital-sport-api

# Инициализация Git
git init

# Создание .gitignore
echo "node_modules/
.env
.DS_Store
dist/
coverage/
*.log" > .gitignore

# Инициализация npm проекта
npm init -
# Основные зависимости
npm install express cors dotenv helmet morgan

# Для работы с БД (выберите один вариант)
# Для PostgreSQL:
npm install pg sequelize

# ИЛИ для MySQL:
npm install mysql2 sequelize

# Для разработки
npm install -D nodemon
# Создание структуры папок
mkdir -p src/{models,routes,controllers,middleware,config,utils}
mkdir -p src/models
mkdir -p src/routes
mkdir -p src/controllers
mkdir -p src/middleware
mkdir -p src/config
mkdir -p src/utils
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false
  }
);

module.exports = sequelize;
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const sequelize = require('./config/database');
const apiRoutes = require('./routes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Database connection
sequelize.authenticate()
  .then(() => {
    console.log('Database connected successfully');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('Database synced');
  })
  .catch(err => {
    console.error('Unable to connect to database:', err);
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(Server running on port ${PORT});
});
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sportType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  skillLevel: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'professional'),
    defaultValue: 'beginner'
  }
}, {
  timestamps: true
});

module.exports = User;
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fidjital_sport
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_DIALECT=postgres

# JWT
JWT_SECRET=your_jwt_secret_key_here
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}
