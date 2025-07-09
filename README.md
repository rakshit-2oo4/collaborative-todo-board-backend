# Collaborative To-Do Board - Backend

## Project Overview

This is the backend repository for a real-time collaborative to-do board application. It provides the RESTful API endpoints and WebSocket services necessary for user authentication, task management, real-time updates, action logging, and handling complex business logic like "Smart Assign" and "Conflict Resolution."

## Live Application & Demo

This backend serves the frontend application. To see the full application in action, please visit the "https://collaborative-todo-board-frontend-x.vercel.app/"

## Tech Stack

* **Runtime:** Node.js
* **Web Framework:** Express.js
* **Database:** MongoDB (via Mongoose ODM)
* **Real-time Communication:** Socket.IO
* **Authentication:** JWT (JSON Web Tokens)
* **Password Hashing:** Bcrypt.js
* **CORS Management:** `cors` middleware
* **Environment Variables:** `dotenv`

## Features and API Endpoints

### 1. User Authentication
* `POST /api/auth/signup`: Register a new user with email and password. Passwords are hashed.
* `POST /api/auth/login`: Authenticate a user and return a JWT token for subsequent requests.
* `GET /api/auth/users`: Get a list of all registered users (for task assignment dropdowns).

### 2. Task Management (CRUD)
* Tasks have `title`, `description`, `assignedTo` (User ID), `status` (Todo, In Progress, Done), and `priority` (Low, Medium, High).
* `GET /api/tasks`: (Protected) Retrieve all tasks visible on the board.
* `POST /api/tasks`: (Protected) Create a new task.
* `PUT /api/tasks/:id`: (Protected) Update an existing task.
* `DELETE /api/tasks/:id`: (Protected) Delete a task.

### 3. Real-Time Sync (WebSockets)
* Uses Socket.IO to push instant updates to all connected clients.
* Events emitted include: `taskAdded`, `taskUpdated`, `taskDeleted`, `activityLogged`.

### 4. Action Logging
* Every significant change (add, edit, delete, assign, drag-drop) is logged.
* `GET /api/activity`: (Protected) Fetch the last 20 activity logs, showing who did what, when, and relevant details.

### 5. Unique Logic Challenges

#### Smart Assign Logic
* **Endpoint:** `POST /api/tasks/smart-assign/:id` (Protected)
* **Functionality:** When triggered for a specific task, the backend performs the following:
    1.  Fetches all active users in the system.
    2.  Calculates the number of *active* tasks (status not "Done") currently assigned to each user.
    3.  Identifies the user with the fewest active tasks.
    4.  Updates the specified task's `assignedTo` field to this "smart" assignee.
    5.  Emits a `taskUpdated` and `activityLogged` event via WebSocket to reflect the change in real-time.

#### Conflict Handling Logic
* The backend implements an **optimistic locking** strategy for task updates.
* When a client sends a `PUT` request to update a task, it *must* include the `lastUpdatedAt` timestamp of the task as it was known to the client.
* The server compares this `lastUpdatedAt` with the `updatedAt` timestamp stored in the database for that task.
* **Conflict Detection:** If the server's `updatedAt` is *newer* than the `lastUpdatedAt` provided by the client, it means another user has modified the task since the client last fetched it.
* **Server Response:** In case of a conflict, the server responds with a `409 Conflict` HTTP status code and sends the `serverVersion` (the latest state of the task on the server) back to the client.
* **Client Responsibility:** The frontend is then responsible for presenting this conflict to the user and allowing them to choose a resolution strategy (overwrite, merge, or discard their changes).

## Setup and Installation (Local Development)

To run the backend locally, follow these steps:

### Prerequisites
* Node.js (v18 or higher recommended)
* npm (comes with Node.js) or Yarn
* **MongoDB Database:**
    * A local MongoDB instance running, OR
    * A cloud-hosted MongoDB Atlas cluster (recommended for ease of setup and production readiness). Get your connection string from Atlas.

### Installation Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/rakshit-2oo4/collaborative-todo-board-backend.git
    cd collaborative-todo-board-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install
    ```

3.  **Create a `.env` file:**
    In the root of the `collaborative-todo-board-backend` directory, create a file named `.env` and add the following environment variables:
    ```dotenv
    PORT=5000
    MONGODB_URI=mongodb+srv://user:password@cluster0.abcde.mongodb.net/todo_board?retryWrites=true&w=majority
    JWT_SECRET=supersecret
    FRONTEND_URL=http://localhost:5173
    ```
    * **`MONGODB_URI`**: `mongodb+srv://user:password@cluster0.abcde.mongodb.net/todo_board?retryWrites=true&w=majority`
    * **`JWT_SECRET`**: `supersecret`
    * **`FRONTEND_URL`**: 'https://collaborative-todo-board-frontend-x.vercel.app/'

4.  **Seed the database (Optional but Recommended):**
    To populate your database with initial users, tasks, and activity logs for testing, run the seeding script. Ensure you have the users already registered or manually insert them with hashed passwords first, as the seed script will fetch existing users.
    ```bash
    node seed.js
    ```

5.  **Start the backend server:**
    ```bash
    node server.js
    ```
    The backend API will typically be available at `http://localhost:5000`.

---
