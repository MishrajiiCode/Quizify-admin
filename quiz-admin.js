// quiz-admin.js - Quiz Content Management Logic

const firebaseConfig = {
    apiKey: "AIzaSyAy-7QGZ05wNf0fLG1-AY2FxJy_fdILdoM",
    authDomain: "quizifyapp-4c5ca.firebaseapp.com",
    projectId: "quizifyapp-4c5ca",
    storageBucket: "quizifyapp-4c5ca.firebasestorage.app",
    messagingSenderId: "948606346917",
    appId: "1:948606346917:web:6fdfa4e16adefb5f710f4c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const quizzesCollection = db.collection("quizzes");

const QuizAdmin = {
    // State
    currentSubjectId: null,
    currentChapterIndex: -1,
    allSubjects: [],

    // UI Elements
    authSection: document.getElementById('auth-section'),
    adminPanel: document.getElementById('admin-panel'),
    loginForm: document.getElementById('login-form'),
    passwordInput: document.getElementById('admin-password'),
    loginBtn: document.getElementById('login-btn'), // This was correct, the issue was in the handleLogin function.
    logoutBtn: document.getElementById('logout-btn'),
    authError: document.getElementById('auth-error'),
    categorySelect: document.getElementById('category-select'),
    subjectSelect: document.getElementById('subject-select'),
    chapterSelect: document.getElementById('chapter-select'),
    setSelect: document.getElementById('set-select'),
    setsContainer: document.getElementById('sets-container'),
    editorHeading: document.getElementById('editor-heading'),
    statusMessage: document.getElementById('admin-status'),

    // Modal Elements
    questionModal: document.getElementById('question-modal'),
    questionModalTitle: document.getElementById('question-modal-title'),
    questionForm: document.getElementById('question-form'),
    questionIdInput: document.getElementById('question-id'),
    questionSetIndexInput: document.getElementById('question-set-index-input'),
    questionTextInput: document.getElementById('question-text-input'),
    optionInputs: [
        document.getElementById('option-0-input'),
        document.getElementById('option-1-input'),
        document.getElementById('option-2-input'),
        document.getElementById('option-3-input'),
    ],
    correctAnswerSelect: document.getElementById('correct-answer-select'),
    saveQuestionBtn: document.getElementById('save-question-btn'),
    closeQuestionModalBtn: document.getElementById('close-question-modal-btn'),
    questionList: document.getElementById('question-list'),
    addQuestionBtn: document.getElementById('add-question-btn'),
    addSetBtn: document.getElementById('add-set-btn'),
    deleteSetBtn: document.getElementById('delete-set-btn'),
    setActions: document.getElementById('set-actions'),

    ADMIN_PASSWORD: "rajmishra", // Change this password

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
                this.showAdminPanel();
            } else {
                this.showLoginPanel();
            }
            this.bindEventListeners();
        });
    },

    bindEventListeners() {
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.categorySelect.addEventListener('change', () => this.loadSubjects());
        this.subjectSelect.addEventListener('change', () => this.handleSubjectChange());
        this.chapterSelect.addEventListener('change', () => this.handleChapterChange());
        this.setSelect.addEventListener('change', () => this.loadQuestions());
        this.addQuestionBtn.addEventListener('click', () => this.openQuestionModal());
        this.addSetBtn.addEventListener('click', () => this.addSet());
        this.deleteSetBtn.addEventListener('click', () => this.deleteSet());

        // Modal listeners
        this.closeQuestionModalBtn.addEventListener('click', () => this.closeQuestionModal());
        this.questionModal.addEventListener('click', (e) => {
            if (e.target === this.questionModal) this.closeQuestionModal();
        });
        this.questionForm.addEventListener('submit', async (e) => await this.handleSaveQuestion(e));
    },

    handleLogin() { // This function doesn't need to be async
        if (this.passwordInput.value === this.ADMIN_PASSWORD) {
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            this.showAdminPanel();
        } else {
            this.authError.textContent = "Incorrect password.";
        }
    },

    handleLogout() {
        sessionStorage.removeItem('isAdminLoggedIn');
        this.showLoginPanel();
    },

    async showAdminPanel() { // Made async because it calls an async function
        this.authSection.style.display = 'none';
        this.adminPanel.style.display = 'block';
        document.getElementById('main-admin-nav').style.display = 'flex';
        this.loadSubjects();
    },

    showLoginPanel() {
        this.authSection.style.display = 'block';
        this.adminPanel.style.display = 'none';
        this.passwordInput.value = '';
        document.getElementById('main-admin-nav').style.display = 'none';
    },

    async loadSubjects() {
        this.showStatus('Loading subjects...', 'info');
        const category = this.categorySelect.value;

        try {
            const snapshot = await quizzesCollection.where('category', '==', category).get();
            this.allSubjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            this.subjectSelect.innerHTML = '<option value="">-- Select a Subject --</option>';
            this.allSubjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.id;
                // FIX: Create a more descriptive name for academic subjects
                if (subject.category === 'academic' && subject.class) {
                    option.textContent = `Class ${subject.class} - ${subject.subjectName}`;
                } else {
                    option.textContent = subject.subjectName;
                }
                this.subjectSelect.appendChild(option);
            }); // FIX: The forEach loop was not closed correctly.

            this.chapterSelect.innerHTML = '';
            this.setSelect.innerHTML = '';
            this.questionList.innerHTML = '';
            this.editorHeading.textContent = 'Please select a subject and chapter to begin.';
            this.setActions.style.display = 'none';
        } catch (error) {
            this.showStatus('Failed to load subjects.', 'error');
            console.error("Error loading subjects:", error);
        }
    },

    handleSubjectChange() {
        this.currentSubjectId = this.subjectSelect.value;
        this.questionList.innerHTML = '';
        this.setSelect.innerHTML = '';
        this.setActions.style.display = 'none';
        this.editorHeading.textContent = 'Please select a chapter to begin.';

        if (!this.currentSubjectId) {
            this.chapterSelect.innerHTML = '';
            return;
        }
        const selectedSubject = this.allSubjects.find(s => s.id === this.currentSubjectId);
        this.chapterSelect.innerHTML = '<option value="">-- Select a Chapter --</option>'; // FIX: Added missing semicolon
        selectedSubject.chapters.forEach((chapter, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = chapter.name;
            this.chapterSelect.appendChild(option);
        });
    },

    handleChapterChange() { // This function doesn't need to be async itself
        this.currentChapterIndex = parseInt(this.chapterSelect.value, 10);
        if (isNaN(this.currentChapterIndex)) {
            this.setSelect.innerHTML = '';
            this.questionList.innerHTML = '';
            this.setActions.style.display = 'none';
            return;
        }
        this.populateSetSelector();
        this.loadQuestions(); // Load questions for the first set by default
    },

    loadQuestions() { // This function doesn't need to be async
        const setIndex = parseInt(this.setSelect.value, 10);

        if (!this.currentSubjectId || isNaN(this.currentChapterIndex) || isNaN(setIndex)) {
            this.questionList.innerHTML = '';
            this.editorHeading.textContent = 'Select a subject, chapter, and set.';
            return;
        }

        const subjectData = this.allSubjects.find(s => s.id === this.currentSubjectId);
        if (!subjectData) {
            this.showStatus('Subject not found', 'warning');
            return;
        }
        const chapter = subjectData.chapters[this.currentChapterIndex];
        const questions = chapter?.sets?.[setIndex]?.questions || [];
        this.displayQuestions(questions, setIndex);
        this.editorHeading.textContent = `Editing: ${subjectData.subjectName} > ${chapter.name} > Set ${setIndex + 1}`;
        this.showStatus(`Loaded ${questions.length} questions`, 'success');
    },

    displayQuestions(questions, setIndex) {
        this.questionList.innerHTML = '';
        if (questions.length === 0) this.questionList.innerHTML = '<p>No questions in this set. Click "Add Question" to start.</p>';

        questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.innerHTML = `
                <div class="question-header">
                    <span class="question-number">Q${index + 1}.</span>
                    <span class="question-text">${question.question || ''}</span>
                </div>
                <div class="options-list">
                    ${(question.options || []).map((option, optIndex) => `
                        <div class="option ${optIndex === question.answer ? 'correct' : ''}">${String.fromCharCode(65 + optIndex)}. 
                            ${option}
                        </div>
                    `).join('')}
                </div>
                <div class="question-actions">
                    <button class="edit-btn" onclick="QuizAdmin.openQuestionModal(${setIndex}, ${index})">
                        Edit
                    </button>
                    <button class="delete-btn" onclick="QuizAdmin.handleDeleteQuestion(${setIndex}, ${index})">
                        Delete
                    </button>
                </div>
            `;
            this.questionList.appendChild(questionDiv);
        });
    },

    openQuestionModal(setIndex = null, questionIndex = -1) {
        this.questionForm.reset();
        this.questionSetIndexInput.value = setIndex === null ? this.setSelect.value : setIndex;
        this.questionIdInput.value = questionIndex;

        if (questionIndex > -1) { // Editing existing question
            this.questionModalTitle.textContent = `Edit Question ${questionIndex + 1}`;
            const subject = this.allSubjects.find(s => s.id === this.currentSubjectId);
            const chapter = subject.chapters[this.currentChapterIndex];
            const question = chapter.sets[setIndex].questions[questionIndex];
            
            this.questionTextInput.value = question.question;
            this.optionInputs.forEach((input, i) => input.value = question.options[i] || '');
            this.correctAnswerSelect.value = question.answer;
        } else { // Adding new question
            this.questionModalTitle.textContent = 'Add New Question';
        }

        this.questionModal.classList.add('visible');
        this.questionTextInput.focus();
    },

    closeQuestionModal() {
        this.questionModal.classList.remove('visible');
    },

    async handleSaveQuestion(event) {
        event.preventDefault();
        this.showLoading();
        this.showStatus('Saving...', 'info');

        const setIndex = parseInt(this.questionSetIndexInput.value, 10);
        const questionIndex = parseInt(this.questionIdInput.value, 10);

        const questionData = {
            question: this.questionTextInput.value.trim(),
            options: this.optionInputs.map(input => input.value.trim()),
            answer: parseInt(this.correctAnswerSelect.value, 10),
            hint: "", year: "" // Ensure these fields exist
        };

        if (!questionData.question || questionData.options.some(opt => !opt)) {
            this.showStatus('Please fill out all fields.', 'error');
            return;
        }

        const subject = this.allSubjects.find(s => s.id === this.currentSubjectId);
        const chapter = subject.chapters[this.currentChapterIndex];

        // FIX: Ensure the set and its questions array exist before trying to add to them.
        // This prevents errors when adding the first question to a new set.
        if (!chapter.sets[setIndex]) {
            chapter.sets[setIndex] = { questions: [] }; // This was step 1, but I've renumbered for clarity
        }

        if (questionIndex > -1) { // Editing
            chapter.sets[setIndex].questions[questionIndex] = questionData;
        } else { // Adding
            if (!chapter.sets[setIndex].questions) {
                chapter.sets[setIndex].questions = [];
            } // This was step 1, but I've renumbered for clarity
            chapter.sets[setIndex].questions.push(questionData);
        }

        try {
            await quizzesCollection.doc(this.currentSubjectId).update({ chapters: subject.chapters });
            this.showStatus('Question saved successfully!', 'success');
            this.closeQuestionModal();
            await this.refreshCurrentView();
        } catch (error) {
            console.error("Error saving question:", error);
            this.showStatus('Failed to save question.', 'error');
        } finally {
            this.hideLoading();
        }
    },

    async handleDeleteQuestion(setIndex, questionIndex) {
        if (!confirm('Are you sure you want to delete this question?')) return;

        this.showLoading();

        const subject = this.allSubjects.find(s => s.id === this.currentSubjectId);
        const chapter = subject.chapters[this.currentChapterIndex];
        chapter.sets[setIndex].questions.splice(questionIndex, 1);

        try {
            await quizzesCollection.doc(this.currentSubjectId).update({ chapters: subject.chapters });
            this.showStatus('Question deleted successfully', 'success');
            await this.refreshCurrentView();
        } catch (error) {
            console.error('Error deleting question:', error);
            this.showStatus('Failed to delete question', 'error');
        } finally {
            this.hideLoading();
        }

    },

    async deleteSet() { // Made async
        const setIndex = parseInt(this.setSelect.value, 10); // This is correct
        if (isNaN(setIndex)) {
            this.showStatus('Please select a set to delete.', 'error');
            return;
        }
        if (!confirm(`Are you sure you want to delete Set ${setIndex + 1}? This action cannot be undone.`)) return;

        this.showLoading();

        const subject = this.allSubjects.find(s => s.id === this.currentSubjectId);
        const chapter = subject.chapters[this.currentChapterIndex];

        chapter.sets.splice(setIndex, 1);

        try {
            await quizzesCollection.doc(this.currentSubjectId).update({ chapters: subject.chapters });
            this.showStatus('Set deleted successfully!', 'success');
            await this.refreshSubjectData(); // Full refresh needed here
            this.handleChapterChange(); // Refresh the UI
        } catch (error) {
            console.error("Error deleting set:", error);
            this.showStatus('Failed to delete set.', 'error');
        } finally {
            this.hideLoading();
        }
    },

    // Add this function to populate sets
    populateSetSelector() { // This function doesn't need to be async
        if (isNaN(this.currentChapterIndex)) {
            this.setSelect.innerHTML = '';
            this.setActions.style.display = 'none';
            return;
        }

        const subject = this.allSubjects.find(s => s.id === this.currentSubjectId);
        const chapter = subject.chapters[this.currentChapterIndex];
        const sets = chapter.sets || [];

        this.setSelect.innerHTML = '';
        sets.forEach((_, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Set ${index + 1}`;
            this.setSelect.appendChild(option);
        });

        this.setActions.style.display = 'block';
    },

    // Add this function to create a new set
    async addSet() {
        if (!this.currentSubjectId || isNaN(this.currentChapterIndex)) {
            this.showStatus('Please select a subject and chapter first', 'error');
            return;
        }

        this.showLoading();

        const subject = this.allSubjects.find(s => s.id === this.currentSubjectId);
        const chapter = subject.chapters[this.currentChapterIndex];
        chapter.sets.push({ questions: [] }); // Add a new empty set

        try {
            await quizzesCollection.doc(this.currentSubjectId).update({
                chapters: subject.chapters
            });
            this.showStatus('New set added successfully!', 'success');

            await this.refreshSubjectData(); // Full refresh needed
            this.handleSubjectChange(); // Re-populate chapters to reflect changes
            this.chapterSelect.value = this.currentChapterIndex; // Re-select current chapter
            this.handleChapterChange(); // Re-populate sets
        } catch (error) { // This was correct
            console.error('Error adding new set:', error);
            this.showStatus('Failed to add new set', 'error');
        } finally {
            this.hideLoading();
        }
    },

    /**
     * NEW: Refreshes the local `allSubjects` data from Firestore.
     * This is crucial for updating the UI after any change.
     */
    async refreshSubjectData() {
        // Re-fetch data for the current category
        const category = this.categorySelect.value;
        const snapshot = await quizzesCollection.where('category', '==', category).get();
        this.allSubjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    
    /**
     * NEW: Refreshes the current question list from Firestore without reloading the whole page.
     */
    async refreshCurrentView() {
        await this.refreshSubjectData();
        this.loadQuestions();
    },

    /**
     * NEW: Shows a loading spinner over the question list.
     */
    showLoading() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `<div class="spinner"></div>`;
        this.questionList.style.position = 'relative';
        this.questionList.appendChild(overlay);
    },

    /**
     * NEW: Hides the loading spinner.
     */
    hideLoading() {
        const overlay = this.questionList.querySelector('.loading-overlay');
        if (overlay) overlay.remove();
    },

    showStatus(message, type = 'info') {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        if (message) {
            setTimeout(() => {
                this.statusMessage.textContent = '';
                this.statusMessage.className = 'status-message';
            }, 4000);
        }
    },

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
};

QuizAdmin.init();

// This is a one-time migration script.
// You can run this from the browser console by typing `uploadAllDataToFirestore()`
async function uploadAllDataToFirestore() {
    // NEW: Helper function to get subject title, making this script self-contained.
    const getSubjectTitle = (subject) => {
        const titles = { quantitative: 'Quantitative Aptitude', english: 'English', reasoning: 'Reasoning', math: 'Mathematics', physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology', accounts: 'Accounts', business: 'Business Studies', economics: 'Economics', history: 'History' };
        return titles[subject] || subject.charAt(0).toUpperCase() + subject.slice(1);
    };


    const quizzesCollection = db.collection("quizzes");

    console.log("Starting data upload...");

    // --- Competitive Data ---
    const competitiveSubjects = {
        quantitative: window.quantitativeData,
        english: window.englishData,
        reasoning: window.reasoningData
    };

    for (const subjectId in competitiveSubjects) {
        const subject = competitiveSubjects[subjectId];
        if (subject && subject.chapters) {
            console.log(`Processing competitive subject: ${subjectId}`);
            const docData = {
                subjectName: subjectId.charAt(0).toUpperCase() + subjectId.slice(1),
                category: 'competitive',
                    chapters: subject.chapters.map(chapter => ({ // This was correct
                    ...chapter,
                    sets: chapter.sets.map(set => ({ questions: set }))
                }))
            };
            await quizzesCollection.doc(subjectId).set(docData);
            console.log(`  -> Uploaded ${subjectId}`);
        }
    }

    // --- Academic Data ---
    const academicData = window.classesData;

    try {
        if (academicData) {
            for (const classNum in academicData) {
                const classInfo = academicData[classNum];
                if (!classInfo.chapters) continue;
    
                for (const subjectKey in classInfo.chapters) {
                    const subjectChapters = classInfo.chapters[subjectKey];
                    const subjectId = `class${classNum}_${subjectKey}`;
                    console.log(`Processing academic subject: ${subjectId}`);
                    
                    const docData = {
                        subjectName: getSubjectTitle(subjectKey),
                        category: 'academic',
                        class: classNum,
                        chapters: subjectChapters.map(chapter => ({
                            ...chapter, // This was correct
                            // Ensure sets are in the format { questions: [...] }
                            sets: chapter.sets.map(set => ({ questions: set }))
                        }))
                    };

                    // FIX: Correctly add the 'streams' array if it exists for the class.
                    if (classInfo.streams) {
                        docData.streams = Object.keys(classInfo.streams).filter(stream => classInfo.streams[stream].includes(subjectKey));
                    } else {
                        docData.streams = []; // Ensure the field exists even for classes 9/10
                    }
    
                    await quizzesCollection.doc(subjectId).set(docData);
                    console.log(`  -> Uploaded ${subjectId}`);
                }
            }
        }
    } catch (error) {
        console.error("Error processing academic data:", error);
    }

    console.log("Data upload complete!");
    alert("All quiz data has been uploaded to Firestore!");
}
