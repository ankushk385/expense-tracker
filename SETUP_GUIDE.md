# Expense Tracker — Local Setup Guide

## What You Need (Accounts & Downloads)

### 1. Download Node.js
- Go to: https://nodejs.org
- Click "LTS" (the green button) and download
- Run the installer — keep clicking Next
- This installs Node.js AND npm (package manager)

### 2. Create an Expo Account (FREE)
- Go to: https://expo.dev
- Click "Sign Up" — use your email
- You need this to use Expo Go on your phone

### 3. Install Expo Go on Your Phone (FREE)
- iPhone: Open App Store → search "Expo Go" → install
- Android: Open Play Store → search "Expo Go" → install
- Log in with the Expo account you just created

---

## Step-by-Step Setup

### Step 1 — Download the Project

You are here on Replit. In the left side panel, look for the file called:
```
expense-tracker.tar.gz
```
Right-click it → Download

### Step 2 — Extract the File

**On Windows:**
- Right-click the downloaded file
- Select "Extract All" (Windows 11 can open .tar.gz natively)
- Or install 7-Zip (free) from https://www.7-zip.org
- Right-click → 7-Zip → Extract Here

**On Mac:**
- Double-click the file → it extracts automatically

**On Linux:**
```bash
tar -xzf expense-tracker.tar.gz
```

---

### Step 3 — Open Terminal (Command Prompt)

**Windows:**
- Press Windows key + R
- Type `cmd` and press Enter
- (Or search "Command Prompt" in Start menu)

**Mac:**
- Press Cmd + Space
- Type "Terminal" and press Enter

---

### Step 4 — Navigate to the Project Folder

In your terminal, type (replace the path with where you extracted the files):

```bash
cd path/to/expense-tracker
```

Example on Windows:
```bash
cd C:\Users\YourName\Downloads\expense-tracker
```

Example on Mac:
```bash
cd ~/Downloads/expense-tracker
```

---

### Step 5 — Create the Environment File

In the project folder, create a file called `.env` with this content:

**On Windows — paste this in Command Prompt:**
```
echo EXPO_PUBLIC_DOMAIN=localhost:5000 > .env
echo SESSION_SECRET=my-secret-key-change-this >> .env
```

**On Mac/Linux — paste this in Terminal:**
```bash
echo "EXPO_PUBLIC_DOMAIN=localhost:5000" > .env
echo "SESSION_SECRET=my-secret-key-change-this" >> .env
```

Or you can create the `.env` file manually in any text editor (Notepad, TextEdit) with:
```
EXPO_PUBLIC_DOMAIN=localhost:5000
SESSION_SECRET=my-secret-key-change-this
```

---

### Step 6 — Install Dependencies

In your terminal (in the project folder):

```bash
npm install
```

This downloads all the required packages. It may take 2-5 minutes. Wait until it finishes.

---

### Step 7 — Start the Backend Server

Open a terminal window and run:

```bash
npm run server:dev
```

You should see:
```
express server serving on port 5000
```

Keep this terminal open. Don't close it.

---

### Step 8 — Start the App (Frontend)

Open a SECOND terminal window in the same project folder and run:

```bash
npx expo start
```

You will see a QR code appear in the terminal.

---

### Step 9 — Open on Your Phone

1. Open the **Expo Go** app on your phone
2. Tap "Scan QR Code"
3. Scan the QR code shown in the terminal
4. The app will load on your phone!

**Important:** Your phone and computer must be on the same WiFi network.

---

### Step 10 — Open in Browser (Alternative)

If you don't want to use your phone, press `W` in the terminal where Expo is running.
This opens the app in your web browser at http://localhost:8081

---

## Environment Variables Explained

| Variable | Value | What it does |
|---|---|---|
| `EXPO_PUBLIC_DOMAIN` | `localhost:5000` | Points the app to your local server |
| `SESSION_SECRET` | any random text | Used for security (you can change this to anything) |

---

## Starting the App Every Time

You need two terminals:

**Terminal 1 — Backend:**
```bash
npm run server:dev
```

**Terminal 2 — Frontend:**
```bash
npx expo start
```

---

## Troubleshooting

### "npm: command not found"
→ Node.js was not installed correctly. Re-download from https://nodejs.org and install again.

### "Cannot connect to server"
→ Make sure the backend (Terminal 1) is running with `npm run server:dev`

### QR code not working
→ Make sure your phone and computer are on the same WiFi
→ Try pressing `W` to open in browser instead

### App shows blank screen
→ In Expo terminal, press `R` to reload

### Port already in use
→ Another program is using port 5000. Restart your computer and try again.

---

## App Features

1. **Register** — Create an account (stored on your device)
2. **Login** — Sign in to your account
3. **Dashboard** — See your total balance, income, expenses, and spending chart
4. **Add Transaction** — Tap + to add income or expense with category
5. **History** — Browse all transactions, search and filter
6. **Analytics** — Charts showing spending by category and time period
7. **Settings** — View your profile and manage data

All data is stored locally on your device — no internet required after setup!

---

## Quick Commands Reference

```bash
# Install packages (only needed once)
npm install

# Start backend server
npm run server:dev

# Start frontend/app
npx expo start

# Open in browser
npx expo start --web
```

---

## Need Help?

If you get stuck at any step:
1. Make sure Node.js is installed: run `node --version` in terminal (should show v18 or higher)
2. Make sure you're in the right folder: run `ls` (Mac/Linux) or `dir` (Windows) to see project files
3. Try running `npm install` again
