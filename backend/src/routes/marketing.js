const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { protectStageManagement, authorizeStageManagement } = require('../middleware/authStageManagement');
const leadController = require('../controllers/leadController');
const adminController = require('../controllers/adminController');
const assignController = require('../controllers/assignController');
const notificationController = require('../controllers/notificationController');
const categoryController = require('../controllers/categoryController');
const dashboardController = require('../controllers/dashboardController');
const followupController = require('../controllers/followupController');

router.post('/leads', protect, authorize('Admin', 'Marketing Executive'), leadController.createLead);
router.get('/leads', protect, authorize('Admin', 'Marketing Executive'), leadController.getLeads);
router.get('/leads/check-mobile', protect, authorize('Admin', 'Marketing Executive'), leadController.checkMobile);
router.post('/leads/check-duplicate', protect, authorize('Admin', 'Marketing Executive'), leadController.checkMobile);
router.get('/leads/check-email', protect, authorize('Admin', 'Marketing Executive'), leadController.checkEmail);
router.get('/leads/:id/lead-history', protectStageManagement, authorizeStageManagement('Admin', 'Marketing Executive'), leadController.getLeadHistory);
router.put('/leads/:id/status', protectStageManagement, authorizeStageManagement('Admin', 'Marketing Executive'), leadController.updateLeadStage);
router.post('/leads/:id/close', protectStageManagement, authorizeStageManagement('Admin', 'Marketing Executive'), leadController.closeLeadLost);
router.put('/leads/:id/close', protectStageManagement, authorizeStageManagement('Admin', 'Marketing Executive'), leadController.closeLeadWon);
router.get('/leads/export', protect, authorize('Admin', 'Marketing Executive'), leadController.exportLeads);
router.get('/leads/:id', protect, authorize('Admin', 'Marketing Executive'), leadController.getLead);

router.get('/lead-sources', protect, authorize('Admin', 'Marketing Executive'), adminController.getLeadSources);
router.get('/categories/active', protect, authorize('Admin', 'Marketing Executive'), categoryController.getActiveCategories);
router.get('/categories', protect, authorize('Admin', 'Marketing Executive'), adminController.getBusinessCategories);
router.get('/categories/:categoryId/sub-categories', protect, authorize('Admin', 'Marketing Executive'), adminController.getBusinessSubCategories);
router.get('/subcategories/active', protect, authorize('Admin', 'Marketing Executive'), categoryController.getActiveSubCategories);
router.get('/services', protect, authorize('Admin', 'Marketing Executive'), adminController.getServices);

// Dashboard routes for Marketing
router.get('/dashboard/kpis', protect, authorize('Admin', 'Marketing Executive'), adminController.getDashboardKpisMarketing);
router.get('/dashboard/won-rate-by-category', protect, authorize('Admin', 'Marketing Executive'), adminController.getWonRateByCategoryMarketing);
router.get('/dashboard/category/won-rate', protect, authorize('Admin', 'Marketing Executive'), adminController.getWonRateByCategoryMarketing);
router.get('/dashboard/lead-volume-by-category', protect, authorize('Admin', 'Marketing Executive'), adminController.getLeadVolumeByCategoryMarketing);
router.get('/dashboard/category/lead-volume', protect, authorize('Admin', 'Marketing Executive'), adminController.getLeadVolumeByCategoryMarketing);

// Follow-up list views (must be before /:id wildcard routes)
router.get('/followups/today', protect, authorize('Admin', 'Marketing Executive'), followupController.getTodayFollowups);
router.get('/followups/overdue', protect, authorize('Admin', 'Marketing Executive'), followupController.getOverdueFollowups);

// Enhanced timeline (replaces assignController.getTimeline)
router.get('/leads/:id/timeline', protect, authorize('Admin', 'Marketing Executive'), followupController.getTimeline);

// Follow-up CRUD on a lead
router.post('/leads/:id/followups', protect, authorize('Admin', 'Marketing Executive'), followupController.createFollowup);
router.post('/leads/:id/followups/:fid/correction', protect, authorize('Admin', 'Marketing Executive'), followupController.addCorrection);

// Immutability guards — reject PUT/PATCH/DELETE on follow-up records
router.put('/leads/:id/followups/:fid', protect, authorize('Admin', 'Marketing Executive'), followupController.rejectMutation);
router.patch('/leads/:id/followups/:fid', protect, authorize('Admin', 'Marketing Executive'), followupController.rejectMutation);
router.delete('/leads/:id/followups/:fid', protect, authorize('Admin', 'Marketing Executive'), followupController.rejectMutation);

router.get('/dashboard', protect, authorize('Admin', 'Marketing Executive'), dashboardController.getDashboard);

router.get('/notifications/count', protect, authorize('Admin', 'Marketing Executive'), notificationController.getNotificationCount);

module.exports = router;

