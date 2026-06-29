const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const userController = require('../controllers/userController');

router.post('/', protect, authorize('Admin'), userController.createUser);
router.get('/', protect, authorize('Admin'), userController.getUsers);
router.get('/:id', protect, userController.getUser);
router.put('/:id', protect, authorize('Admin'), userController.updateUser);
router.delete('/:id', protect, authorize('Admin'), userController.deleteUser);

module.exports = router;
