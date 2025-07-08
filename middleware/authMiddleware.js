const jwt = require('jsonwebtoken');
const User = require('../models/User'); 

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user ID to the request object
      // We are only storing the user ID (decoded.id) in req.user,
      // which is sufficient for most operations. If you need the full user object,
      // you would fetch it from the DB here: req.user = await User.findById(decoded.id).select('-password');
      req.user = { id: decoded.id };

      next(); 
    } catch (error) {
      console.error('Authentication error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };