const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Task = require('../models/Task');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog'); // Import ActivityLog model


// --- Helper for title validation unique per board and not column names ---
const validateTaskTitle = async (title, existingTaskId = null) => { // Removed userId as uniqueness is board-wide
  const columnNames = ['Todo', 'In Progress', 'Done'];
  if (columnNames.map(name => name.toLowerCase()).includes(title.toLowerCase())) {
    return 'Task title cannot be the same as a column name (Todo, In Progress, Done).';
  }

  const query = { title: { $regex: new RegExp(`^${title}$`, 'i') } };

  if (existingTaskId) {
    query._id = { $ne: existingTaskId };
  }

  const existingTask = await Task.findOne(query);
  if (existingTask) {
    return `A task with the title "${title}" already exists.`;
  }
  return null;
};

// --- Helper to log activity ---
const logActivity = async (action, taskId, taskTitle, performedBy, details = {}) => {
    try {
        const user = await User.findById(performedBy).select('email');
        if (!user) {
            console.error(`User not found for activity logging: ${performedBy}`);
            return;
        }
        const logEntry = new ActivityLog({
            action,
            taskId,
            taskTitle,
            performedBy: user._id,
            performedByEmail: user.email,
            details
        });
        await logEntry.save();
        return logEntry;
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
};


// @route   GET /api/tasks
// @desc    Get all tasks for the authenticated user (or visible on the board)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // For a truly collaborative board, fetch ALL tasks if there's only one "board".
    // If you plan for multiple boards, you'd add a 'boardId' to tasks and filter by it.
    const tasks = await Task.find({}) // Fetch all tasks visible on the single board
      .populate('assignedTo', 'email')
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error.message);
    res.status(500).json({ message: 'Server error fetching tasks' });
  }
});


// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', protect, async (req, res) => {
  const { title, description, assignedTo, status, priority } = req.body;
  const performedBy = req.user.id;

  if (!title || !assignedTo || !status || !priority) {
    return res.status(400).json({ message: 'Please provide title, assigned user, status, and priority.' });
  }

  const titleError = await validateTaskTitle(title);
  if (titleError) {
    return res.status(400).json({ message: titleError });
  }

  try {
    const assignee = await User.findById(assignedTo);
    if (!assignee) {
      return res.status(400).json({ message: 'Assigned user not found.' });
    }

    const newTask = new Task({
      title,
      description,
      assignedTo,
      status,
      priority,
      createdBy: performedBy
    });

    const savedTask = await newTask.save();
    const populatedTask = await Task.findById(savedTask._id)
                                  .populate('assignedTo', 'email')
                                  .populate('createdBy', 'email');

    // Log activity
    const activity = await logActivity('Task Added', populatedTask._id, populatedTask.title, performedBy);

    // Emit real-time update
    req.io.emit('taskAdded', populatedTask);
    if (activity) req.io.emit('activityLogged', activity);

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Error creating task:', error.message);
    if (error.name === 'ValidationError') {
      let errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    res.status(500).json({ message: 'Server error creating task' });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', protect, async (req, res) => {
  const { title, description, assignedTo, status, priority, lastUpdatedAt } = req.body; // lastUpdatedAt for conflict handling
  const taskId = req.params.id;
  const performedBy = req.user.id;

  try {
    let task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // --- Conflict Handling: Check `lastUpdatedAt` ---
    if (lastUpdatedAt && new Date(lastUpdatedAt).getTime() < task.updatedAt.getTime()) {
      // Conflict detected: client's version is older than server's
      return res.status(409).json({
        message: 'Conflict: This task has been updated by another user. Please resolve.',
        serverVersion: task // Send the latest server version
      });
    }

    const oldTask = task.toObject(); // Get a plain object of the old task for logging details

    // Validate title uniqueness and against column names
    if (title && title !== oldTask.title) {
        const titleError = await validateTaskTitle(title, taskId);
        if (titleError) {
            return res.status(400).json({ message: titleError });
        }
        task.title = title;
    }

    // Check if assigned user exists if changing assignee
    if (assignedTo && assignedTo.toString() !== oldTask.assignedTo.toString()) {
      const assignee = await User.findById(assignedTo);
      if (!assignee) {
        return res.status(400).json({ message: 'Assigned user not found.' });
      }
      task.assignedTo = assignedTo;
    }

    // Update fields if provided
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;

    const updatedTask = await task.save(); // pre('save') hook will update updatedAt

    const populatedTask = await Task.findById(updatedTask._id)
                                  .populate('assignedTo', 'email')
                                  .populate('createdBy', 'email');

    // --- Log specific changes ---
    const changeDetails = {};
    let actionType = 'Task Updated';

    if (oldTask.title !== populatedTask.title) changeDetails.title = { old: oldTask.title, new: populatedTask.title };
    if (oldTask.description !== populatedTask.description) changeDetails.description = { old: oldTask.description, new: populatedTask.description };
    if (oldTask.assignedTo.toString() !== populatedTask.assignedTo._id.toString()) changeDetails.assignedTo = { old: oldTask.assignedTo.email, new: populatedTask.assignedTo.email };
    if (oldTask.status !== populatedTask.status) changeDetails.status = { old: oldTask.status, new: populatedTask.status };
    if (oldTask.priority !== populatedTask.priority) changeDetails.priority = { old: oldTask.priority, new: populatedTask.priority };

    // More specific action types if only one field changed significantly
    if (Object.keys(changeDetails).length === 1) {
        if (changeDetails.status) actionType = 'Task Status Changed';
        else if (changeDetails.assignedTo) actionType = 'Task Assigned';
        else if (changeDetails.priority) actionType = 'Task Priority Changed';
        else if (changeDetails.title) actionType = 'Task Title Changed';
        else if (changeDetails.description) actionType = 'Task Description Changed';
    }


    // Log activity
    const activity = await logActivity(actionType, populatedTask._id, populatedTask.title, performedBy, changeDetails);


    // Emit real-time update
    req.io.emit('taskUpdated', populatedTask);
    if (activity) req.io.emit('activityLogged', activity);


    res.json(populatedTask);
  } catch (error) {
    console.error('Error updating task:', error.message);
    if (error.name === 'ValidationError') {
      let errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    res.status(500).json({ message: 'Server error updating task' });
  }
});


// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  const taskId = req.params.id;
  const performedBy = req.user.id;

  try {
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const deletedTaskTitle = task.title; // Get title before deleting

    await task.deleteOne();

    // Log activity
    const activity = await logActivity('Task Deleted', taskId, deletedTaskTitle, performedBy);

    // Emit real-time update
    req.io.emit('taskDeleted', taskId);
    if (activity) req.io.emit('activityLogged', activity);

    res.json({ message: 'Task removed' });
  } catch (error) {
    console.error('Error deleting task:', error.message);
    res.status(500).json({ message: 'Server error deleting task' });
  }
});

// @route   POST /api/tasks/smart-assign/:id
// @desc    Assigns a task to the user with the fewest current active tasks.
// @access  Private
router.post('/smart-assign/:id', protect, async (req, res) => {
  const taskId = req.params.id;
  const performedBy = req.user.id;

  try {
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const users = await User.find({});
    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found to assign tasks.' });
    }

    // Get active tasks for each user (status not 'Done')
    const userActiveTasksCount = await Promise.all(
      users.map(async (user) => {
        const count = await Task.countDocuments({ assignedTo: user._id, status: { $ne: 'Done' } });
        return { userId: user._id, email: user.email, count };
      })
    );

    userActiveTasksCount.sort((a, b) => a.count - b.count);

    const smartAssignee = userActiveTasksCount[0];
    const oldAssigneeId = task.assignedTo.toString();

    // Only update if a different user is found to assign to
    if (smartAssignee.userId.toString() !== oldAssigneeId) {
        task.assignedTo = smartAssignee.userId;
        const updatedTask = await task.save();

        const populatedTask = await Task.findById(updatedTask._id)
                                      .populate('assignedTo', 'email')
                                      .populate('createdBy', 'email');

        // Log activity
        const oldAssigneeUser = await User.findById(oldAssigneeId).select('email');
        const activity = await logActivity(
            'Smart Assigned',
            populatedTask._id,
            populatedTask.title,
            performedBy,
            {
                oldAssignedTo: oldAssigneeUser ? oldAssigneeUser.email : 'Unknown',
                newAssignedTo: populatedTask.assignedTo.email
            }
        );

        // Emit real-time update
        req.io.emit('taskUpdated', populatedTask); // Smart assign is a type of update
        if (activity) req.io.emit('activityLogged', activity);

        res.json({ message: 'Task smart assigned successfully', task: populatedTask });
    } else {
        res.json({ message: 'Task is already assigned to the user with fewest active tasks.', task: task });
    }

  } catch (error) {
    console.error('Error during smart assign:', error.message);
    res.status(500).json({ message: 'Server error during smart assignment.' });
  }
});


module.exports = router;