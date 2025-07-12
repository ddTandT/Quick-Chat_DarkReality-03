// Quick Chat – Fully Functional Core JavaScript
// Works with existing and future HTML upgrades without needing JS changes

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getDatabase, ref, push, onChildAdded, onValue, set, remove, onDisconnect
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const config = {
  apiKey: "AIzaSyCx_glObBqdqtOs64JhV3fyJW-q9DOqbl0",
  authDomain: "live-chat-app-5ea98.firebaseapp.com",
  databaseURL: "https://live-chat-app-5ea98-default-rtdb.firebaseio.com",
  projectId: "live-chat-app-5ea98",
  storageBucket: "live-chat-app-5ea98.appspot.com",
  messagingSenderId: "58710835031",
  appId: "1:58710835031:web:9248de0eba59c09c0fc812"
};

const app = initializeApp(config);
const db = getDatabase(app);
const messagesRef = ref(db, "messages");
const typingRef = ref(db, "typing");
const presenceRef = ref(db, "presence");

const uid = localStorage.getItem("sessionId") || (() => {
  const id = "uid_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("sessionId", id);
  return id;
})();

let currentUser = JSON.parse(localStorage.getItem("quickChatUser") || "null");
if (!currentUser) {
  alert("User profile missing. Please refresh and complete setup.");
  throw new Error("User profile not found");
}

function sendMessage(text, file = null) {
  if (!text && !file) return;
  const now = Date.now();
  push(messagesRef, {
    senderId: uid,
    senderName: currentUser.name,
    senderGender: currentUser.gender,
    senderAvatar: currentUser.avatar,
    text,
    fileDataUrl: file?.dataUrl || null,
    fileName: file?.name || null,
    timestamp: now
  });
}

function updateTypingStatus(isTyping) {
  set(ref(db, `typing/${uid}`), isTyping ? currentUser.name : null);
}

function updatePresence(online = true) {
  const status = { online, lastSeen: Date.now() };
  set(ref(db, `presence/${uid}`), status);
  onDisconnect(ref(db, `presence/${uid}`)).set({ online: false, lastSeen: Date.now() });
}

function listenForTyping(callback) {
  onValue(typingRef, snap => {
    const typingUsers = [];
    snap.forEach(child => {
      if (child.key !== uid && child.val()) {
        typingUsers.push(child.val());
      }
    });
    callback(typingUsers);
  });
}

function listenForMessages(callback) {
  onChildAdded(messagesRef, snap => {
    callback({ id: snap.key, ...snap.val() });
  });
}

function listenForPresence(callback) {
  onValue(presenceRef, snap => {
    const data = {};
    snap.forEach(child => {
      data[child.key] = child.val();
    });
    callback(data);
  });
}

function editMessage(id, newText) {
  const msgRef = ref(db, `messages/${id}`);
  set(msgRef, { ...messagesMap.get(id), text: newText });
}

function deleteMessage(id) {
  remove(ref(db, `messages/${id}`));
}

updatePresence(navigator.onLine);
window.addEventListener("online", () => updatePresence(true));
window.addEventListener("offline", () => updatePresence(false));

export {
  sendMessage,
  updateTypingStatus,
  listenForTyping,
  listenForMessages,
  listenForPresence,
  editMessage,
  deleteMessage,
  currentUser,
  uid
};
