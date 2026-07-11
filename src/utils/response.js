const success = (message, data = null) => ({
  success: true,
  message,
  data,
});

const error = (message) => ({
  success: false,
  message,
});

module.exports = { success, error };
