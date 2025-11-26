# Deploying Ludo App for Free

This guide will help you deploy your full-stack Ludo application using **Render** (for hosting) and **MongoDB Atlas** (for the database).

## Prerequisites

1.  **GitHub Account**: Your code needs to be pushed to a GitHub repository.
2.  **Render Account**: Sign up at [render.com](https://render.com).
3.  **MongoDB Atlas Account**: Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas).

## Step 1: Set up the Database (MongoDB Atlas)

1.  Log in to MongoDB Atlas and create a new project.
2.  Click **Create** to build a database.
3.  Select the **M0 Free** tier.
4.  Choose a provider (AWS) and region close to you.
5.  Click **Create Deployment**.
6.  **Security Setup**:
    *   Create a database user (username and password). **Remember these credentials**.
    *   In "Network Access", add IP Address `0.0.0.0/0` (allows access from anywhere, needed for Render).
7.  **Get Connection String**:
    *   Click **Connect** > **Drivers**.
    *   Copy the connection string (e.g., `mongodb+srv://<username>:<password>@cluster0.mongodb.net/...`).
    *   Replace `<username>` and `<password>` with the user you just created.

## Step 2: Push Code to GitHub

1.  Initialize git if you haven't:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```
2.  Create a new repository on GitHub.
3.  Link and push your code:
    ```bash
    git remote add origin <your-repo-url>
    git push -u origin main
    ```

## Step 3: Deploy to Render

1.  Go to your [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub repository.
4.  Configure the service:
    *   **Name**: `ludo-app` (or whatever you like)
    *   **Region**: Choose one close to you.
    *   **Branch**: `main`
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
    *   **Instance Type**: Free
5.  **Environment Variables**:
    Scroll down to "Environment Variables" and add:
    *   `Key`: `MONGO_URI`
    *   `Value`: Your MongoDB connection string from Step 1.
    *   *(Optional)* `Key`: `NODE_VERSION`, `Value`: `20`
6.  Click **Create Web Service**.

## Step 4: Verify

Render will start building your app. It might take a few minutes.
Once finished, you will see a URL (e.g., `https://ludo-app.onrender.com`).
Click it to open your game!

## Optional: Redis (for better performance)

By default, the app uses in-memory storage for game rooms if Redis is not provided. This means if the server restarts (which happens on the free tier), active games might be lost.
To fix this, you can use **Upstash Redis** (Free Tier):
1.  Sign up at [upstash.com](https://upstash.com).
2.  Create a Redis database.
3.  Copy the `REDIS_URL`.
4.  Add it as an Environment Variable in Render: `REDIS_URL`.
