const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();
const messagesRef = db.ref("messages");

let userName = "";

function getUserName() {
  if (!userName) {
    const inputName = document.getElementById("name").value.trim();
    userName = inputName || "Guest_" + Math.floor(Math.random() * 10000);
    document.getElementById("name").value = userName;
  }
  return userName;
}

function sendMessage() {
  const name = getUserName();
  const text = document.getElementById("text").value.trim();
  if (!text) return;

  const timestamp = new Date().toISOString();
  messagesRef.push({ name, text, timestamp });
  document.getElementById("text").value = "";
}

document.getElementById("sendBtn").addEventListener("click", sendMessage);
document.getElementById("text").addEventListener("keydown", function(e) {
  if (e.key === "Enter") sendMessage();
});

messagesRef.on("child_added", (snapshot) => {
  const msg = snapshot.val();
  const key = snapshot.key;
  const currentUser = getUserName();
  const wrapper = document.createElement("div");
  wrapper.className = "message " + (msg.name === currentUser ? "you" : "other");

  const messageText = document.createElement("div");
  messageText.innerHTML = msg.text.includes("https://") && msg.text.match(/(jpg|jpeg|png|gif)/i)
    ? `<img src="${msg.text}" style="max-width: 100%;">`
    : `${msg.name}: ${msg.text}`;

  wrapper.appendChild(messageText);

  if (msg.name === currentUser) {
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.onclick = () => {
      const newText = prompt("Edit your message:", msg.text);
      if (newText) messagesRef.child(key).update({ text: newText });
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.onclick = () => messagesRef.child(key).remove();

    wrapper.appendChild(editBtn);
    wrapper.appendChild(deleteBtn);
  }

  document.getElementById("messages").appendChild(wrapper);
  document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
});

document.getElementById("fileInput").addEventListener("change", function() {
  const file = this.files[0];
  if (!file) return;
  const name = getUserName();
  const ref = storage.ref('uploads/' + Date.now() + "_" + file.name);
  ref.put(file).then(snapshot => {
    snapshot.ref.getDownloadURL().then(url => {
      messagesRef.push({ name, text: url, timestamp: new Date().toISOString() });
    });
  });
});

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  const icon = document.querySelector(".toggle-mode");
  icon.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
}