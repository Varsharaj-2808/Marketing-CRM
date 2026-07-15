const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { globalSearch } = require('../controllers/searchController');

router.get('/global', protect, globalSearch);

module.exports = router;
