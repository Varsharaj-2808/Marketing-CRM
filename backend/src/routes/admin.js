const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const auditLogController = require('../controllers/auditLogController');
const systemSettingController = require('../controllers/systemSettingController');
const savedViewController = require('../controllers/savedViewController');
const bulkOperationsController = require('../controllers/bulkOperationsController');
const leadController = require('../controllers/leadController');

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

router.get('/leads', protect, authorize('Admin'), leadController.getAdminLeads);

module.exports = router;
