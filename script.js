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

// *** FIX START ***
// Debounce timer for typing indicator to reduce flicker
let typingIndicatorTimeout = null;
// *** FIX END ***

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
  // Persist userId per user in localStorage
  let id = localStorage.getItem("quickchat-userid");
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("quickchat-userid", id);
  }
  return id.toString(); // *** FIX START: ensure string ***
  // *** FIX END ***
}
function formatTime(date) {
  return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}
// Format "last seen" relative time
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
  renderMessages(); // Update avatars next to messages
  // Highlight selected avatar
  avatarPickerModal.querySelectorAll(".avatar-option").forEach(img => {
    img.classList.toggle("selected", img.src === url);
  });
  closeAvatarPicker();
}

// Presence update with robust handling
function updatePresence() {
  if (!userId || !currentUser) return;
  const presenceUserRef = ref(db, `presence/${userId}`);

  // Set presence data with lastActive timestamp
  set(presenceUserRef, {
    username: currentUser.username,
    gender: currentUser.gender,
    avatarUrl: currentUser.avatarUrl,
    lastActive: Date.now()
  });

  // Remove presence on disconnect
  onDisconnect(presenceUserRef).remove();
}

// Listen for Firebase connection state and handle presence accordingly
function setupConnectionListener() {
  onValue(connectedRef, snap => {
    if (snap.val() === true) {
      // Client is connected to Firebase
      updatePresence();

      // Refresh lastActive periodically while connected
      presenceHeartbeatInterval = setInterval(() => {
        updatePresence();
      }, 15000); // every 15 seconds
    } else {
      // Client disconnected from Firebase
      if (presenceHeartbeatInterval) {
        clearInterval(presenceHeartbeatInterval);
        presenceHeartbeatInterval = null;
      }
    }
  });
}

// Render one message element
function createMessageElement(msgObj) {
  const isCurrentUser = msgObj.userId === userId;

  const container = document.createElement("div");
  container.className = "message" + (isCurrentUser ? " you" : "");
  container.tabIndex = -1;

  // Avatar with presence classes and last seen tooltip
  const avatarImg = document.createElement("img");
  avatarImg.className = "avatar presence-offline";
  avatarImg.src = msgObj.avatarUrl || getDefaultAvatar(msgObj.gender);
  avatarImg.alt = `${msgObj.username}'s avatar`;
  avatarImg.loading = "lazy";

  // Set presence dot class and tooltip after presence map is loaded
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

  // Content container
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";

  // Sender name
  const senderSpan = document.createElement("div");
  senderSpan.className = "sender";
  senderSpan.textContent = msgObj.username || "Anonymous";
  contentDiv.appendChild(senderSpan);

  // Message bubble
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

  // Info bar: timestamp + edit/delete for own messages
  const infoDiv = document.createElement("div");
  infoDiv.className = "info";

  const timeSpan = document.createElement("span");
  timeSpan.textContent = formatTime(new Date(msgObj.timestamp));
  infoDiv.appendChild(timeSpan);

  if (isCurrentUser) {
    const actionsDiv = document.createElement("span");
    actionsDiv.className = "actions";

    // Edit
    const editBtn = document.createElement("button");
    editBtn.title = "Edit message";
    editBtn.setAttribute("aria-label", "Edit message");
    editBtn.textContent = "✏️";
    editBtn.addEventListener("click", () => {
      editMessage(msgObj.key, msgObj.text);
    });
    actionsDiv.appendChild(editBtn);

    // Delete
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

// Default avatar if missing
function getDefaultAvatar(gender = "male") {
  return "https://randomuser.me/api/portraits/lego/1.jpg";
}

// Render all messages
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

// Send message
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

// Delete message
async function deleteMessage(key) {
  await remove(ref(db, `messages/${key}`));
}

// Edit message (prompt)
async function editMessage(key, oldText) {
  const newText = prompt("Edit your message:", oldText);
  if (newText !== null) {
    await set(ref(db, `messages/${key}/text`), newText);
  }
}

// Listen for messages
function listenMessages() {
  onChildAdded(messagesRef, snapshot => {
    const msg = snapshot.val();
    msg.key = snapshot.key;
    // Prevent duplicates
    if (!messagesCache.find(m => m.key === msg.key)) {
      messagesCache.push(msg);
      renderMessages();
    }
  });
  // Listen for message deletions
  onValue(messagesRef, snapshot => {
    const keys = snapshot.exists() ? Object.keys(snapshot.val()) : [];
    messagesCache = messagesCache.filter(m => keys.includes(m.key));
    renderMessages();
  });
}

// Typing indicator handling with fixes
function setTyping(isTypingNow) {
  if (!userId) return;
  if (lastTypingState === isTypingNow) return; // prevent repeated writes

  lastTypingState = isTypingNow;
  const typingUserRef = ref(db, `typing/${userId}`);

  if (isTypingNow) {
    set(typingUserRef, currentUser.username);
    onDisconnect(typingUserRef).remove();
  } else {
    remove(typingUserRef);
  }
}

// *** FIX START ***
// Updated listenTyping to exclude own userId strictly as string
function listenTyping() {
  onValue(typingRef, snapshot => {
    const typingUsers = snapshot.val() || {};
    userTypingUsers.clear();
    for (const uid in typingUsers) {
      if (uid.toString() !== userId.toString()) {
        userTypingUsers.add(typingUsers[uid]);
      }
    }
    updateTypingIndicator();
  });
}

// Debounced updateTypingIndicator to reduce flicker
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
// *** FIX END ***

// Presence listener and map update
function listenPresence() {
  onValue(presenceRef, snapshot => {
    const data = snapshot.val() || {};
    presenceMap.clear();
    for (const uid in data) {
      presenceMap.set(uid, data[uid]);
    }
    renderMessages(); // To update presence dots and tooltips
  });
}

// Input event for typing with longer debounce timeout
textInput.addEventListener("input", () => {
  if (!isTyping) {
    setTyping(true);
    isTyping = true;
  }
  lastTypingTime = Date.now();

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    if (Date.now() - lastTypingTime >= 3000) {
      setTyping(false);
      isTyping = false;
    }
  }, 3000);
});

sendBtn.addEventListener("click", () => {
  if (textInput.value.trim()) {
    sendMessage(textInput.value.trim());
    textInput.value = "";
  }
});

textInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

// Emoji picker toggle and emoji insert
emojiBtn.addEventListener("click", () => {
  emojiPicker.style.display = emojiPicker.style.display === "block" ? "none" : "block";
  if (emojiPicker.style.display === "block") emojiPicker.focus();
});
emojiPicker.innerHTML = emojis.map(e => `<span tabindex="0" class="emoji">${e}</span>`).join("");
emojiPicker.addEventListener("click", e => {
  if (e.target.classList.contains("emoji")) {
    insertAtCursor(textInput, e.target.textContent);
    textInput.focus();
    emojiPicker.style.display = "none";
    textInput.dispatchEvent(new Event("input"));
  }
});
emojiPicker.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.classList.contains("emoji")) {
    e.preventDefault();
    insertAtCursor(textInput, e.target.textContent);
    textInput.focus();
    emojiPicker.style.display = "none";
    textInput.dispatchEvent(new Event("input"));
  }
});
function insertAtCursor(input, text) {
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const val = input.value;
  input.value = val.slice(0, start) + text + val.slice(end);
  input.selectionStart = input.selectionEnd = start + text.length;
}

// File upload
fileBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/") && !file.type.startsWith("application/")) {
    alert("Only image and file types are supported");
    return;
  }
  // For demo: simulate upload by creating object URL (replace with real upload if needed)
  const fileUrl = URL.createObjectURL(file);
  sendMessage("", file.type.startsWith("image/") ? "image" : "file", fileUrl);
  fileInput.value = "";
});

// Night mode toggle
nightModeBtn.addEventListener("click", () => {
  const enabled = document.body.classList.toggle("nightmode");
  saveNightMode(enabled);
});

// Change username modal
changeUserBtn.addEventListener("click", () => {
  openModal();
});

// Modal functions
function openModal() {
  modalOverlay.style.display = "flex";
  usernameInput.value = currentUser?.username || "";
  usernameInput.focus();
}
function closeModal() {
  modalOverlay.style.display = "none";
}
saveProfileBtn.addEventListener("click", () => {
  const name = usernameInput.value.trim();
  if (!name) {
    alert("Please enter your username");
    return;
  }
  currentUser.username = name;
  if (!currentUser.avatarUrl) {
    currentUser.avatarUrl = maleAvatars[0];
  }
  saveUserToLocal(currentUser);
  updatePresence();
  updateUIForUser();
  closeModal();
});
modalOverlay.addEventListener("click", e => {
  if (e.target === modalOverlay) closeModal();
});

// Avatar picker open/close
avatarPickerBtn.addEventListener("click", openAvatarPicker);
avatarPickerOverlay.addEventListener("click", e => {
  if (e.target === avatarPickerOverlay) closeAvatarPicker();
});

// Initialize user data on startup
function initUser() {
  currentUser = loadUserFromLocal();
  if (!currentUser) {
    currentUser = {
      username: "Anonymous",
      gender: "male",
      avatarUrl: maleAvatars[0]
    };
    saveUserToLocal(currentUser);
  }
  userId = generateUserId();
  selectedAvatarUrl = currentUser.avatarUrl;
  updateUIForUser();
}

// Update UI elements to reflect user data
function updateUIForUser() {
  // Could update user avatar preview, username display, etc.
  // For example:
  document.title = `Quick Chat - ${currentUser.username}`;
}

function initNightMode() {
  if (loadNightMode()) document.body.classList.add("nightmode");
}

function init() {
  initUser();
  initNightMode();
  listenMessages();
  listenTyping();
  listenPresence();
  setupConnectionListener();
  updateUIForUser();
}

init();
