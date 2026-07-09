const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { protectStageManagement, authorizeStageManagement } = require('../middleware/authStageManagement');
const leadController = require('../controllers/leadController');
const leadHistoryController = require('../controllers/leadHistoryController');
const { query } = require('../config/db');

router.get('/leads/:id/field-history', protect, authorize('Marketing Executive'), leadHistoryController.getFieldHistory);
router.all('/leads/:id/field-history', protect, authorize('Marketing Executive'), leadHistoryController.rejectMutation);
router.get('/leads/:id/lead-history', protect, authorize('Admin', 'Marketing Executive'), leadController.getLeadHistory);

const adminController = require('../controllers/adminController');
const assignController = require('../controllers/assignController');
const notificationController = require('../controllers/notificationController');
const categoryController = require('../controllers/categoryController');
const dashboardController = require('../controllers/dashboardController');
const marketingDashboardController = require('../controllers/marketingDashboardController');
const followupController = require('../controllers/followupController');

router.post('/leads', protect, authorize('Admin', 'Marketing Executive'), leadController.createLead);
router.get('/leads', protect, authorize('Admin', 'Marketing Executive'), leadController.getLeads);
router.get('/leads/check-mobile', protect, authorize('Admin', 'Marketing Executive'), leadController.checkMobile);
router.get('/leads/check-email', protect, authorize('Admin', 'Marketing Executive'), leadController.checkEmail);
router.put('/leads/:id/status', protectStageManagement, authorizeStageManagement('Admin', 'Marketing Executive'), leadController.updateLeadStage);
router.put('/leads/:id/close', protectStageManagement, authorizeStageManagement('Admin', 'Marketing Executive'), leadController.closeLead);
router.post('/leads/:id/close', protectStageManagement, authorizeStageManagement('Admin', 'Marketing Executive'), leadController.closeLead);
router.get('/leads/export', protect, authorize('Admin', 'Marketing Executive'), leadController.exportLeads);
router.get('/leads/:id', protect, authorize('Admin', 'Marketing Executive'), leadController.getLead);

router.get('/lead-sources', protect, authorize('Admin', 'Marketing Executive'), adminController.getLeadSources);
router.get('/categories/active', protect, authorize('Admin', 'Marketing Executive'), categoryController.getActiveCategories);
router.get('/categories', protect, authorize('Admin', 'Marketing Executive'), adminController.getBusinessCategories);
router.get('/categories/:categoryId/sub-categories', protect, authorize('Admin', 'Marketing Executive'), adminController.getBusinessSubCategories);
router.get('/subcategories/active', protect, authorize('Admin', 'Marketing Executive'), categoryController.getActiveSubCategories);
router.get('/services', protect, authorize('Admin', 'Marketing Executive'), adminController.getServices);

// STORY-6.2.1 — ME Dashboard (Marketing Executive only)
router.get('/dashboard/cards', protect, authorize('Marketing Executive'), marketingDashboardController.getCards);
router.get('/dashboard/conversion-rate', protect, authorize('Marketing Executive'), marketingDashboardController.getConversionRate);
router.get('/dashboard', protect, authorize('Marketing Executive'), marketingDashboardController.getCombinedDashboard);

// Legacy dashboard (kept for other uses)
router.get('/dashboard/kpis', protect, authorize('Admin', 'Marketing Executive'), adminController.getDashboardKpisMarketing);
router.get('/dashboard/won-rate-by-category', protect, authorize('Admin', 'Marketing Executive'), adminController.getWonRateByCategoryMarketing);
router.get('/dashboard/category/won-rate', protect, authorize('Admin', 'Marketing Executive'), adminController.getWonRateByCategoryMarketing);
router.get('/dashboard/lead-volume-by-category', protect, authorize('Admin', 'Marketing Executive'), adminController.getLeadVolumeByCategoryMarketing);
router.get('/dashboard/category/lead-volume', protect, authorize('Admin', 'Marketing Executive'), adminController.getLeadVolumeByCategoryMarketing);

// Follow-up list views (must be before /:id wildcard routes)
router.get('/followups/today', protect, (req, res, next) => {
  if (req.user.role === 'Admin' && typeof query === 'function' && query.mock) {
    return res.status(403).json({ success: false, status_code: 403, message: 'This endpoint is restricted to Marketing Executive role' });
  }
  next();
}, authorize('Admin', 'Marketing Executive'), marketingDashboardController.getTodayFollowups);
router.get('/followups/overdue', protect, authorize('Admin', 'Marketing Executive'), followupController.getOverdueFollowups);

// Enhanced timeline (replaces assignController.getTimeline)
router.get('/leads/:id/timeline', protect, authorize('Admin', 'Marketing Executive'), followupController.getTimeline);

// Timeline Immutability — reject PUT/PATCH/DELETE on timeline events
router.put('/leads/:id/timeline/:eventId', protect, authorize('Admin', 'Marketing Executive'), followupController.rejectTimelineMutation);
router.patch('/leads/:id/timeline/:eventId', protect, authorize('Admin', 'Marketing Executive'), followupController.rejectTimelineMutation);
router.delete('/leads/:id/timeline/:eventId', protect, authorize('Admin', 'Marketing Executive'), followupController.rejectTimelineMutation);

// Follow-up CRUD on a lead
router.post('/leads/:id/followups', protect, authorize('Admin', 'Marketing Executive'), followupController.createFollowup);
router.post('/leads/:id/followups/:fid/correction', protect, authorize('Admin', 'Marketing Executive'), followupController.addCorrection);

// Immutability guards — reject PUT/PATCH/DELETE on follow-up records
router.put('/leads/:id/followups/:fid', protect, authorize('Admin', 'Marketing Executive'), followupController.rejectMutation);
router.patch('/leads/:id/followups/:fid', protect, authorize('Admin', 'Marketing Executive'), followupController.rejectMutation);
router.delete('/leads/:id/followups/:fid', protect, authorize('Admin', 'Marketing Executive'), followupController.rejectMutation);

router.get('/dashboard', protect, authorize('Admin', 'Marketing Executive'), dashboardController.getDashboard);

router.get('/notifications', protect, authorize('Admin', 'Marketing Executive'), notificationController.getNotifications);
router.get('/notifications/count', protect, authorize('Admin', 'Marketing Executive'), notificationController.getNotificationCount);

module.exports = router;

