<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js"></script>

<script>
  const firebaseConfig = {
    apiKey: "AIzaSyCx_glObBqdqtOs64JhV3fyJW-q9DOqbl0",
    authDomain: "live-chat-app-5ea98.firebaseapp.com",
    databaseURL: "https://live-chat-app-5ea98-default-rtdb.firebaseio.com",
    projectId: "live-chat-app-5ea98",
    storageBucket: "live-chat-app-5ea98.appspot.com",
    messagingSenderId: "58710835031",
    appId: "1:58710835031:web:9248de0eba59c09c0fc812"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  const storage = firebase.storage();
  const auth = firebase.auth();

  let userName = "";
  let userUID = "";

  auth.signInAnonymously().catch(console.error);

  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      userUID = user.uid;

      // PRESENCE: Track online/offline
      const userStatusRef = db.ref("/presence/" + userUID);
      const isOffline = { state: "offline", last_changed: firebase.database.ServerValue.TIMESTAMP };
      const isOnline = { state: "online", last_changed: firebase.database.ServerValue.TIMESTAMP };

      const connectedRef = db.ref(".info/connected");
      connectedRef.on("value", (snap) => {
        if (snap.val() === false) return;
        userStatusRef.onDisconnect().set(isOffline).then(() => {
          userStatusRef.set(isOnline);
        });
      });
    }
  });

  const messagesRef = db.ref("messages");

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
    messagesRef.push({ name, text, timestamp, uid: userUID });
    document.getElementById("text").value = "";
  }

  document.getElementById("sendBtn").addEventListener("click", sendMessage);
  document.getElementById("text").addEventListener("keydown", function (e) {
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
      : `<strong>${msg.name}</strong>: ${msg.text}`;

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

  document.getElementById("fileInput").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    const name = getUserName();
    const ref = storage.ref('uploads/' + Date.now() + "_" + file.name);
    ref.put(file).then(snapshot => {
      snapshot.ref.getDownloadURL().then(url => {
        messagesRef.push({ name, text: url, timestamp: new Date().toISOString(), uid: userUID });
      });
    });
  });

  function toggleDarkMode() {
    document.body.classList.toggle("dark");
    const icon = document.querySelector(".toggle-mode");
    icon.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  }

  // ✅ SHOW PRESENCE STATUS for all users (dot per user)
  const presenceRef = db.ref("presence");
  presenceRef.on("value", snapshot => {
    const presence = snapshot.val();
    document.querySelectorAll(".message").forEach(msgEl => {
      const uid = msgEl.dataset.uid;
      if (presence && uid && presence[uid]) {
        const dot = msgEl.querySelector(".status-dot");
        if (dot) {
          dot.style.backgroundColor = presence[uid].state === "online" ? "green" : "gray";
        }
      }
    });
  });
</script>
