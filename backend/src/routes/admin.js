const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const auditLogController = require('../controllers/auditLogController');
const systemSettingController = require('../controllers/systemSettingController');

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

module.exports = router;
