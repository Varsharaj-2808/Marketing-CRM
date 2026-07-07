const { protect, authorize } = require('./auth');

const protectStageManagement = protect;
const authorizeStageManagement = authorize;

module.exports = { protectStageManagement, authorizeStageManagement };
