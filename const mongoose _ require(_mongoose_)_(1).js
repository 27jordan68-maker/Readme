const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, enum: ['block_user', 'unblock_user', 'create_team', 'edit_team', 'delete_team', 'create_tournament', 'edit_tournament', 'delete_tournament'] },
  target_type: { type: String, required: true, enum: ['user', 'team', 'tournament'] },
  target_id: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminLog', adminLogSchema);
const AdminLog = require('../models/AdminLog');

const logAdminAction = async (adminId, action, targetType, targetId, details = {}) => {
  try {
    await AdminLog.create({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: String(targetId),
      details
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

module.exports = logAdminAction;
const User = require('../models/User');
const logAdminAction = require('../utils/adminLogger');

const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id; // после аутентификации
    const user = await User.findByIdAndUpdate(userId, { isBlocked: true }, { new: true });

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Логируем действие
    await logAdminAction(adminId, 'block_user', 'user', userId, { reason: req.body.reason || 'no reason' });

    res.json({ message: 'User blocked', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = adminMiddleware;
const User = require('../models/User');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const Feedback = require('../models/Feedback');

const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const blockedUsers = await User.countDocuments({ isBlocked: true });

    const totalTeams = await Team.countDocuments();
    const totalTournaments = await Tournament.countDocuments();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // воскресенье – начало недели
    startOfWeek.setHours(0, 0, 0, 0);

    const newFeedbacksToday = await Feedback.countDocuments({ createdAt: { $gte: startOfToday } });
    const newFeedbacksThisWeek = await Feedback.countDocuments({ createdAt: { $gte: startOfWeek } });

    res.json({
      total_users: totalUsers,
      blocked_users: blockedUsers,
      total_teams: totalTeams,
      total_tournaments: totalTournaments,
      new_feedback_messages: {
        today: newFeedbacksToday,
        week: newFeedbacksThisWeek
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAdminStats };
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');        // проверка JWT
const adminMiddleware = require('../middleware/admin');
const { getAdminStats } = require('../controllers/adminStatsController');

// Все админские роуты требуют аутентификации и прав администратора
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', getAdminStats);

// другие админские роуты (блокировка, удаление, etc.)

module.exports = router;
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isBlocked: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isBlocked: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);