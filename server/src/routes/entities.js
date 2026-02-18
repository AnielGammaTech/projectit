import { Router } from 'express';
import entityService from '../services/entityService.js';

const router = Router();

// GET /api/entities/:entityType/list?sort=...&limit=...
router.get('/:entityType/list', async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const { sort, limit } = req.query;
    const results = await entityService.list(entityType, sort, limit ? parseInt(limit) : undefined);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// POST /api/entities/:entityType/filter
router.post('/:entityType/filter', async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const { filter, sort, limit } = req.body;
    const results = await entityService.filter(entityType, filter, sort, limit);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// POST /api/entities/:entityType/create
router.post('/:entityType/create', async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const result = await entityService.create(entityType, req.body, req.user?.email);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/entities/:entityType/bulk-create
router.post('/:entityType/bulk-create', async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const results = await entityService.bulkCreate(entityType, req.body, req.user?.email);
    res.status(201).json(results);
  } catch (err) {
    next(err);
  }
});

// PUT /api/entities/:entityType/:id
router.put('/:entityType/:id', async (req, res, next) => {
  try {
    const { entityType, id } = req.params;
    const result = await entityService.update(entityType, id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/entities/:entityType/:id
router.delete('/:entityType/:id', async (req, res, next) => {
  try {
    const { entityType, id } = req.params;
    const result = await entityService.delete(entityType, id, req.user?.email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
