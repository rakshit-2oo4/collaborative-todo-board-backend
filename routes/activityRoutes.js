const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const ActivityLog = require('../models/ActivityLog');

// @route   GET /api/activity
// @desc    Get the last 20 activity logs
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const logs = await ActivityLog.find({})
      .sort({ timestamp: -1 })
      .limit(20); 

    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error.message);
    res.status(500).json({ message: 'Server error fetching activity logs' });
  }
});

module.exports = router;