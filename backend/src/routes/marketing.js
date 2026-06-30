const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const leadController = require('../controllers/leadController');
const adminController = require('../controllers/adminController');

router.post('/leads', protect, authorize('Admin', 'Marketing Executive'), leadController.createLead);
router.get('/leads', protect, authorize('Admin', 'Marketing Executive'), leadController.getLeads);
router.get('/leads/check-mobile', protect, authorize('Admin', 'Marketing Executive'), leadController.checkMobile);
router.get('/leads/check-email', protect, authorize('Admin', 'Marketing Executive'), leadController.checkEmail);
router.get('/leads/:id/lead-history', protect, authorize('Admin', 'Marketing Executive'), leadController.getLeadHistory);
router.get('/leads/:id', protect, authorize('Admin', 'Marketing Executive'), leadController.getLead);

router.get('/lead-sources', protect, authorize('Admin', 'Marketing Executive'), adminController.getLeadSources);
router.get('/categories', protect, authorize('Admin', 'Marketing Executive'), adminController.getBusinessCategories);
router.get('/categories/:categoryId/subcategories', protect, authorize('Admin', 'Marketing Executive'), adminController.getBusinessSubCategories);
router.get('/services', protect, authorize('Admin', 'Marketing Executive'), adminController.getServices);

module.exports = router;
