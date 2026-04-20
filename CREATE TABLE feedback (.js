CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'new',   -- new, read, replied
    admin_comment TEXT,
    deleted_at TIMESTAMP NULL,          -- для soft delete
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
function adminMiddleware(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
}
app.get('/api/admin/feedback', adminMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM feedback WHERE deleted_at IS NULL';
        const params = [];

        if (status && ['new', 'read', 'replied'].includes(status)) {
            query += ' AND status = $1';
            params.push(status);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const data = await db.query(query, params);

        // Получение общего количества для пагинации
        let countQuery = 'SELECT COUNT(*) FROM feedback WHERE deleted_at IS NULL';
        const countParams = [];
        if (status && ['new', 'read', 'replied'].includes(status)) {
            countQuery += ' AND status = $1';
            countParams.push(status);
        }
        const totalResult = await db.query(countQuery, countParams);
        const total = parseInt(totalResult.rows[0].count);

        res.json({
            data: data.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.put('/api/admin/feedback/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_comment } = req.body;

        if (!['read', 'replied'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Allowed: read, replied' });
        }

        const updateFields = [];
        const values = [];

        if (status) {
            updateFields.push(`status = $${values.length + 1}`);
            values.push(status);
        }
        if (admin_comment !== undefined) {
            updateFields.push(`admin_comment = $${values.length + 1}`);
            values.push(admin_comment);
        }
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'Nothing to update' });
        }

        values.push(id);
        const query = `
            UPDATE feedback
            SET ${updateFields.join(', ')}, updated_at = NOW()
            WHERE id = $${values.length} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/admin/feedback/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `UPDATE feedback
             SET deleted_at = NOW()
             WHERE id = $1 AND deleted_at IS NULL
             RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.status(204).send(); // No content
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});