const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { protectStageManagement, authorizeStageManagement } = require('../middleware/authStageManagement');
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const auditLogController = require('../controllers/auditLogController');
const systemSettingController = require('../controllers/systemSettingController');
const savedViewController = require('../controllers/savedViewController');
const bulkOperationsController = require('../controllers/bulkOperationsController');
const leadController = require('../controllers/leadController');
const assignController = require('../controllers/assignController');
const categoryController = require('../controllers/categoryController');

router.post('/users', protect, authorize('Admin'), userController.createUser);
router.get('/users', protect, authorize('Admin'), userController.getUsers);
router.get('/users/reindex', protect, authorize('Admin'), userController.reindexUsers);
router.get('/users/:id', protect, userController.getUser);
router.put('/users/:id', protect, authorize('Admin'), userController.updateUser);
router.delete('/users/:id', protect, authorize('Admin'), userController.deleteUser);

router.patch('/users/:id/deactivate', protect, authorize('Admin'), adminController.deactivateUser);
router.patch('/users/:id/activate', protect, authorize('Admin'), adminController.activateUser);
router.get('/users/:id/status-history', protect, authorize('Admin'), adminController.getUserStatusHistory);

router.get('/audit-log', protect, authorize('Admin'), auditLogController.getAuditLogs);
router.get('/audit-log/:id', protect, authorize('Admin'), auditLogController.getAuditLog);

router.get('/settings', protect, authorize('Admin'), systemSettingController.getSettings);
router.put('/settings/:key', protect, authorize('Admin'), systemSettingController.updateSetting);

router.post('/leads/saved-views', protect, authorize('Admin'), savedViewController.createSavedView);
router.put('/leads/saved-views/:viewId', protect, authorize('Admin'), savedViewController.updateSavedView);
router.delete('/leads/saved-views/:viewId', protect, authorize('Admin'), savedViewController.deleteSavedView);

router.post('/leads/bulk-select', protect, authorize('Admin'), bulkOperationsController.bulkSelect);
router.post('/leads/bulk-assign', protect, authorize('Admin'), bulkOperationsController.bulkAssign);
router.post('/leads/export', protect, authorize('Admin'), bulkOperationsController.exportLeads);

router.patch('/leads/:id/assign', protect, authorize('Admin'), assignController.assignLead);
router.get('/leads', protect, authorize('Admin'), leadController.getAdminLeads);
router.get('/leads/export', protect, authorize('Admin'), adminController.exportAdminLeads);

// Dashboard routes
router.get('/dashboard/kpis', protect, authorize('Admin'), adminController.getDashboardKpis);
router.get('/dashboard/won-rate-by-category', protect, authorize('Admin'), adminController.getWonRateByCategory);
router.get('/dashboard/lead-volume-by-category', protect, authorize('Admin'), adminController.getLeadVolumeByCategory);

// Report export routes
router.get('/reports/export', protect, authorize('Admin'), adminController.exportReport);

router.post('/leads/:id/reopen', protectStageManagement, authorizeStageManagement('Admin'), adminController.reopenLead);
router.get('/leads/:id/lead-history', protectStageManagement, authorizeStageManagement('Admin'), leadController.getLeadHistory);

// Category Master CRUD
router.get('/categories/active', protect, authorize('Admin'), categoryController.getActiveCategories);
router.get('/categories/audit-log', protect, authorize('Admin'), categoryController.getCategoryAuditLog);
router.post('/categories/seed-defaults', protect, authorize('Admin'), categoryController.seedDefaultTaxonomy);
router.get('/categories', protect, authorize('Admin'), categoryController.getCategories);
router.post('/categories', protect, authorize('Admin'), categoryController.createCategory);
router.get('/categories/:categoryId/sub-categories', protect, authorize('Admin'), adminController.getBusinessSubCategories);
router.get('/categories/:id', protect, authorize('Admin'), categoryController.getCategory);
router.put('/categories/:id', protect, authorize('Admin'), categoryController.updateCategory);
router.delete('/categories/:id', protect, authorize('Admin'), categoryController.deleteCategory);
router.patch('/categories/:id/status', protect, authorize('Admin'), categoryController.patchCategoryStatus);

// Sub-Category Master CRUD
router.get('/subcategories/active', protect, authorize('Admin'), categoryController.getActiveSubCategories);
router.get('/subcategories', protect, authorize('Admin'), categoryController.getSubCategories);
router.post('/subcategories', protect, authorize('Admin'), categoryController.createSubCategory);
router.get('/subcategories/:id', protect, authorize('Admin'), categoryController.getSubCategory);
router.put('/subcategories/:id', protect, authorize('Admin'), categoryController.updateSubCategory);
router.delete('/subcategories/:id', protect, authorize('Admin'), categoryController.deleteSubCategory);
router.patch('/subcategories/:id/status', protect, authorize('Admin'), categoryController.patchSubCategoryStatus);

module.exports = router;
