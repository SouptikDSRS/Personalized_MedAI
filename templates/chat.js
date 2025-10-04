import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase configuration - USE YOUR ACTUAL PROJECT DETAILS
const firebaseConfig = {
    apiKey: "AIzaSyDAu-9P8Lo3giJ9hFBiDR6T5eM0NuUnJoQ", // Replace with your key
    authDomain: "ai-health-web.firebaseapp.com",
    projectId: "ai-health-web",
    storageBucket: "ai-health-web.appspot.com",
    messagingSenderId: "504572356636",
    appId: "1:504572356636:web:2002a4ebab9474177ad7d9",
    measurementId: "G-MZ4Z3ZDJ9R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// UI Elements
const chatBox = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');
const chatForm = document.getElementById('chatForm');
const sendButton = document.getElementById('sendButton');
const chatMessageDiv = document.getElementById('chatMessage');
const sessionList = document.getElementById("sessionList");
const newChatButton = document.getElementById("newChatButton");

let currentUserUID = null;
let currentSessionId = null;
let unsubscribeFromChats = null;

// Function to format AI response
function formatAIResponse(rawText) {
    const container = document.createElement("div");
    container.className = "formatted-ai-response bg-gray-100 p-4 rounded-lg shadow-md space-y-4 text-sm text-gray-800";

    // Basic formatting: split by numbered list items (1. 2. etc)
    const lines = rawText.split(/(\d\.\s)/).filter(Boolean);
    let listContent = false;

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        // Check if the line starts a numbered list item
        if (trimmedLine.match(/^\d\.\s/)) {
            // If starting a list item, make sure we have a <ul>
            if (!listContent) {
                listContent = document.createElement("ul");
                listContent.className = "list-disc list-inside space-y-2";
                container.appendChild(listContent);
            }
            const li = document.createElement("li");
            // Remove the number prefix for display in the <li>
            const liText = trimmedLine.replace(/^\d\.\s/, '');
            li.innerHTML = liText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Basic bolding
            listContent.appendChild(li);
        } else {
            // Handle introductory paragraph(s) or non-list content
            const p = document.createElement("p");
            p.innerHTML = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Basic bolding
            container.appendChild(p);
            // Reset list flag if a paragraph interrupts a list, although the splitting logic aims to avoid this
            listContent = false; 
        }
    });

    // Add the hardcoded note (as per original logic)
    const note = document.createElement("blockquote");
    note.className = "italic text-gray-600 border-l-4 border-blue-400 pl-3 mt-4";
    note.innerText = "Understanding the brain aids in better treatment and mental health.";
    container.appendChild(note);

    return container;
}

// Function to display messages
function appendMessage(sender, text, timestamp) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message-bubble', sender);

    if (sender === 'ai') {
        // For AI messages, use the formatter
        const formattedContent = formatAIResponse(text);
        messageElement.appendChild(formattedContent);
    } else {
        // For user messages, just append as a paragraph
        const textNode = document.createElement('p');
        textNode.innerHTML = text;
        messageElement.appendChild(textNode);
    }

    const timestampElement = document.createElement('span');
    timestampElement.classList.add('timestamp');
    timestampElement.textContent = timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageElement.appendChild(timestampElement);

    chatBox.appendChild(messageElement);
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// Function to display info/error messages
function displayInfoMessage(type, message, showSpinner = false) {
    chatMessageDiv.classList.remove('hidden', 'info-message', 'error-message');
    chatMessageDiv.innerHTML = '';

    if (showSpinner) {
        const spinner = document.createElement('div');
        spinner.className = 'ai-loading-spinner';
        chatMessageDiv.appendChild(spinner);
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    chatMessageDiv.appendChild(textSpan);
    chatMessageDiv.classList.add(type === 'error' ? 'error-message' : 'info-message');
    chatMessageDiv.classList.remove('hidden');
}

async function saveMessage(userId, role, content) {
    if (!currentSessionId) {
        // Create a new chat session if one doesn't exist
        const sessionRef = await addDoc(collection(db, "users", userId, "chatSessions"), {
            createdAt: new Date().toISOString()
        });
        currentSessionId = sessionRef.id;
        // Reload sessions to show the new one and activate it
        await loadChatSessions(userId, currentSessionId);
    }

    // Save the message under the current session
    await addDoc(collection(db, "users", userId, "chatSessions", currentSessionId, "messages"), {
        role: role,
        content: content,
        timestamp: new Date().toISOString()
    });
}

function loadChatHistory(userId, sessionId) {
    if (unsubscribeFromChats) {
        unsubscribeFromChats(); // Unsubscribe from previous session listener
    }

    currentSessionId = sessionId;
    chatBox.innerHTML = ''; // Clear chat box
    
    // Update sidebar styling to show active session
    document.querySelectorAll('.session-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.sessionId === sessionId) {
            item.classList.add('active');
        }
    });

    const q = query(
        collection(db, "users", userId, "chatSessions", sessionId, "messages"),
        orderBy("timestamp", "asc")
    );

    // Set up real-time listener for the new session
    unsubscribeFromChats = onSnapshot(q, (snapshot) => {
        // Clear chatbox only for the *first* load to ensure welcome message is gone
        if (chatBox.children.length === 1 && chatBox.children[0].classList.contains('ai')) {
             chatBox.innerHTML = '';
        }
        
        // Use docChanges for more efficient real-time updates (only new messages)
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const msg = change.doc.data();
                const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                appendMessage(msg.role, msg.content, time);
            }
        });
        // Scroll to bottom after all updates
        chatBox.scrollTop = chatBox.scrollHeight;
    }, (error) => {
        console.error("Error loading chat history:", error);
        displayInfoMessage('error', 'Failed to load chat history.');
    });
}

async function loadChatSessions(userId, activeSessionId = null) {
    sessionList.innerHTML = ''; // Clear existing sessions

    const q = query(collection(db, "users", userId, "chatSessions"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const sessions = snapshot.docs;

    if (sessions.length > 0 && !activeSessionId) {
        // Automatically load the latest session if starting fresh
        activeSessionId = sessions[0].id;
    }
    
    sessions.forEach((doc) => {
        const li = document.createElement('li');
        const sessionDate = new Date(doc.data().createdAt);
        li.textContent = `Chat on ${sessionDate.toLocaleDateString()} at ${sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        li.classList.add("session-item");
        li.dataset.sessionId = doc.id;
        li.onclick = () => loadChatHistory(userId, doc.id);
        sessionList.appendChild(li);
    });
    
    if (activeSessionId) {
        loadChatHistory(userId, activeSessionId);
    } else {
        // If no sessions exist, ensure the initial welcome message is shown
        chatBox.innerHTML = '';
        appendMessage('ai', 'Hello! How can I assist you with your health today?', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
}

// Function to start a new chat session
function startNewChat() {
    if (unsubscribeFromChats) {
        unsubscribeFromChats(); // Unsubscribe from current session listener
    }
    currentSessionId = null; // Reset current session ID
    chatBox.innerHTML = ''; // Clear chat history
    // Show welcome message for the new chat
    appendMessage('ai', 'Hello! How can I assist you with your health today?', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    chatInput.value = ''; // Clear input field
    chatInput.focus(); // Focus on input field
    displayInfoMessage('hidden', ''); // Hide any previous messages
    // Remove active class from all session items
    document.querySelectorAll('.session-item').forEach(item => {
        item.classList.remove('active');
    });
}

async function getAIResponseFromBackend(userQuestion) {
    // NOTE: This URL depends on your backend server running on localhost:5000
    try {
        const response = await fetch("http://localhost:5000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userQuestion })
        });
        const data = await response.json();
        if (data.response) {
            return data.response;
        } else {
            throw new Error(data.error || "AI returned no answer.");
        }
    } catch (error) {
        console.error("AI fetch error:", error);
        throw error;
    }
}

async function handleChatSubmit(event) {
    event.preventDefault();
    const userQuestion = chatInput.value.trim();

    if (!userQuestion || !currentUserUID) {
        displayInfoMessage('error', 'Please type your question or log in.');
        chatInput.focus();
        return;
    }

    appendMessage('user', userQuestion);
    chatInput.value = '';

    displayInfoMessage('info', 'AI is thinking...', true);
    sendButton.disabled = true;
    sendButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    chatInput.disabled = true;

    try {
        const aiResponse = await getAIResponseFromBackend(userQuestion);
        
        // Save user message first
        await saveMessage(currentUserUID, 'user', userQuestion);

        // Save AI response next. This will trigger the real-time listener to append the message.
        await saveMessage(currentUserUID, 'ai', aiResponse);

    } catch (error) {
        console.error("Error during chat interaction:", error);
        displayInfoMessage('error', 'Failed to get AI response. Please try again.');
        // If an error occurs, save the user message but not the AI response
        await saveMessage(currentUserUID, 'user', userQuestion); 
    } finally {
        displayInfoMessage('hidden', '');
        sendButton.disabled = false;
        sendButton.innerHTML = `<i class="fas fa-paper-plane"></i> Send`;
        chatInput.disabled = false;
        chatInput.focus();
    }
}

// Global scope access needed for the HTML 'onsubmit' attribute
window.handleChatSubmit = handleChatSubmit;

// Event listener for the new chat button
newChatButton.addEventListener('click', startNewChat);

// Handle user authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUID = user.uid;
        console.log("User logged in:", currentUserUID);
        // Set initial timestamp for the welcome message
        const welcomeTimeElement = document.querySelector('.message-bubble.ai .timestamp .current-time');
        if (welcomeTimeElement) {
            welcomeTimeElement.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        loadChatSessions(currentUserUID); // Load existing sessions
        chatInput.focus();
    } else {
        alert("You must be logged in.");
        // Redirect to sign-up/login page
        // window.location.href = "/sign_up"; 
        console.warn("User not logged in. Redirecting is disabled in this example.");
    }
});

// Esc key to focus input
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        chatInput.focus();
    }
});