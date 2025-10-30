// admin.js - Admin Panel Logic

// Your web app's Firebase configuration (use the same as app.js)
const firebaseConfig = {
    apiKey: "AIzaSyAy-7QGZ05wNf0fLG1-AY2FxJy_fdILdoM", // Replace with your actual API Key
    authDomain: "quizifyapp-4c5ca.firebaseapp.com",
    projectId: "quizifyapp-4c5ca",
    storageBucket: "quizifyapp-4c5ca.firebasestorage.app",
    messagingSenderId: "948606346917",
    appId: "1:948606346917:web:6fdfa4e16adefb5f710f4c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// const auth = firebase.auth(); // We will no longer use Firebase Auth for the admin panel
const db = firebase.firestore();
const storage = firebase.storage();

const videosCollection = db.collection("videos");
const videoStorageRef = storage.ref("videos"); // Folder for video files
const thumbnailStorageRef = storage.ref("thumbnails"); // Folder for thumbnail files

// UI Elements
const authSection = document.getElementById('auth-section');
const uploadSection = document.getElementById('upload-section');
const videoListSection = document.getElementById('video-list-section');

// const adminEmailInput = document.getElementById('admin-email'); // Removed
const adminPasswordInput = document.getElementById('admin-password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');

const videoUploadForm = document.getElementById('video-upload-form');
const videoTitleInput = document.getElementById('video-title');
const videoDescriptionInput = document.getElementById('video-description');
const videoCategoryInput = document.getElementById('video-category'); // NEW
const videoTopicInput = document.getElementById('video-topic'); // NEW
const videoUrlInput = document.getElementById('video-url'); // Changed from videoFileInput
const thumbnailUrlInput = document.getElementById('thumbnail-url'); // Changed from thumbnailFileInput
const uploadBtn = document.getElementById('upload-btn');
const uploadProgressContainer = document.getElementById('upload-progress-container');
const uploadPercentage = document.getElementById('upload-percentage');
const uploadProgressBar = document.getElementById('upload-progress');
const uploadStatus = document.getElementById('upload-status');
const videoListDiv = document.getElementById('video-list');

// NEW: Edit Modal UI Elements
const editModal = document.getElementById('edit-video-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const videoEditForm = document.getElementById('video-edit-form');
const editVideoIdInput = document.getElementById('edit-video-id');
const editVideoTitleInput = document.getElementById('edit-video-title');
const editVideoDescriptionInput = document.getElementById('edit-video-description');

// NEW: Delete Confirmation Modal UI Elements
const deleteConfirmModal = document.getElementById('delete-video-confirm-modal');
const cancelDeleteBtn = document.getElementById('cancel-video-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-video-delete-btn');

// --- Simplified Authentication Logic ---

// IMPORTANT: This is your simple admin password. Change it to something you'll remember.
const ADMIN_PASSWORD = "rajmishra"; // You can change this password

document.addEventListener('DOMContentLoaded', () => {
    // Check if admin is already logged in for this session
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        showAdminPanel();
    } else {
        showLoginPanel();
    }
    initializeEditModalListeners(); // NEW: Initialize listeners for the edit modal
});

function showAdminPanel() {
    authSection.style.display = 'none';
    uploadSection.style.display = 'block';
    videoListSection.style.display = 'block';
    loadVideos();
}

function showLoginPanel() {
    authSection.style.display = 'block';
    uploadSection.style.display = 'none';
    videoListSection.style.display = 'none';
    authError.textContent = '';
}

// --- Authentication Logic ---

loginBtn.addEventListener('click', async () => {
    const password = adminPasswordInput.value;

    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('isAdminLoggedIn', 'true');
        showAdminPanel();
    } else {
        showAuthError("Incorrect password.");
    }
});

logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('isAdminLoggedIn');
    showLoginPanel();
});

function showAuthError(message) {
    authError.textContent = message;
}

// --- Video Upload Logic ---

videoUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = videoTitleInput.value;
    const description = videoDescriptionInput.value;
    const category = videoCategoryInput.value; // NEW
    const topic = videoTopicInput.value.trim(); // NEW
    const videoUrl = videoUrlInput.value.trim();
    const thumbnailUrlValue = thumbnailUrlInput.value.trim(); // Changed from thumbnailFile

    // NEW: Updated validation
    if (!videoUrl || !title || !category || !topic) {
        showUploadStatus("Please fill out all required fields: Title, Category, Topic, and Video URL.", 'error');
        return;
    }

    uploadBtn.disabled = true;
    uploadStatus.textContent = '';
    uploadProgressContainer.style.display = 'none'; // No progress bar needed for URL

    try {
        let thumbnailUrl = 'https://via.placeholder.com/400x225.png?text=Video'; // Default placeholder

        // 1. Use provided thumbnail URL or keep the default
        if (thumbnailUrlValue) {
            thumbnailUrl = thumbnailUrlValue;
        }

        // 2. Save Video Metadata to Firestore
        const videoDocRef = await videosCollection.add({
            title: title,
            description: description,
            category: category, // NEW
            topic: topic, // NEW
            videoUrl: videoUrl, // Save the provided URL directly
            thumbnailUrl: thumbnailUrl,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        showUploadStatus("Video added successfully!", 'success');
        videoUploadForm.reset();
        uploadBtn.disabled = false;
        loadVideos(); // Refresh video list

    } catch (error) {
        console.error("Error during video upload or metadata save:", error);
        showUploadStatus(`An unexpected error occurred: ${error.message}`, 'error');
        uploadBtn.disabled = false;
        uploadProgressContainer.style.display = 'none';
    }
});

function showUploadStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = `status-message ${type}`;
}

/**
 * NEW: Initializes event listeners for the edit modal.
 */
function initializeEditModalListeners() {
    if (editModal) {
        closeEditModalBtn.addEventListener('click', () => editModal.classList.remove('visible'));
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) editModal.classList.remove('visible');
        });

        videoEditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveVideoChanges();
        });
    }
}

/**
 * NEW: Opens the edit modal and populates it with the video's current data.
 * @param {string} videoId - The Firestore document ID of the video.
 * @param {string} title - The current title of the video.
 * @param {string} description - The current description of the video.
 */
function openEditModal(videoId, title, description) {
    editVideoIdInput.value = videoId;
    editVideoTitleInput.value = title;
    editVideoDescriptionInput.value = description;
    editModal.classList.add('visible');
}

/**
 * NEW: Saves the updated video details to Firestore.
 */
async function saveVideoChanges() {
    const videoId = editVideoIdInput.value;
    const newTitle = editVideoTitleInput.value;
    const newDescription = editVideoDescriptionInput.value;

    try {
        await videosCollection.doc(videoId).update({
            title: newTitle,
            description: newDescription
        });
        showUploadStatus("Video details updated successfully!", 'success');
        editModal.classList.remove('visible');
        loadVideos(); // Refresh the list to show changes
    } catch (error) {
        console.error("Error updating video details:", error);
        showUploadStatus(`Failed to update details: ${error.message}`, 'error');
    }
}

// --- Video List Logic (for Admin to view/manage) ---

async function loadVideos() {
    videoListDiv.innerHTML = '<p>Loading videos...</p>';
    try {
        const snapshot = await videosCollection.orderBy("timestamp", "desc").get();
        if (snapshot.empty) {
            videoListDiv.innerHTML = '<p>No videos uploaded yet.</p>';
            return;
        }

        videoListDiv.innerHTML = '';
        snapshot.forEach(doc => {
            const video = doc.data();
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            videoItem.innerHTML = `
                <img src="${video.thumbnailUrl}" alt="${video.title}">
                <div class="video-item-info">
                    <h3>${video.title}</h3>
                    <p>${video.description || 'No description'}</p>
                    <div class="video-item-actions">
                        <button class="edit-btn" onclick="openEditModal('${doc.id}', '${video.title.replace(/'/g, "\\'")}', '${(video.description || '').replace(/'/g, "\\'")}')">Edit</button>
                        <button class="btn--danger" onclick="deleteVideo('${doc.id}', '${video.videoUrl}', '${video.thumbnailUrl}')">Delete</button>
                    </div>
                </div>
            `;
            videoListDiv.appendChild(videoItem);
        });
    } catch (error) {
        console.error("Error loading videos:", error);
        videoListDiv.innerHTML = '<p class="error-message">Failed to load videos.</p>';
    }
}

async function deleteVideo(videoId, videoUrl, thumbnailUrl) {
    // Show the custom confirmation modal
    deleteConfirmModal.classList.add('visible');

    // Create a new promise that resolves when the user clicks a button
    const confirmationPromise = new Promise((resolve) => {
        cancelDeleteBtn.onclick = () => resolve(false);
        confirmDeleteBtn.onclick = () => resolve(true);
    });

    const confirmed = await confirmationPromise;
    deleteConfirmModal.classList.remove('visible'); // Hide modal after choice

    if (confirmed) {
        try {
            // 1. Delete from Firestore
            await videosCollection.doc(videoId).delete();

            // 2. Delete video file from Storage (only if it's a Firebase Storage URL)
            if (thumbnailUrl && thumbnailUrl.includes('firebasestorage.googleapis.com')) {
                const thumbnailRef = storage.refFromURL(thumbnailUrl);
                await thumbnailRef.delete();
            }

            showUploadStatus("Video deleted successfully!", 'success');
            loadVideos(); // Refresh list
        } catch (error) {
            console.error("Error deleting video:", error);
            showUploadStatus(`Failed to delete video: ${error.message}`, 'error');
        }
    }
}
