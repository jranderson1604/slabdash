const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireOwner } = require('../middleware/auth');

/**
 * GET /api/blog — Public: list published posts (newest first)
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const result = await db.query(`
      SELECT id, title, body, author_name, pinned, created_at, updated_at
      FROM blog_posts
      WHERE published = true
      ORDER BY pinned DESC, created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await db.query(
      `SELECT COUNT(*) FROM blog_posts WHERE published = true`
    );

    res.json({
      posts: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    console.error('[Blog] List error:', err.message);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * GET /api/blog/all — Owner: list ALL posts (including drafts)
 */
router.get('/all', authenticate, requireOwner, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM blog_posts
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[Blog] List all error:', err.message);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * POST /api/blog — Owner: create a new post
 */
router.post('/', authenticate, requireOwner, async (req, res) => {
  try {
    const { title, body, published, pinned } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    const result = await db.query(`
      INSERT INTO blog_posts (title, body, author_name, published, pinned)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      title.trim(),
      body.trim(),
      req.user.name || 'SlabDash Team',
      published !== false,
      pinned === true,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[Blog] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

/**
 * PUT /api/blog/:id — Owner: update a post
 */
router.put('/:id', authenticate, requireOwner, async (req, res) => {
  try {
    const { title, body, published, pinned } = req.body;

    const result = await db.query(`
      UPDATE blog_posts
      SET title = COALESCE($1, title),
          body = COALESCE($2, body),
          published = COALESCE($3, published),
          pinned = COALESCE($4, pinned),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [title?.trim(), body?.trim(), published, pinned, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[Blog] Update error:', err.message);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

/**
 * DELETE /api/blog/:id — Owner: delete a post
 */
router.delete('/:id', authenticate, requireOwner, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM blog_posts WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Blog] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;
