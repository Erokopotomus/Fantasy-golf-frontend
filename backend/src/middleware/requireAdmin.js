const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: { message: 'Admin access required' } })
  }
  next()
}

module.exports = { requireAdmin }
