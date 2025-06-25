
# Messenger Chat App (Hosted via GitHub Pages)

This is a real-time Messenger-style web chat app using Firebase Realtime Database and Firebase Storage.  
You can send messages, upload images/files, and edit or delete your own messages.

## 🌐 Live Demo

Once deployed via GitHub Pages, it will be accessible at:
```
https://<your-username>.github.io/<your-repo-name>
```

## 🚀 Features

- Real-time chat with Firebase Realtime Database
- Guest user mode with random names
- Dark mode toggle 🌙/☀️
- Send on Enter ↵
- Edit/Delete your own messages
- Upload and share images/files via Firebase Storage

## 📦 Setup Instructions

### 1. Clone the Repo

```
git clone https://github.com/YOUR_USERNAME/live-chat-app.git
cd live-chat-app
```

### 2. Replace Firebase Config

In `script.js`, replace the placeholder Firebase config with your actual Firebase project credentials:
```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/live-chat-app.git
git push -u origin main
```

### 4. Enable GitHub Pages

- Go to your GitHub repository
- Click **Settings > Pages**
- Under **Source**, choose:
  - Branch: `main`
  - Folder: `/ (root)`
- Click **Save**

Your site will be live at:
```
https://<your-username>.github.io/live-chat-app/
```

## 🔐 Firebase Rules (For Testing Only)

### Realtime Database Rules:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### Storage Rules:
```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ These rules are open for development. Secure them before going live.

---

Happy chatting! 🎉
