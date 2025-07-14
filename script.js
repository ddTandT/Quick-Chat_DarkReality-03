import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getDatabase, ref, push, onChildAdded, get, set,
  remove, onValue, onDisconnect
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Firebase config - replace with your own config if needed
const firebaseConfig = {
  apiKey: "AIzaSyCx_glObBqdqtOs64JhV3fyJW-q9DOqbl0",
  authDomain: "live-chat-app-5ea98.firebaseapp.com",
  databaseURL: "https://live-chat-app-5ea98-default-rtdb.firebaseio.com",
  projectId: "live-chat-app-5ea98",
  storageBucket: "live-chat-app-5ea98.appspot.com",
  messagingSenderId: "58710835031",
  appId: "1:58710835031:web:9248de0eba59c09c0fc812"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messagesRef = ref(db, "messages");
const typingRef = ref(db, "typing");
const presenceRef = ref(db, "presence");
const connectedRef = ref(db, ".info/connected");  // Firebase connection state

// DOM elements
const textInput = document.getElementById("text");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");
const fileBtn = document.getElementById("fileBtn");
const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");
const messagesDiv = document.getElementById("messages");
const nightModeBtn = document.getElementById("nightModeBtn");
const changeUserBtn = document.getElementById("changeUserBtn");
const typingIndicator = document.getElementById("typingIndicator");
const modalOverlay = document.getElementById("modalOverlay");
const usernameInput = document.getElementById("usernameInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const avatarPickerOverlay = document.getElementById("avatarPickerOverlay");
const avatarPickerModal = document.getElementById("avatarPickerModal");
const avatarPickerBtn = document.getElementById("avatarPickerBtn");

// Male avatars list
const maleAvatars = [
  "https://randomuser.me/api/portraits/men/1.jpg",
  "https://randomuser.me/api/portraits/men/2.jpg",
  "https://randomuser.me/api/portraits/men/3.jpg",
  "https://randomuser.me/api/portraits/men/4.jpg",
  "https://randomuser.me/api/portraits/men/5.jpg",
  "https://randomuser.me/api/portraits/men/6.jpg",
  "https://randomuser.me/api/portraits/men/7.jpg",
  "https://randomuser.me/api/portraits/men/8.jpg",
  "https://randomuser.me/api/portraits/men/9.jpg",
  "https://randomuser.me/api/portraits/men/10.jpg",
  "https://randomuser.me/api/portraits/men/11.jpg",
  "https://randomuser.me/api/portraits/men/12.jpg",
  "https://randomuser.me/api/portraits/men/13.jpg",
  "https://randomuser.me/api/portraits/men/14.jpg",
  "https://randomuser.me/api/portraits/men/15.jpg",
  "https://randomuser.me/api/portraits/men/16.jpg",
  "https://randomuser.me/api/portraits/men/17.jpg",
  "https://randomuser.me/api/portraits/men/18.jpg",
  "https://randomuser.me/api/portraits/men/19.jpg",
  "https://randomuser.me/api/portraits/men/20.jpg"
];

// Extended emoji list
const emojis = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇",
  "🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚",
  "😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥳",
  "🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄",
  "😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴",
  "😌","😔","😕","🙃","😢","😭","😤","😠","😡","🤬",
  "🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤤",
  "😴","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕",
  "🤑","🤠","😈","👿","👹","👺","💀","👻","👽","🤖",
  "💩","😺","😸","😹","😻","😼","😽","🙀","😿","😾"
];

// State variables
let currentUser = null; // {username, gender, avatarUrl}
let userId = null;
let typingTimeout = null;
let isTyping = false;
let lastTypingTime = 0;
let userTypingUsers = new Set();
let messagesCache = [];
let presenceMap = new Map();
let selectedAvatarUrl = null;
let lastTypingState = false; // for typing status debounce
let presenceHeartbeatInterval = null;

// Debounce timer for typing indicator to reduce flicker
let typingIndicatorTimeout = null;

// Utils
function saveUserToLocal(user) {
  localStorage.setItem("quickchat-user", JSON.stringify(user));
}
function loadUserFromLocal() {
  const userStr = localStorage.getItem("quickchat-user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}
function saveNightMode(enabled) {
  localStorage.setItem("quickchat-nightmode", enabled ? "1" : "0");
}
function loadNightMode() {
  return localStorage.getItem("quickchat-nightmode") === "1";
}
function generateUserId() {
  let id = localStorage.getItem("quickchat-userid");
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("quickchat-userid", id);
  }
  return id.toString();
}
function formatTime(date) {
  return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}
function formatLastSeen(timestamp) {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Last seen just now";
  if (diffSec < 3600) return `Last seen ${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `Last seen ${Math.floor(diffSec / 3600)} hr ago`;
  return `Last seen ${new Date(timestamp).toLocaleDateString()}`;
}

// Avatar picker
function openAvatarPicker() {
  avatarPickerModal.innerHTML = '<h2 id="avatarPickerTitle" style="width:100%; text-align:center; user-select:none;">Pick Your Avatar</h2>';
  maleAvatars.forEach(url => {
    const img = document.createElement("img");
    img.src = url;
    img.classList.add("avatar-option");
    img.alt = "Avatar option";
    if (url === selectedAvatarUrl) {
      img.classList.add("selected");
    }
    img.tabIndex = 0;
    img.addEventListener("click", () => {
      selectAvatar(url);
    });
    img.addEventListener("keypress", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectAvatar(url);
      }
    });
    avatarPickerModal.appendChild(img);
  });
  avatarPickerOverlay.style.display = "flex";
  avatarPickerModal.focus();
}
function closeAvatarPicker() {
  avatarPickerOverlay.style.display = "none";
}
function selectAvatar(url) {
  selectedAvatarUrl = url;
  if (!currentUser) return;
  currentUser.avatarUrl = url;
  saveUserToLocal(currentUser);
  updatePresence();
  updateUIForUser();
  renderMessages();
  avatarPickerModal.querySelectorAll(".avatar-option").forEach(img => {
    img.classList.toggle("selected", img.src === url);
  });
  closeAvatarPicker();
}

// Presence update
function updatePresence() {
  if (!userId || !currentUser) return;
  const presenceUserRef = ref(db, `presence/${userId}`);
  set(presenceUserRef, {
    username: currentUser.username,
    gender: currentUser.gender,
    avatarUrl: currentUser.avatarUrl,
    lastActive: Date.now()
  });
  onDisconnect(presenceUserRef).remove();
}

// Firebase connection state handling
function setupConnectionListener() {
  onValue(connectedRef, snap => {
    if (snap.val() === true) {
      updatePresence();
      presenceHeartbeatInterval = setInterval(() => {
        updatePresence();
      }, 15000);
    } else {
      if (presenceHeartbeatInterval) {
        clearInterval(presenceHeartbeatInterval);
        presenceHeartbeatInterval = null;
      }
    }
  });
}

// Create message element
function createMessageElement(msgObj) {
  const isCurrentUser = msgObj.userId === userId;
  const container = document.createElement("div");
  container.className = "message" + (isCurrentUser ? " you" : "");
  container.tabIndex = -1;

  const avatarImg = document.createElement("img");
  avatarImg.className = "avatar presence-offline";
  avatarImg.src = msgObj.avatarUrl || getDefaultAvatar(msgObj.gender);
  avatarImg.alt = `${msgObj.username}'s avatar`;
  avatarImg.loading = "lazy";

  const presenceUser = [...presenceMap.values()].find(u => u.username === msgObj.username);
  if (presenceUser) {
    const online = (Date.now() - presenceUser.lastActive) < 30000;
    if (online) {
      avatarImg.classList.add("presence-online");
      avatarImg.classList.remove("presence-offline");
      avatarImg.title = "Online";
    } else {
      avatarImg.classList.remove("presence-online");
      avatarImg.classList.add("presence-offline");
      avatarImg.title = formatLastSeen(presenceUser.lastActive);
    }
  } else {
    avatarImg.classList.remove("presence-online");
    avatarImg.classList.add("presence-offline");
    avatarImg.title = "";
  }

  container.appendChild(avatarImg);

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";

  const senderSpan = document.createElement("div");
  senderSpan.className = "sender";
  senderSpan.textContent = msgObj.username || "Anonymous";
  contentDiv.appendChild(senderSpan);

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "bubble";

  if (msgObj.type === "text") {
    bubbleDiv.textContent = msgObj.text || "";
  } else if (msgObj.type === "image" && msgObj.fileUrl) {
    const img = document.createElement("img");
    img.src = msgObj.fileUrl;
    img.alt = "Image message";
    img.style.maxWidth = "200px";
    img.style.borderRadius = "10px";
    bubbleDiv.appendChild(img);
  } else if (msgObj.type === "file" && msgObj.fileUrl) {
    const link = document.createElement("a");
    link.href = msgObj.fileUrl;
    link.textContent = "Download file";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    bubbleDiv.appendChild(link);
  } else {
    bubbleDiv.textContent = "[Unsupported message type]";
  }
  contentDiv.appendChild(bubbleDiv);

  const infoDiv = document.createElement("div");
  infoDiv.className = "info";

  const timeSpan = document.createElement("span");
  timeSpan.textContent = formatTime(new Date(msgObj.timestamp));
  infoDiv.appendChild(timeSpan);

  if (isCurrentUser) {
    const actionsDiv = document.createElement("span");
    actionsDiv.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.title = "Edit message";
    editBtn.setAttribute("aria-label", "Edit message");
    editBtn.textContent = "✏️";
    editBtn.addEventListener("click", () => {
      editMessage(msgObj.key, msgObj.text);
    });
    actionsDiv.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.title = "Delete message";
    deleteBtn.setAttribute("aria-label", "Delete message");
    deleteBtn.textContent = "🗑️";
    deleteBtn.addEventListener("click", () => {
      if (confirm("Delete this message?")) {
        deleteMessage(msgObj.key);
      }
    });
    actionsDiv.appendChild(deleteBtn);

    infoDiv.appendChild(actionsDiv);
  }

  contentDiv.appendChild(infoDiv);
  container.appendChild(contentDiv);

  return container;
}

function getDefaultAvatar(gender = "male") {
  return "https://randomuser.me/api/portraits/lego/1.jpg";
}

function renderMessages() {
  messagesDiv.innerHTML = "";
  messagesCache.forEach(msg => {
    const el = createMessageElement(msg);
    messagesDiv.appendChild(el);
  });
  scrollToBottom();
}

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendMessage(text, type = "text", fileUrl = null) {
  if (!currentUser || (!text && !fileUrl)) return;
  const msg = {
    userId,
    username: currentUser.username,
    gender: currentUser.gender,
    avatarUrl: currentUser.avatarUrl,
    text: text || "",
    type,
    fileUrl: fileUrl || null,
    timestamp: Date.now()
  };
  await push(messagesRef, msg);
  setTyping(false);
}

async function deleteMessage(key) {
  await remove(ref(db, `messages/${key}`));
}

async function editMessage(key, oldText) {
  const newText = prompt("Edit your message:", oldText);
  if (newText !== null) {
    await set(ref(db, `messages/${key}/text`), newText);
  }
}

function listenMessages() {
  onChildAdded(messagesRef, snapshot => {
    const msg = snapshot.val();
    msg.key = snapshot.key;
    if (!messagesCache.find(m => m.key === msg.key)) {
      messagesCache.push(msg);
      renderMessages();
    }
  });
  onValue(messagesRef, snapshot => {
    const keys = snapshot.exists() ? Object.keys(snapshot.val()) : [];
    messagesCache = messagesCache.filter(m => keys.includes(m.key));
    renderMessages();
  });
}

// Typing indicator handling with fix to exclude own typing
function setTyping(isTypingNow) {
  if (!userId) return;
  if (lastTypingState === isTypingNow) return; // prevent repeated writes

  lastTypingState = isTypingNow;
  const typingUserRef = ref(db, `typing/${userId}`);

  if (isTypingNow) {
    set(typingUserRef, {
      username: currentUser.username,
      timestamp: Date.now()
    });
    onDisconnect(typingUserRef).remove();
  } else {
    remove(typingUserRef);
  }
}

// Listen typing excluding own typing
function listenTyping() {
  onValue(typingRef, snapshot => {
    const typingUsers = snapshot.val() || {};
    userTypingUsers.clear();
    const now = Date.now();
    for (const uid in typingUsers) {
      const data = typingUsers[uid];
      // IMPORTANT: Exclude own typing by strict string comparison
      if (uid.toString() !== userId.toString()) {
        if (data.timestamp && (now - data.timestamp < 5000)) {
          userTypingUsers.add(data.username);
        }
      }
    }
    updateTypingIndicator();
  });
}

// Debounced typing indicator update
function updateTypingIndicator() {
  if (typingIndicatorTimeout) clearTimeout(typingIndicatorTimeout);
  typingIndicatorTimeout = setTimeout(() => {
    const users = [...userTypingUsers];
    if (users.length === 0) {
      typingIndicator.textContent = "";
    } else if (users.length === 1) {
      typingIndicator.textContent = `${users[0]} is typing...`;
    } else if (users.length === 2) {
      typingIndicator.textContent = `${users[0]} and ${users[1]} are typing...`;
    } else {
      const lastUser = users.pop();
      typingIndicator.textContent = `${users.join(", ")}, and ${lastUser} are typing...`;
    }
  }, 100);
}

function listenPresence() {
  onValue(presenceRef, snapshot => {
    const data = snapshot.val() || {};
    presenceMap.clear();
    for (const uid in data) {
      presenceMap.set(uid, data[uid]);
    }
    renderMessages();
  });
}

textInput.addEventListener("input", () => {
  if (!currentUser) return;
  if (!isTyping) {
    setTyping(true);
    isTyping = true;
  }
  lastTypingTime = Date.now();

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    if (Date.now() - lastTypingTime >= 1000) {
      setTyping(false);
      isTyping = false;
    }
  }, 1000);
});

emojiBtn.addEventListener("click", () => {
  emojiPicker.style.display = emojiPicker.style.display === "block" ? "none" : "block";
  if (emojiPicker.style.display === "block") {
    emojiPicker.focus();
  }
});

function populateEmojiPicker() {
  emojis.forEach(e => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emoji-button";
    btn.textContent = e;
    btn.title = e;
    btn.addEventListener("click", () => {
      textInput.value += e;
      textInput.focus();
      emojiPicker.style.display = "none";
      // trigger input event for typing indicator
      textInput.dispatchEvent(new Event('input'));
    });
    emojiPicker.appendChild(btn);
  });
}

sendBtn.addEventListener("click", async () => {
  const text = textInput.value.trim();
  if (text) {
    await sendMessage(text, "text");
    textInput.value = "";
    emojiPicker.style.display = "none";
  }
});

fileBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async () => {
  if (!currentUser) return;
  const file = fileInput.files[0];
  if (!file) return;
  // For demo: upload to Firebase Storage or elsewhere
  // Here we'll just simulate with FileReader (not uploading)
  const reader = new FileReader();
  reader.onload = async e => {
    // We don't have upload in your code, so let's send as data URL image if image type
    if (file.type.startsWith("image/")) {
      await sendMessage("", "image", e.target.result);
    } else {
      // Unsupported file type: just notify
      alert("File sending only supported for images in this demo.");
    }
  };
  reader.readAsDataURL(file);
  fileInput.value = "";
});

changeUserBtn.addEventListener("click", () => {
  openProfileModal();
});

avatarPickerBtn.addEventListener("click", () => {
  openAvatarPicker();
});

avatarPickerOverlay.addEventListener("click", e => {
  if (e.target === avatarPickerOverlay) closeAvatarPicker();
});

modalOverlay.addEventListener("click", e => {
  if (e.target === modalOverlay) closeProfileModal();
});

saveProfileBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  if (!username) {
    alert("Username cannot be empty.");
    return;
  }
  currentUser.username = username;
  if (!currentUser.avatarUrl) {
    currentUser.avatarUrl = maleAvatars[Math.floor(Math.random() * maleAvatars.length)];
  }
  saveUserToLocal(currentUser);
  updatePresence();
  updateUIForUser();
  renderMessages();
  closeProfileModal();
});

function openProfileModal() {
  usernameInput.value = currentUser ? currentUser.username : "";
  modalOverlay.style.display = "flex";
  usernameInput.focus();
}

function closeProfileModal() {
  modalOverlay.style.display = "none";
}

function updateUIForUser() {
  if (!currentUser) return;
  selectedAvatarUrl = currentUser.avatarUrl || maleAvatars[0];
  // Update any UI parts related to user info if needed
}

// Init
function init() {
  userId = generateUserId();
  currentUser = loadUserFromLocal();

  if (!currentUser || !currentUser.username) {
    currentUser = {
      username: "",
      gender: "male",
      avatarUrl: maleAvatars[Math.floor(Math.random() * maleAvatars.length)]
    };
    saveUserToLocal(currentUser);
    openProfileModal();
  } else {
    updateUIForUser();
  }

  setupConnectionListener();
  listenMessages();
  listenTyping();
  listenPresence();
  populateEmojiPicker();
  updatePresence();

  // Load night mode
  if (loadNightMode()) {
    document.body.classList.add("night");
  }
  nightModeBtn.addEventListener("click", () => {
    document.body.classList.toggle("night");
    saveNightMode(document.body.classList.contains("night"));
  });
}

init();
