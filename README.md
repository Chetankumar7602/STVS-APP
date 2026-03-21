# Subudhendra Teertha Vidya Samaste (R) - Official Website

This is a complete, production-ready, full-stack Next.js application built for the charitable trust. It features a modern, animated public landing page and a secure admin panel to manage donations, contacts, and volunteers.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Framer Motion, Lucide React
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas (via Mongoose)
- **Authentication**: JWT & bcrypt (Admin only)
- **Deployment**: Vercel

---

## 🛠️ Local Setup Guide

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A MongoDB Atlas account

### 2. Installation
Clone or download the project, then install dependencies:
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory by copying the `.env.example`:
```bash
cp .env.example .env.local
```
Fill in your `MONGODB_URI` and `JWT_SECRET`.

### 4. Create Initial Admin User
Before you can log into the admin panel, you must create an admin user in the database. Run the included script:
```bash
npm run admin:create -- --username=admin --password="use-a-strong-password"
```

Alternative using environment variables:
```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD="use-a-strong-password" npm run admin:create
```

Security notes:
- Admin scripts no longer contain default credentials.
- Password must be at least 10 characters.
- Never commit real credentials or connection strings to source control.

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the public site and [http://localhost:3000/admin](http://localhost:3000/admin) for the admin portal.

---

## 🚀 Deployment Guide

### Part 1: MongoDB Atlas Setup
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Go to **Database Access** and create a database user with a password.
3. Go to **Network Access** and add IP `0.0.0.0/0` to allow connections from anywhere (required for Vercel).
4. Click **Connect** on your cluster, choose **Connect your application**, and copy the connection string. Replace `<username>` and `<password>`.

### Part 2: Vercel Deployment
1. Push your code to a GitHub/GitLab/Bitbucket repository.
2. Log into [Vercel](https://vercel.com/) and click **Add New** > **Project**.
3. Import your repository.
4. Open the **Environment Variables** section before deploying and add:
   - `MONGODB_URI`: *Your connection string from Atlas*
   - `JWT_SECRET`: *A strong random string for JWT signing*
   - `NEXT_PUBLIC_BASE_URL`: *Your production Vercel URL (e.g., https://my-charity.vercel.app)*
5. Click **Deploy**. Vercel will build and launch your application automatically.

### Part 3: Production Admin User
Once deployed, Vercel cannot run the `scripts/create-admin.js` easily. You have two options:
1. **Local connect to Prod DB**: Temporarily change your local `.env.local` `MONGODB_URI` to your production Atlas string, run `npm run admin:create -- --username=... --password=...`, and revert.
2. **Atlas UI**: Manually create a document in the `adminusers` collection using a pre-hashed bcrypt password.

### 4. Testing
- Go to your public Vercel URL. Test the Donate form, Contact form, and Volunteer form.
- Go to your MongoDB Atlas dashboard -> Browse Collections to verify data is captured.
- Go to `yoursite.com/admin` and log in with the admin credentials. Verify stats and tables load.

---

## Folder Structure Overview
- `/app`: Next.js App Router (Public pages and `/admin` routes)
- `/app/api`: Backend API endpoints
- `/components`: Reusable UI components (Hero, About, Forms, etc.)
- `/models`: Mongoose database schemas
- `/lib`: Helper utilities (MongoDB connection, JWT auth, and static JSON data)
- `/public`: Static assets (images, icons)
- `/scripts`: Setup scripts
