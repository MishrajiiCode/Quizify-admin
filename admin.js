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
const filtersSection = document.getElementById('filters-section');
const folderSection = document.getElementById('folder-section');

// Folder Management Elements
const categoryDropdown = document.getElementById('video-category-dropdown');
const topicDropdown = document.getElementById('video-topic-dropdown');
const folderDropdown = document.getElementById('video-folder-dropdown');
const createFolderBtn = document.getElementById('create-folder-btn');
const foldersList = document.getElementById('folders-list');
const folderModal = document.getElementById('folder-modal');
const folderForm = document.getElementById('folder-form');
const folderNameInput = document.getElementById('folder-name');

// Initialize collections
const foldersCollection = db.collection("videoFolders");

// const adminEmailInput = document.getElementById('admin-email'); // Removed
const adminPasswordInput = document.getElementById('admin-password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');

const videoUploadForm = document.getElementById('video-upload-form');
const videoTitleInput = document.getElementById('video-title');
const videoDescriptionInput = document.getElementById('video-description');
const videoUrlInput = document.getElementById('video-url'); // Changed from videoFileInput
const thumbnailFileInput = document.getElementById('thumbnail-file');
const uploadBtn = document.getElementById('upload-btn');
const uploadProgressContainer = document.getElementById('upload-progress-container');
const uploadPercentage = document.getElementById('upload-percentage');
const uploadProgressBar = document.getElementById('upload-progress');
const uploadStatus = document.getElementById('upload-status');
const videoListDiv = document.getElementById('video-list');
const mainAdminNav = document.getElementById('main-admin-nav'); // NEW: Main nav bar

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
    mainAdminNav.style.display = 'flex'; // NEW: Show the nav bar
    uploadSection.style.display = 'block';
    filtersSection.style.display = 'block';
    folderSection.style.display = 'block';
    videoListSection.style.display = 'block';
    initializeFolderManagement();
    loadVideos();
}

// Topic mapping for each category
const topicsByCategory = {
    english: ['Noun', 'Verb', 'Adjective', 'Adverb', 'Preposition'],
    reasoning: ['Logical', 'Verbal', 'Non-verbal', 'Data Interpretation'],
    quantitative: ['Arithmetic', 'Algebra', 'Geometry', 'Data Analysis']
};

function initializeFolderManagement() {
    // Category change handler
    categoryDropdown.addEventListener('change', () => {
        const category = categoryDropdown.value;
        populateTopics(category);
        loadFolders();
    });

    // Topic change handler
    topicDropdown.addEventListener('change', () => {
        loadFolders();
    });

    // Folder dropdown change handler
    folderDropdown.addEventListener('change', () => {
        loadVideos();
    });

    // Create folder button handler
    createFolderBtn.addEventListener('click', () => {
        if (!categoryDropdown.value || !topicDropdown.value) {
            showUploadStatus('Please select a category and topic first', 'error');
            return;
        }
        folderModal.classList.add('visible');
    });

    // Folder form submission handler
    folderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createFolder();
    });

    // Close folder modal handler
    document.querySelector('#folder-modal .modal-close-btn').addEventListener('click', () => {
        folderModal.classList.remove('visible');
    });
}

function populateTopics(category) {
    const topics = topicsByCategory[category] || [];
    topicDropdown.innerHTML = '<option value="">Select Topic</option>' +
        topics.map(topic => `<option value="${topic.toLowerCase()}">${topic}</option>`).join('');
}

async function loadFolders() {
    const category = categoryDropdown.value;
    const topic = topicDropdown.value;

    if (!category || !topic) {
        foldersList.innerHTML = '<p>Select a category and topic to view folders</p>';
        folderDropdown.innerHTML = '<option value="">All Videos</option>';
        return;
    }

    try {
        const snapshot = await foldersCollection
            .where('category', '==', category)
            .where('topic', '==', topic)
            .orderBy('createdAt', 'desc')
            .get();

        // Update folders grid
        foldersList.innerHTML = '';
        folderDropdown.innerHTML = '<option value="">All Videos</option>';

        if (snapshot.empty) {
            foldersList.innerHTML = '<p>No folders created yet</p>';
            return;
        }

        snapshot.forEach(doc => {
            const folder = doc.data();
            const folderCard = createFolderCard(doc.id, folder);
            foldersList.appendChild(folderCard);

            // Add to dropdown
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = folder.name;
            folderDropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading folders:', error);
        showUploadStatus('Failed to load folders', 'error');
    }
}

function createFolderCard(folderId, folder) {
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.innerHTML = `
        <div class="folder-name">${folder.name}</div>
        <div class="folder-info">Videos: ${folder.videos ? folder.videos.length : 0}</div>
        <div class="video-item-actions">
            <button class="edit-btn" onclick="renameFolder('${folderId}', '${folder.name}')">Rename</button>
            <button class="btn--danger" onclick="deleteFolder('${folderId}')">Delete</button>
        </div>
    `;
    return card;
}

async function createFolder() {
    const name = folderNameInput.value.trim();
    const category = categoryDropdown.value;
    const topic = topicDropdown.value;

    if (!name || !category || !topic) {
        showUploadStatus('Please fill in all fields', 'error');
        return;
    }

    try {
        await foldersCollection.add({
            name,
            category,
            topic,
            videos: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        folderModal.classList.remove('visible');
        folderForm.reset();
        showUploadStatus('Folder created successfully!', 'success');
        loadFolders();
    } catch (error) {
        console.error('Error creating folder:', error);
        showUploadStatus('Failed to create folder', 'error');
    }
}

async function renameFolder(folderId, currentName) {
    const newName = prompt('Enter new folder name:', currentName);
    if (!newName || newName === currentName) return;

    try {
        await foldersCollection.doc(folderId).update({ name: newName });
        showUploadStatus('Folder renamed successfully!', 'success');
        loadFolders();
    } catch (error) {
        console.error('Error renaming folder:', error);
        showUploadStatus('Failed to rename folder', 'error');
    }
}

async function deleteFolder(folderId) {
    if (!confirm('Are you sure you want to delete this folder? The videos will not be deleted.')) return;

    try {
        await foldersCollection.doc(folderId).delete();
        showUploadStatus('Folder deleted successfully!', 'success');
        loadFolders();
    } catch (error) {
        console.error('Error deleting folder:', error);
        showUploadStatus('Failed to delete folder', 'error');
    }
}

function showLoginPanel() {
    authSection.style.display = 'block';
    mainAdminNav.style.display = 'none'; // NEW: Hide the nav bar
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
    const videoUrl = videoUrlInput.value.trim();
    const thumbnailFile = thumbnailFileInput.files[0];

    if (!videoUrl || !title) {
        showUploadStatus("Please provide a video URL and a title.", 'error');
        return;
    }

    uploadBtn.disabled = true;
    uploadStatus.textContent = '';
    uploadProgressContainer.style.display = 'none'; // No progress bar needed for URL

    try {
        let thumbnailUrl = 'https://via.placeholder.com/400x225.png?text=Video'; // Default placeholder

        // 1. Upload Thumbnail (if provided)
        if (thumbnailFile) {
            if (thumbnailFile.size > 1000000) { // Check if file is larger than ~1MB
                showUploadStatus("Thumbnail is too large (max 1MB).", 'error');
                uploadBtn.disabled = false;
                return;
            }
            showUploadStatus("Processing thumbnail...", 'info');
            // Convert the image file to a Base64 string
            thumbnailUrl = await toBase64(thumbnailFile);
        }

        // 2. Save Video Metadata to Firestore
        const videoDocRef = await videosCollection.add({
            title: title,
            description: description,
            videoUrl: videoUrl, // Save the provided URL directly
            thumbnailUrl: thumbnailUrl,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. NEW: If a folder is selected, update the folder document
        const selectedFolderId = folderDropdown.value;
        if (selectedFolderId) {
            const folderRef = foldersCollection.doc(selectedFolderId);
            await folderRef.update({
                videos: firebase.firestore.FieldValue.arrayUnion(videoDocRef.id)
            });
            showUploadStatus("Video added to folder successfully!", 'success');
        } else {
            showUploadStatus("Video added successfully!", 'success');
        }

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

/**
 * NEW: Converts a file to a Base64 string.
 * @param {File} file - The file to convert.
 * @returns {Promise<string>} A promise that resolves with the Base64 string.
 */
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

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