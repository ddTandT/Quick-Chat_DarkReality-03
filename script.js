const fbConfig = {
  apiKey: "AIzaSyCx_glObBqdqtOs64JhV3fyJW-q9DOqbl0",
  authDomain: "live-chat-app-5ea98.firebaseapp.com",
  databaseURL: "https://live-chat-app-5ea98-default-rtdb.firebaseio.com",
  projectId: "live-chat-app-5ea98",
  storageBucket: "live-chat-app-5ea98.appspot.com",
  messagingSenderId: "58710835031",
  appId: "1:58710835031:web:9248de0eba59c09c0fc812",
  measurementId: "G-M7BMS3FS2L"
};
firebase.initializeApp(fbConfig);
const db = firebase.database();
const messagesRef = db.ref("messages");

function getUserName() {
  return localStorage.getItem("chatUserName") || "";
}
function saveName() {
  const name = document.getElementById("name").value.trim() || getUserName();
  localStorage.setItem("chatUserName", name);
  document.getElementById("name").value = name;
}
function enableNameEdit() {
  document.getElementById("name").removeAttribute("disabled");
  document.getElementById("name").focus();
}
window.addEventListener("load", () => {
  const saved = getUserName();
  if (saved) document.getElementById("name").value = saved;
  document.getElementById("name").setAttribute("disabled", true);
});

document.getElementById("sendBtn").addEventListener("click", sendMessage);
document.getElementById("text").addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  saveName();
  const name = getUserName();
  const text = document.getElementById("text").value.trim();
  const file = document.getElementById("fileInput").files[0];
  if (!text && !file) return;

  const data = { name, timestamp: new Date().toISOString() };
  if (text) data.text = text;
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      data.file = e.target.result;
      data.fileName = file.name;
      messagesRef.push(data);
    };
    reader.readAsDataURL(file);
  } else {
    messagesRef.push(data);
  }
  document.getElementById("text").value = "";
  document.getElementById("fileInput").value = "";
}

messagesRef.on("child_added", snap => {
  const msg = snap.val(), key = snap.key;
  const name = getUserName();
  const div = document.createElement("div");
  div.className = "message " + (msg.name === name ? "you" : "other");
  div.innerHTML = \`
    <div class="username">\${msg.name}</div>
    \${msg.text ? `<div>\${msg.text}</div>` : ""}
    \${msg.file ? `<div><a href="\${msg.file}" download="\${msg.fileName}">\${msg.fileName}</a></div>` : ""}
    <div class="timestamp">\${new Date(msg.timestamp).toLocaleTimeString()}</div>
    \${msg.name === name ? `<div class="message-actions">
      <span onclick="editMessage('\${key}')">✏️</span>
      <span onclick="deleteMessage('\${key}')">🗑️</span>
    </div>` : ""}
  \`;
  div.dataset.key = key;
  document.getElementById("messages").append(div);
  div.scrollIntoView();
});

function editMessage(k) {
  const newText = prompt("Edit your message:");
  if (!newText) return;
  messagesRef.child(k).update({ text: newText });
  location.reload();
}
function deleteMessage(k) {
  messagesRef.child(k).remove();
  location.reload();
}

function toggleNightMode() {
  document.body.classList.toggle("night");
}

const emojis = ["😀","😂","😍","😎","😉","👍","🥳","😢","🤔","❤️"];
const picker = document.getElementById("emojiPicker");
const textIn = document.getElementById("text");
emojis.forEach(e => {
  const span = document.createElement("span");
  span.textContent = e;
  span.onclick = () => { textIn.value += e; picker.style.display = "none"; };
  picker.appendChild(span);
});
document.getElementById("emojiBtn").onclick = () => {
  picker.style.display = picker.style.display === "none" ? "flex" : "none";
};
