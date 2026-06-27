const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validRoles = ['admin', 'manager', 'Marketing Executive'];

export function validateName(name) {
  if (!name || !name.trim()) return 'Name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  if (name.trim().length > 50) return 'Name must be at most 50 characters';
  return '';
}

export function validateEmail(email) {
  if (!email || !email.trim()) return 'Email is required';
  if (!emailRegex.test(email.trim())) return 'Invalid Email format';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return '';
}

export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return '';
}

export function validateRegisterForm({ name, email, password, confirmPassword }) {
  const errors = {};
  const nameErr = validateName(name);
  const emailErr = validateEmail(email);
  const passwordErr = validatePassword(password);
  const confirmErr = validateConfirmPassword(password, confirmPassword);
  if (nameErr) errors.name = nameErr;
  if (emailErr) errors.email = emailErr;
  if (passwordErr) errors.password = passwordErr;
  if (confirmErr) errors.confirmPassword = confirmErr;
  return errors;
}
