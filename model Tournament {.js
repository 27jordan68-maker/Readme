model Tournament {
  id          String   @id @default(cuid())
  title       String
  description String?
  discipline  String
  startDate   DateTime @map("start_date")
  endDate     DateTime @map("end_date")
  location    String
  contactInfo String   @map("contact_info")
  status      String   @default("draft") // draft, published, finished
  content     String?  @db.Text           // HTML or JSON string
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("tournaments")
}
// middlewares/auth.js
const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};
// validators/tournamentValidator.js
const Joi = require('joi');

const createTournamentSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow(''),
  discipline: Joi.string().required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
  location: Joi.string().required(),
  contact_info: Joi.string().required(),
  content: Joi.string().allow('')   // HTML string
});

const updateTournamentSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string().allow(''),
  discipline: Joi.string(),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  location: Joi.string(),
  contact_info: Joi.string(),
  content: Joi.string().allow(''),
  status: Joi.string().valid('draft', 'published', 'finished')
});
// controllers/tournamentController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/tournaments?status=published&discipline=football
exports.getTournaments = async (req, res) => {
  const { status, discipline } = req.query;
  const where = { status: 'published' }; // only published by default

  if (status && ['published', 'finished'].includes(status)) {
    where.status = status;
  }
  if (discipline) {
    where.discipline = discipline;
  }

  const tournaments = await prisma.tournament.findMany({
    where,
    orderBy: { startDate: 'asc' },
    select: { id: true, title: true, discipline: true, startDate: true, location: true, status: true }
  });
  res.json(tournaments);
};

// GET /api/tournaments/:id
exports.getTournamentById = async (req, res) => {
  const { id } = req.params;
  const tournament = await prisma.tournament.findUnique({ where: { id } });

  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  // Return full object including `content` only if tournament is published
  // (or you may allow preview for admins – but spec says public returns content)
  if (tournament.status !== 'published' && tournament.status !== 'finished') {
    return res.status(404).json({ error: 'Not available' });
  }

  res.json(tournament);
};
// POST /api/admin/tournaments
exports.createTournament = async (req, res) => {
  const { title, description, discipline, start_date, end_date, location, contact_info, content } = req.body;

  const newTournament = await prisma.tournament.create({
    data: {
      title,
      description,
      discipline,
      startDate: new Date(start_date),
      endDate: new Date(end_date),
      location,
      contactInfo: contact_info,
      content: content || null,
      status: 'draft'
    }
  });
  res.status(201).json(newTournament);
};

// PUT /api/admin/tournaments/:id
exports.updateTournament = async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  // Map snake_case to model fields
  if (updateData.start_date) updateData.startDate = new Date(updateData.start_date);
  if (updateData.end_date) updateData.endDate = new Date(updateData.end_date);
  if (updateData.contact_info) updateData.contactInfo = updateData.contact_info;
  delete updateData.start_date;
  delete updateData.end_date;
  delete updateData.contact_info;

  const updated = await prisma.tournament.update({
    where: { id },
    data: updateData
  });
  res.json(updated);
};

// DELETE /api/admin/tournaments/:id
exports.deleteTournament = async (req, res) => {
  const { id } = req.params;
  // Option A: hard delete
  // await prisma.tournament.delete({ where: { id } });

  // Option B: change status to 'finished' (as spec suggests)
  await prisma.tournament.update({
    where: { id },
    data: { status: 'finished' }
  });
  res.status(204).send();
};
npm install sanitize-html
const sanitizeHtml = require('sanitize-html');

// Inside create/update controllers:
const cleanContent = sanitizeHtml(content, {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'div', 'h1', 'h2', 'h3', 'ul', 'li', 'img'],
  allowedAttributes: { a: ['href'], img: ['src', 'alt'] }
});
// routes/public.js
const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');

router.get('/tournaments', tournamentController.getTournaments);
router.get('/tournaments/:id', tournamentController.getTournamentById);

module.exports = router;
// routes/admin.js
const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('../middlewares/auth');
const tournamentController = require('../controllers/tournamentController');
const { validateCreate, validateUpdate } = require('../middlewares/validate');

router.post('/tournaments', adminMiddleware, validateCreate, tournamentController.createTournament);
router.put('/tournaments/:id', adminMiddleware, validateUpdate, tournamentController.updateTournament);
router.delete('/tournaments/:id', adminMiddleware, tournamentController.deleteTournament);

module.exports = router;
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);