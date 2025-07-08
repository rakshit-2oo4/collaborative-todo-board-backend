require('dotenv').config();
const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs'); // No longer needed for hashing users if fetching existing

// Import your Mongoose models
const User = require('./models/User');
const Task = require('./models/Task');
const ActivityLog = require('./models/ActivityLog');

const MONGODB_URI = process.env.MONGODB_URI;

// --- Fake Data Definitions (now functions to receive user IDs) ---

// These functions will now receive the *actual* user IDs and emails
// retrieved from the database.

let insertedTasks = []; // To store actual task objects with IDs

const seedDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected for seeding!');

    // --- 1. Fetch Existing Users ---
    // Make sure these users are already in your database.
    console.log('Fetching existing users...');
    const existingUsers = await User.find({});
    if (existingUsers.length === 0) {
      console.warn('WARNING: No users found in the database. Please register users (mno@gmail.com, pqr@gmail.com, xyz@gmail.com, abc@gmail.com) via the frontend first, or add them manually with hashed passwords.');
      mongoose.disconnect();
      return; // Exit if no users to assign tasks to
    }

    // Map fetched users to an easy-to-use ID and email object
    const userIds = {};
    const userEmails = {};

    existingUsers.forEach(user => {
        if (user.email === 'abc@gmail.com') {
            userIds.abc = user._id;
            userEmails.abc = user.email;
        } else if (user.email === 'xyz@gmail.com') {
            userIds.xyz = user._id;
            userEmails.xyz = user.email;
        } else if (user.email === 'pqr@gmail.com') {
            userIds.pqr = user._id;
            userEmails.pqr = user.email;
        } else if (user.email === 'mno@gmail.com') {
            userIds.mno = user._id;
            userEmails.mno = user.email;
        }
    });

    // Optional: Log to verify fetched IDs
    console.log('Fetched User IDs:', userIds);
    console.log('Fetched User Emails:', userEmails);

    // --- 2. Clear existing Task and ActivityLog data ---
    console.log('Clearing old tasks and activity logs...');
    await Task.deleteMany({});
    await ActivityLog.deleteMany({});
    console.log('Old tasks and activity logs cleared.');


    // Define fake tasks using the fetched userIds
    const fakeTasks = [
      {
        title: "Design Homepage Banner",
        description: "Create eye-catching banner designs for the website homepage.",
        assignedTo: userIds.xyz, // Assigned to xyz@gmail.com
        status: "In Progress",
        priority: "High",
        createdBy: userIds.abc, // Created by abc@gmail.com
        createdAt: new Date("2025-07-07T10:00:00.000Z"),
        updatedAt: new Date("2025-07-07T14:30:00.000Z")
      },
      {
        title: "Develop User Profile Page",
        description: "Implement frontend and backend for user profile viewing and editing.",
        assignedTo: userIds.mno, // Assigned to mno@gmail.com
        status: "In Progress",
        priority: "High",
        createdBy: userIds.pqr, // Created by pqr@gmail.com
        createdAt: new Date("2025-07-07T11:00:00.000Z"),
        updatedAt: new Date("2025-07-08T09:15:00.000Z")
      },
      {
        title: "Database Indexing Optimization",
        description: "Review and add indexes to frequently queried collections for performance.",
        assignedTo: userIds.mno, // Assigned to mno@gmail.com
        status: "Done",
        priority: "Medium",
        createdBy: userIds.abc,
        createdAt: new Date("2025-07-05T09:00:00.000Z"),
        updatedAt: new Date("2025-07-06T17:00:00.000Z")
      },
      {
        title: "Implement Dark Mode Toggle",
        description: "Add a toggle switch for users to switch between light and dark themes.",
        assignedTo: userIds.pqr, // Assigned to pqr@gmail.com
        status: "Todo",
        priority: "Medium",
        createdBy: userIds.abc,
        createdAt: new Date("2025-07-08T10:30:00.000Z"),
        updatedAt: new Date("2025-07-08T10:30:00.000Z")
      },
      {
        title: "Review Component Accessibility",
        description: "Conduct an audit of existing UI components for WCAG compliance.",
        assignedTo: userIds.abc, // Assigned to abc@gmail.com
        status: "Todo",
        priority: "Low",
        createdBy: userIds.pqr,
        createdAt: new Date("2025-07-08T15:00:00.000Z"),
        updatedAt: new Date("2025-07-08T15:00:00.000Z")
      },
      {
        title: "Perform API Security Audit",
        description: "Check all API endpoints for common security vulnerabilities (XSS, CSRF, Injection).",
        assignedTo: userIds.xyz, // Assigned to xyz@gmail.com
        status: "Todo",
        priority: "High",
        createdBy: userIds.mno,
        createdAt: new Date("2025-07-08T09:00:00.000Z"),
        updatedAt: new Date("2025-07-08T09:00:00.000Z")
      },
      {
        title: "Optimize Image Assets",
        description: "Compress and resize images for faster page loading times.",
        assignedTo: userIds.pqr, // Assigned to pqr@gmail.com
        status: "In Progress",
        priority: "Medium",
        createdBy: userIds.abc,
        createdAt: new Date("2025-07-07T11:00:00.000Z"),
        updatedAt: new Date("2025-07-08T10:00:00.000Z")
      },
      {
        title: "Refactor Notification Service",
        description: "Improve the reliability and scalability of email notification delivery.",
        assignedTo: userIds.mno, // Assigned to mno@gmail.com
        status: "Todo",
        priority: "High",
        createdBy: userIds.pqr,
        createdAt: new Date("2025-07-08T13:00:00.000Z"),
        updatedAt: new Date("2025-07-08T13:00:00.000Z")
      }
    ];


    // --- 3. Insert Tasks ---
    console.log('Seeding tasks...');
    for (let taskData of fakeTasks) {
      const task = new Task(taskData);
      const insertedTask = await task.save();
      insertedTasks.push(insertedTask);
    }
    console.log('Tasks seeded successfully!');

    // Map task titles to their IDs for easy lookup (assuming unique titles for simplicity)
    const taskIds = {
      designHomepageBanner: insertedTasks.find(t => t.title === 'Design Homepage Banner')._id,
      developUserProfilePage: insertedTasks.find(t => t.title === 'Develop User Profile Page')._id,
      databaseIndexingOptimization: insertedTasks.find(t => t.title === 'Database Indexing Optimization')._id,
      implementDarkModeToggle: insertedTasks.find(t => t.title === 'Implement Dark Mode Toggle')._id,
      reviewComponentAccessibility: insertedTasks.find(t => t.title === 'Review Component Accessibility')._id,
      performAPISecurityAudit: insertedTasks.find(t => t.title === 'Perform API Security Audit')._id,
      optimizeImageAssets: insertedTasks.find(t => t.title === 'Optimize Image Assets')._id,
      refactorNotificationService: insertedTasks.find(t => t.title === 'Refactor Notification Service')._id,
    };

    // Define fake activity logs using the fetched userIds, userEmails, and taskIds
    const fakeActivityLogs = [
      {
        action: "Task Added",
        taskId: taskIds.designHomepageBanner,
        taskTitle: "Design Homepage Banner",
        performedBy: userIds.abc,
        performedByEmail: userEmails.abc,
        timestamp: new Date("2025-07-07T10:00:01.000Z"),
        details: {}
      },
      {
        action: "Task Status Changed",
        taskId: taskIds.designHomepageBanner,
        taskTitle: "Design Homepage Banner",
        performedBy: userIds.xyz,
        performedByEmail: userEmails.xyz,
        timestamp: new Date("2025-07-07T14:30:05.000Z"),
        details: {
          "status": { "old": "Todo", "new": "In Progress" }
        }
      },
      {
        action: "Task Added",
        taskId: taskIds.developUserProfilePage,
        taskTitle: "Develop User Profile Page",
        performedBy: userIds.pqr,
        performedByEmail: userEmails.pqr,
        timestamp: new Date("2025-07-07T11:00:02.000Z"),
        details: {}
      },
      {
        action: "Task Assigned",
        taskId: taskIds.developUserProfilePage,
        taskTitle: "Develop User Profile Page",
        performedBy: userIds.pqr,
        performedByEmail: userEmails.pqr,
        timestamp: new Date("2025-07-07T11:01:00.000Z"),
        details: {
          "assignedTo": { "old": "N/A", "new": userEmails.mno }
        }
      },
      {
        action: "Smart Assigned",
        taskId: taskIds.performAPISecurityAudit,
        taskTitle: "Perform API Security Audit",
        performedBy: userIds.abc,
        performedByEmail: userEmails.abc,
        timestamp: new Date("2025-07-08T09:05:00.000Z"),
        details: {
          "oldAssignedTo": userEmails.mno, // Assuming it was assigned to mno before smart assign
          "newAssignedTo": userEmails.xyz // Smart assign moved it to xyz
        }
      },
       {
        action: "Task Updated",
        taskId: taskIds.refactorNotificationService,
        taskTitle: "Refactor Notification Service",
        performedBy: userIds.mno,
        performedByEmail: userEmails.mno,
        timestamp: new Date("2025-07-08T14:00:00.000Z"),
        details: {
          "description": { "old": "Improve email service.", "new": "Improve the reliability and scalability of email notification delivery." }
        }
      },
       {
        action: "Task Status Changed",
        taskId: taskIds.databaseIndexingOptimization,
        taskTitle: "Database Indexing Optimization",
        performedBy: userIds.mno,
        performedByEmail: userEmails.mno,
        timestamp: new Date("2025-07-06T17:00:00.000Z"),
        details: {
          "status": { "old": "In Progress", "new": "Done" }
        }
      }
    ];


    // --- 4. Insert Activity Logs ---
    console.log('Seeding activity logs...');
    for (let logData of fakeActivityLogs) {
      const log = new ActivityLog(logData);
      await log.save();
    }
    console.log('Activity logs seeded successfully!');

  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1); // Exit with error code
  } finally {
    mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
};

seedDB();