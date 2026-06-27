const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email || email.trim() === '') {
    return { valid: false, message: 'Email is required' };
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return { valid: false, message: 'Invalid Email format' };
  }
  if (email.trim().length > 255) {
    return { valid: false, message: 'Email exceeds maximum length of 255 characters' };
  }
  return { valid: true, message: '' };
}

export function validatePassword(password) {
  if (!password || password === '') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  return { valid: true, message: '' };
}

export function validateLoginForm({ email, password }) {
  const emailResult = validateEmail(email);
  if (!emailResult.valid) return emailResult;

  const passwordResult = validatePassword(password);
  if (!passwordResult.valid) return passwordResult;

  return { valid: true, message: '' };
}
