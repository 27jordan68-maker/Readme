// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    full_name: DataTypes.STRING,
    role: { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'user' },
    is_blocked: { type: DataTypes.BOOLEAN, defaultValue: false }
  });
  User.associate = (models) => {
    User.hasOne(models.UserProfile, { foreignKey: 'user_id' });
  };
  return User;
};

// models/UserProfile.js
module.exports = (sequelize, DataTypes) => {
  const UserProfile = sequelize.define('UserProfile', {
    user_id: { type: DataTypes.INTEGER, unique: true },
    age: DataTypes.INTEGER,
    phone: DataTypes.STRING,
    avatar: DataTypes.STRING  // URL
  });
  return UserProfile;
};
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, is_blocked } = req.query;
    const offset = (page - 1) * limit;

    // Базовый where для поиска и фильтрации
    const where = {};

    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { full_name: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (role && ['user', 'admin'].includes(role)) {
      where.role = role;
    }
    if (is_blocked !== undefined) {
      where.is_blocked = is_blocked === 'true';
    }

    // Запрос с включением профиля
    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: UserProfile, attributes: ['age', 'phone', 'avatar'] }],
      attributes: { exclude: ['password'] }, // пароль не возвращаем
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/admin/users/:id/block', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Переключаем статус блокировки
    user.is_blocked = !user.is_blocked;
    await user.save();

    // Не возвращаем пароль
    const { password, ...userData } = user.toJSON();
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/admin/users/:id/role', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "user" or "admin"' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Защита: нельзя понизить последнего админа
    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await User.count({ where: { role: 'admin' } });
      if (adminCount === 1) {
        return res.status(400).json({ error: 'Cannot demote the only admin' });
      }
    }

    user.role = role;
    await user.save();

    const { password, ...userData } = user.toJSON();
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});