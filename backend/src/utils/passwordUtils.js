const crypto = require('crypto');

const generateTempPassword = (length = 14) => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = upper + lower + digits + special;

  const getRandomChar = (charset) => charset[crypto.randomInt(charset.length)];

  const password = [
    getRandomChar(upper),
    getRandomChar(lower),
    getRandomChar(digits),
    getRandomChar(special),
  ];

  for (let i = password.length; i < length; i++) {
    password.push(getRandomChar(all));
  }

  for (let i = password.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
};

module.exports = { generateTempPassword };