const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { protectStageManagement, authorizeStageManagement } = require('../middleware/authStageManagement');
const leadController = require('../controllers/leadController');
const adminController = require('../controllers/adminController');
const assignController = require('../controllers/assignController');
const notificationController = require('../controllers/notificationController');
const categoryController = require('../controllers/categoryController');

router.post('/leads', protect, authorize('Admin', 'Marketing Executive'), leadController.createLead);
router.get('/leads', protect, authorize('Admin', 'Marketing Executive'), leadController.getLeads);
router.get('/leads/check-mobile', protect, authorize('Admin', 'Marketing Executive'), leadController.checkMobile);
router.get('/leads/check-email', protect, authorize('Admin', 'Marketing Executive'), leadController.checkEmail);
router.get('/leads/:id/lead-history', protectStageManagement, authorizeStageManagement('Admin', 'Marketing Executive'), leadController.getLeadHistory);
router.put('/leads/:id/status', protectStageManagement, authorizeStageManagement('Admin', 'Marketing Executive'), leadController.updateLeadStage);
router.post('/leads/:id/close', protectStageManagement, authorizeStageManagement('Admin', 'Marketing Executive'), leadController.closeLeadLost);
router.put('/leads/:id/close', protectStageManagement, authorizeStageManagement('Admin', 'Marketing Executive'), leadController.closeLeadWon);
router.get('/leads/:id', protect, authorize('Admin', 'Marketing Executive'), leadController.getLead);

router.get('/lead-sources', protect, authorize('Admin', 'Marketing Executive'), adminController.getLeadSources);
router.get('/categories/active', protect, authorize('Admin', 'Marketing Executive'), categoryController.getActiveCategories);
router.get('/categories', protect, authorize('Admin', 'Marketing Executive'), adminController.getBusinessCategories);
router.get('/categories/:categoryId/sub-categories', protect, authorize('Admin', 'Marketing Executive'), adminController.getBusinessSubCategories);
router.get('/subcategories/active', protect, authorize('Admin', 'Marketing Executive'), categoryController.getActiveSubCategories);
router.get('/services', protect, authorize('Admin', 'Marketing Executive'), adminController.getServices);

router.get('/leads/:id/timeline', protect, authorize('Admin', 'Marketing Executive'), assignController.getTimeline);
router.get('/notifications/count', protect, authorize('Admin', 'Marketing Executive'), notificationController.getNotificationCount);

module.exports = router;
