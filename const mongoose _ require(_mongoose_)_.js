const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

module.exports = mongoose.model('User', userSchema);
const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startDate: Date,
  endDate: Date
});

module.exports = mongoose.model('Tournament', tournamentSchema);
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tournament_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  captain_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  member_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
const Team = require('../models/Team');
const User = require('../models/User');
const Tournament = require('../models/Tournament');

// POST /api/admin/teams – создание команды админом
exports.createTeam = async (req, res) => {
  try {
    const { name, tournament_id, captain_id, member_ids } = req.body;

    // 1. Все участники существуют
    const allMemberIds = [...new Set([captain_id, ...member_ids])];
    const users = await User.find({ _id: { $in: allMemberIds } });
    if (users.length !== allMemberIds.length) {
      return res.status(400).json({ error: 'One or more users not found' });
    }

    // 2. Капитан входит в состав
    if (!member_ids.includes(captain_id)) {
      return res.status(400).json({ error: 'Captain must be a member of the team' });
    }

    // 3. Минимум 3 участника (включая капитана)
    if (allMemberIds.length < 3) {
      return res.status(400).json({ error: 'Team must have at least 3 members' });
    }

    // 4. Существует ли турнир
    const tournament = await Tournament.findById(tournament_id);
    if (!tournament) return res.status(400).json({ error: 'Tournament not found' });

    const team = new Team({ name, tournament_id, captain_id, member_ids });
    await team.save();
    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/teams/:id – редактирование команды
exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, captain_id, member_ids } = req.body;

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Валидация участников (аналогично созданию)
    if (captain_id && member_ids) {
      const allIds = [...new Set([captain_id, ...member_ids])];
      const users = await User.find({ _id: { $in: allIds } });
      if (users.length !== allIds.length) {
        return res.status(400).json({ error: 'One or more users not found' });
      }
      if (!member_ids.includes(captain_id)) {
        return res.status(400).json({ error: 'Captain must be a member' });
      }
      if (allIds.length < 3) {
        return res.status(400).json({ error: 'Team must have at least 3 members' });
      }
      team.captain_id = captain_id;
      team.member_ids = member_ids;
    }
    if (name) team.name = name;

    await team.save();
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/teams/:id – удаление команды
exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await Team.findByIdAndDelete(id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/teams – список всех команд для админа (с пагинацией, данными о турнире и участниках)
exports.getAllTeamsAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const teams = await Team.find()
      .populate('tournament_id', 'name startDate endDate')
      .populate('captain_id', 'name email')
      .populate('member_ids', 'name email')
      .skip(skip)
      .limit(limit);

    const total = await Team.countDocuments();

    res.json({
      data: teams,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/teams – публичный список команд (без турнирной информации)
exports.getTeamsPublic = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const teams = await Team.find()
      .select('name captain_id member_ids') // без tournament_id
      .populate('captain_id', 'name')
      .populate('member_ids', 'name')
      .skip(skip)
      .limit(limit);

    const total = await Team.countDocuments();

    res.json({
      data: teams,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const { body } = require('express-validator');

exports.validateCreateTeam = [
  body('name').notEmpty().withMessage('Name is required'),
  body('tournament_id').isMongoId().withMessage('Invalid tournament ID'),
  body('captain_id').isMongoId().withMessage('Invalid captain ID'),
  body('member_ids').isArray({ min: 2 }).withMessage('At least 2 members required (captain +1)'),
  body('member_ids.*').isMongoId()
];

exports.validateUpdateTeam = [
  body('name').optional().notEmpty(),
  body('captain_id').optional().isMongoId(),
  body('member_ids').optional().isArray({ min: 2 }),
  body('member_ids.*').optional().isMongoId()
];
const { validationResult } = require('express-validator');

exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { validateCreateTeam, validateUpdateTeam } = require('../middleware/teamValidation');
const { handleValidationErrors } = require('../middleware/validationHandler');
const adminMiddleware = require('../middleware/adminMiddleware');

// Админские маршруты
router.post('/admin/teams', adminMiddleware, validateCreateTeam, handleValidationErrors, teamController.createTeam);
router.put('/admin/teams/:id', adminMiddleware, validateUpdateTeam, handleValidationErrors, teamController.updateTeam);
router.delete('/admin/teams/:id', adminMiddleware, teamController.deleteTeam);
router.get('/admin/teams', adminMiddleware, teamController.getAllTeamsAdmin);

// Публичный маршрут
router.get('/teams', teamController.getTeamsPublic);

module.exports = router;
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const teamRoutes = require('./routes/teamRoutes');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

app.use('/api', teamRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
curl http://localhost:3000/api/teams?page=1&limit=5
  