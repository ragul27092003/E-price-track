const roleCheck = (...allowedRoles) => (req, res, next) => {
  // Check userType instead of role
  if (!req.user || !allowedRoles.includes(req.user.user_type)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

module.exports = roleCheck;