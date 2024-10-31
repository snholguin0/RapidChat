// frontend/chat.js

const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages-container');

// Function to send a message
sendButton.addEventListener('click', () => {
    const message = messageInput.value;
    if (message) {
        // Create a new message element
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.textContent = message;

        // Append the message to the container
        messagesContainer.appendChild(messageElement);

        // Clear the input
        messageInput.value = '';

        // Optionally, scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});
