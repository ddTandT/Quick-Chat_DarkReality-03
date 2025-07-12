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

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  const storage = firebase.storage();
  const auth = firebase.auth();

  let userName = "";
  let userUID = "";

  // Typing indicator refs
  const typingRef = db.ref("typing");
  let typingTimeout;

  // Anonymous sign-in
  auth.signInAnonymously().catch(console.error);

  auth.onAuthStateChanged(user => {
    if (user) {
      userUID = user.uid;

      // Presence tracking
      const userStatusRef = db.ref("/presence/" + userUID);
      const connectedRef = db.ref(".info/connected");

      connectedRef.on("value", (snap) => {
        if (snap.val() === false) return;

        userStatusRef.onDisconnect().set({
          state: "offline",
          last_changed: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
          userStatusRef.set({
            state: "online",
            last_changed: firebase.database.ServerValue.TIMESTAMP
          });
        });
      });

      // Update presence on window unload (close/refresh)
      window.addEventListener("beforeunload", () => {
        userStatusRef.set({
          state: "offline",
          last_changed: Date.now()
        });
      });

      // Update presence on browser online/offline events
      window.addEventListener("online", () => {
        userStatusRef.set({
          state: "online",
          last_changed: firebase.database.ServerValue.TIMESTAMP
        });
      });
      window.addEventListener("offline", () => {
        userStatusRef.set({
          state: "offline",
          last_changed: Date.now()
        });
      });

      // Remove typing status on disconnect
      typingRef.child(userUID).onDisconnect().remove();

      setupTypingListeners();
    }
  });

  // Get or set user name
  function getUserName() {
    if (!userName) {
      const inputName = document.getElementById("name").value.trim();
      userName = inputName || "Guest_" + Math.floor(Math.random() * 10000);
      document.getElementById("name").value = userName;
    }
    return userName;
  }

  // Send message
  function sendMessage() {
    const name = getUserName();
    const text = document.getElementById("text").value.trim();
    if (!text) return;

    const timestamp = new Date().toISOString();
    db.ref("messages").push({ name, text, timestamp, uid: userUID });
    document.getElementById("text").value = "";

    removeTypingStatus();
  }

  document.getElementById("sendBtn").addEventListener("click", sendMessage);
  document.getElementById("text").addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendMessage();
  });

  // Display messages with presence dot and last seen tooltip
  const messagesContainer = document.getElementById("messages");
  const presenceRef = db.ref("presence");

  // Listen for new messages
  db.ref("messages").on("child_added", snapshot => {
    const msg = snapshot.val();
    const key = snapshot.key;
    const currentUser = getUserName();

    const wrapper = document.createElement("div");
    wrapper.className = "message " + (msg.name === currentUser ? "you" : "other");
    wrapper.dataset.uid = msg.uid || "";

    const messageText = document.createElement("div");
    if (msg.text.includes("https://") && msg.text.match(/\.(jpg|jpeg|png|gif)$/i)) {
      messageText.innerHTML = `<img src="${msg.text}" style="max-width: 100%;">`;
    } else {
      messageText.innerHTML = `<strong>${msg.name}</strong>: ${msg.text}`;
    }
    wrapper.appendChild(messageText);

    // Status dot + last seen tooltip span
    const statusDot = document.createElement("span");
    statusDot.className = "status-dot";
    statusDot.style.display = "inline-block";
    statusDot.style.width = "10px";
    statusDot.style.height = "10px";
    statusDot.style.borderRadius = "50%";
    statusDot.style.marginLeft = "8px";
    statusDot.style.verticalAlign = "middle";
    statusDot.style.backgroundColor = "gray"; // default offline
    statusDot.title = "Offline"; // default tooltip
    wrapper.appendChild(statusDot);

    // Edit/delete for own messages
    if (msg.uid === userUID) {
      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.onclick = () => {
        const newText = prompt("Edit your message:", msg.text);
        if (newText) db.ref("messages").child(key).update({ text: newText });
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "❌";
      deleteBtn.onclick = () => db.ref("messages").child(key).remove();

      wrapper.appendChild(editBtn);
      wrapper.appendChild(deleteBtn);
    }

    messagesContainer.appendChild(wrapper);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });

  // Update presence dots and tooltips dynamically
  presenceRef.on("value", snapshot => {
    const presence = snapshot.val() || {};
    document.querySelectorAll(".message").forEach(msgEl => {
      const uid = msgEl.dataset.uid;
      if (uid && presence[uid]) {
        const dot = msgEl.querySelector(".status-dot");
        if (dot) {
          if (presence[uid].state === "online") {
            dot.style.backgroundColor = "green";
            dot.title = "Online";
          } else {
            dot.style.backgroundColor = "gray";
            const lastSeen = presence[uid].last_changed;
            let lastSeenText = "Last seen: unknown";
            if (lastSeen) {
              const time = new Date(lastSeen);
              lastSeenText = "Last seen: " + time.toLocaleString();
            }
            dot.title = lastSeenText;
          }
        }
      }
    });
  });

  // File upload handler
  document.getElementById("fileInput").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    const name = getUserName();
    const ref = storage.ref('uploads/' + Date.now() + "_" + file.name);
    ref.put(file).then(snapshot => {
      snapshot.ref.getDownloadURL().then(url => {
        db.ref("messages").push({ name, text: url, timestamp: new Date().toISOString(), uid: userUID });
      });
    });
  });

  // Dark mode toggle
  function toggleDarkMode() {
    document.body.classList.toggle("dark");
    const icon = document.querySelector(".toggle-mode");
    icon.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  }

  // Typing indicator logic
  const typingIndicator = document.getElementById("typingIndicator");

  function setupTypingListeners() {
    const input = document.getElementById("text");

    input.addEventListener("input", () => {
      typingRef.child(userUID).set(getUserName());
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(removeTypingStatus, 2000);
    });

    // Listen for others typing
    typingRef.on("value", snapshot => {
      const typingUsers = snapshot.val() || {};
      const otherTypingUsers = Object.keys(typingUsers).filter(uid => uid !== userUID);
      if (otherTypingUsers.length === 0) {
        typingIndicator.textContent = "";
      } else if (otherTypingUsers.length === 1) {
        const otherName = typingUsers[otherTypingUsers[0]];
        typingIndicator.textContent = `${otherName} is typing...`;
      } else {
        typingIndicator.textContent = "Multiple people are typing...";
      }
    });
  }

  function removeTypingStatus() {
    typingRef.child(userUID).remove();
  }
</script>
