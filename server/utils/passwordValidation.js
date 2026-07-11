function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return 'New password is required';
  }
  if (password.length < 8) {
    return 'Minimum 8 characters required';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Must contain at least one uppercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Must contain at least one number';
  }
  return null;
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

module.exports = { validatePassword, isValidEmail };
