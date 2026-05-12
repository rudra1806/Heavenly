/**
 * Search Service routes.
 * 
 * GET /geocode?location=X  — Convert address to coordinates (Redis cached)
 * GET /search?q=X          — Search listings (in-memory index)
 */

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.js');

router.get('/geocode', searchController.geocode);
router.get('/search', searchController.search);

module.exports = router;
