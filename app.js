// --- Firebase Initialization (Global Compat) ---
let db = null;
let userId = null;

if (typeof firebase !== 'undefined' && window.firebaseConfig) {
    try {
        firebase.initializeApp(window.firebaseConfig);
        db = firebase.database(); // Use Realtime Database for easier object sync
        console.log("Firebase initialized");

        // Anonymous Auth for Data Segregation
        firebase.auth().signInAnonymously().catch(console.error);
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                userId = user.uid;
                console.log("Logged in as:", userId);
                startFirebaseSync();
            }
        });
    } catch (e) {
        console.error("Firebase init error:", e);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // --- Elements ---
    const editor = document.getElementById('editor');
    const docTitle = document.getElementById('doc-title');
    const btnHighlight = document.getElementById('btn-highlight');
    const folderTree = document.getElementById('folder-tree');

    // UI Toggles
    const btnCollapseSidebar = document.getElementById('btn-collapse-sidebar');
    const btnExpandSidebar = document.getElementById('btn-expand-sidebar');
    const sidebar = document.getElementById('sidebar');
    const btnModeToggle = document.getElementById('btn-mode-toggle');
    const modeText = document.getElementById('mode-text');
    const editToolbar = document.getElementById('edit-toolbar');

    // Sidebar Tabs
    const sidebarTabs = document.querySelectorAll('.sidebar-tab');
    const sidebarViews = document.querySelectorAll('.sidebar-view');

    // Mind Map UI
    const noteEditorContainer = document.getElementById('note-editor-container');
    const mindMapContainer = document.getElementById('mindmap-container');
    const mindMapList = document.getElementById('mindmap-list');
    const btnAddMindMap = document.getElementById('btn-add-mindmap');
    const mindMapBuilder = document.getElementById('mindmap-builder');
    const mermaidOutput = document.getElementById('mermaid-output');
    const btnResetZoom = document.getElementById('btn-reset-zoom');

    // Flashcard UI
    const flashcardTree = document.getElementById('flashcard-tree');
    const btnFcAddLesson = document.getElementById('btn-fc-add-lesson');
    const flashcardListContainer = document.getElementById('flashcard-list-container');
    const fcTableBody = document.getElementById('fc-table-body');
    const btnStartStudy = document.getElementById('btn-start-study');
    const flashcardPlayerContainer = document.getElementById('flashcard-player-container');
    const flashcardScene = document.getElementById('flashcard-scene');
    const btnPrevCard = document.getElementById('btn-prev-card');
    const btnNextCard = document.getElementById('btn-next-card');
    const btnExitStudy = document.getElementById('btn-exit-study');
    const fcProgress = document.getElementById('fc-progress');
    const fcUploadModal = document.getElementById('fc-upload-modal');
    const btnFcCancelUpload = document.getElementById('btn-fc-cancel-upload');
    const fcLessonSelect = document.getElementById('fc-upload-lesson-select');
    const fcTopicSelect = document.getElementById('fc-upload-topic-select');
    const fcFileInput = document.getElementById('flashcard-upload-input');

    // MCQ UI
    const mcqTree = document.getElementById('mcq-tree');
    const btnMcqAddLesson = document.getElementById('btn-mcq-add-lesson');
    const mcqContainer = document.getElementById('mcq-container');
    const mcqListView = document.getElementById('mcq-list-view');
    const mcqPlayerView = document.getElementById('mcq-player-view');
    const mcqQuestionsList = document.getElementById('mcq-questions-list');
    const btnStartQuiz = document.getElementById('btn-start-quiz');
    const btnExitQuiz = document.getElementById('btn-exit-quiz');
    const mcqQuestionText = document.getElementById('mcq-question-text');
    const mcqOptionsContainer = document.getElementById('mcq-options-container');
    const mcqFeedback = document.getElementById('mcq-feedback');
    const btnPrevQuestion = document.getElementById('btn-prev-question');
    const mcqProgress = document.getElementById('mcq-progress');
    const btnNextQuestion = document.getElementById('btn-next-question');

    // MCQ Import Modal
    const mcqUploadModal = document.getElementById('mcq-upload-modal');
    const btnMcqCancelUpload = document.getElementById('btn-mcq-cancel-upload');
    const mcqLessonSelect = document.getElementById('mcq-upload-lesson-select');
    const mcqTopicSelect = document.getElementById('mcq-upload-topic-select');
    const mcqFileInput = document.getElementById('mcq-upload-input');

    // Upload Modal (Notes)
    const btnAddLessonMain = document.getElementById('btn-add-lesson');
    const btnOpenUploadModal = document.getElementById('btn-open-upload-modal');
    const uploadModal = document.getElementById('upload-modal');
    const btnCancelUpload = document.getElementById('btn-cancel-upload');
    const lessonSelect = document.getElementById('upload-lesson-select');
    const topicSelect = document.getElementById('upload-topic-select');
    const fileInputModal = document.getElementById('docx-upload-modal-input');

    // Editor Tabs & Toolbar
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const btnBold = document.getElementById('btn-bold');
    const btnItalic = document.getElementById('btn-italic');
    const btnUnderline = document.getElementById('btn-underline');

    // Create overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay hidden';
    document.body.appendChild(modalOverlay);

    // Popup Elements
    const dictPopup = document.getElementById('dictionary-popup');
    const btnAddExplanation = document.getElementById('btn-add-explanation');
    const tooltip = document.getElementById('definition-tooltip');
    const tooltipText = document.getElementById('tooltip-text');


    // --- State Management ---
    let appData = { lessons: [] };
    let mindMapsData = [];
    let flashcardsApp = { lessons: [] };
    let mcqApp = { lessons: [] };
    let dictionary = {};

    let currentNoteId = null;
    let currentMindMapId = null;
    let currentDeckId = null;
    let currentQuizId = null;
    let currentCardIndex = 0;
    let currentQuestionIndex = 0;

    let isEditMode = false;
    let isSelectingForExplanation = false;
    let termBeingDefined = null;
    let panZoomInstance = null;

    // --- Initialization ---
    // --- Initialization ---
    await loadAllData();

    migrateDictionary();
    migrateMindMaps();
    migrateFlashcards();

    renderFolderTree();
    renderMindMapList();
    renderFlashcardTree();
    renderMcqTree();
    renderDictionaryList();

    showEmptyState();

    // --- Firebase Sync Logic ---
    function startFirebaseSync() {
        if (!db || !userId) return;

        const userRef = db.ref('users/' + userId);

        // 1. Initial Fetch to see if cloud has data
        userRef.once('value').then(snapshot => {
            const data = snapshot.val();
            if (data) {
                // Cloud has data -> Overwrite Local with newer? 
                // For simplicity: If cloud exists, use it.
                console.log("Syncing from Cloud...");
                if (data.appData) appData = data.appData;
                if (data.dictionary) dictionary = data.dictionary;
                if (data.mindMapsData) mindMapsData = data.mindMapsData;
                if (data.flashcardsApp) flashcardsApp = data.flashcardsApp;
                if (data.mcqApp) mcqApp = data.mcqApp;

                // Save to LocalStorage to keep in sync
                saveAllToLocal();
                refreshAllViews();
            } else {
                // Cloud empty -> Upload Local
                console.log("Uploading Local to Cloud...");
                saveAllToCloud();
            }

            // 2. Listen for changes from other devices
            userRef.on('value', (snap) => {
                const updated = snap.val();
                if (updated) {
                    if (updated.appData) appData = updated.appData;
                    if (updated.dictionary) dictionary = updated.dictionary;
                    if (updated.mindMapsData) mindMapsData = updated.mindMapsData;
                    if (updated.flashcardsApp) flashcardsApp = updated.flashcardsApp;
                    if (updated.mcqApp) mcqApp = updated.mcqApp;

                    saveAllToLocal();
                    refreshAllViews();
                }
            });
        });
    }

    function saveAllToLocal() {
        localStorage.setItem('notes_app_data', JSON.stringify(appData));
        localStorage.setItem('my_dictionary', JSON.stringify(dictionary));
        localStorage.setItem('mind_maps_data', JSON.stringify(mindMapsData));
        localStorage.setItem('flashcards_app_data', JSON.stringify(flashcardsApp));
        localStorage.setItem('mcq_app_data', JSON.stringify(mcqApp));
    }

    function saveAllToCloud() {
        if (!db || !userId) return;
        db.ref('users/' + userId).set({
            appData,
            dictionary,
            mindMapsData,
            flashcardsApp,
            mcqApp,
            lastUpdated: Date.now()
        });
    }

    function refreshAllViews() {
        renderFolderTree();
        renderDictionaryList();
        renderMindMapList();
        renderFlashcardTree();
        renderMcqTree();
    }

    // --- Persist Data (Modified to Sync) ---
    function saveAppData() {
        localStorage.setItem('notes_app_data', JSON.stringify(appData));
        if (db && userId) db.ref('users/' + userId + '/appData').set(appData);
    }
    function saveDictionary() {
        localStorage.setItem('my_dictionary', JSON.stringify(dictionary));
        if (db && userId) db.ref('users/' + userId + '/dictionary').set(dictionary);
    }
    function saveMindMapsData() {
        localStorage.setItem('mind_maps_data', JSON.stringify(mindMapsData));
        if (db && userId) db.ref('users/' + userId + '/mindMapsData').set(mindMapsData);
    }
    function saveFlashcardsApp() {
        localStorage.setItem('flashcards_app_data', JSON.stringify(flashcardsApp));
        if (db && userId) db.ref('users/' + userId + '/flashcardsApp').set(flashcardsApp);
    }
    function saveMcqApp() {
        localStorage.setItem('mcq_app_data', JSON.stringify(mcqApp));
        if (db && userId) db.ref('users/' + userId + '/mcqApp').set(mcqApp);
    }

    function migrateDictionary() {
        let changed = false;
        Object.keys(dictionary).forEach(key => {
            const val = dictionary[key];
            if (typeof val === 'string') {
                dictionary[key] = [{ definition: val, noteId: null, noteTitle: "Global" }];
                changed = true;
            } else if (typeof val === 'object' && !Array.isArray(val)) {
                dictionary[key] = [val];
                changed = true;
            }
        });
        if (changed) saveDictionary();
    }

    function migrateMindMaps() {
        let changed = false;
        mindMapsData.forEach(map => {
            if (typeof map.content === 'string') {
                map.content = { id: 'root', text: map.name, children: [{ id: crypto.randomUUID(), text: 'New Node', children: [] }] };
                changed = true;
            }
        });
        if (changed) saveMindMapsData();
    }

    function migrateFlashcards() {
        const oldData = localStorage.getItem('flashcards_data');
        if (oldData) {
            try {
                const flatDecks = JSON.parse(oldData);
                if (Array.isArray(flatDecks) && flatDecks.length > 0) {
                    const lessonId = crypto.randomUUID();
                    const topicId = crypto.randomUUID();
                    const newItem = { id: lessonId, name: "Imported Decks", topics: [{ id: topicId, name: "General", decks: flatDecks }] };
                    flashcardsApp.lessons.push(newItem);
                    saveFlashcardsApp();
                    localStorage.removeItem('flashcards_data');
                }
            } catch (e) { console.error("Migration failed", e); }
        }
    }

    async function saveDataToFirestore() {
        const dataToSave = {
            appData,
            mindMapsData,
            flashcardsApp,
            mcqApp,
            dictionary
        };
        try {
            await setDoc(doc(db, "app-data", "main"), dataToSave);
            console.log("Document successfully written!");
        } catch (e) {
            console.error("Error writing document: ", e);
        }
    }

    function saveDictionary() {
        localStorage.setItem('my_dictionary', JSON.stringify(dictionary));
        saveDataToFirestore();
    }
    function saveMindMapsData() {
        localStorage.setItem('mind_maps_data', JSON.stringify(mindMapsData));
        saveDataToFirestore();
    }
    function saveAppData() {
        localStorage.setItem('notes_app_data', JSON.stringify(appData));
        saveDataToFirestore();
    }
    function saveFlashcardsApp() {
        localStorage.setItem('flashcards_app_data', JSON.stringify(flashcardsApp));
        saveDataToFirestore();
    }
    function saveMcqApp() {
        localStorage.setItem('mcq_app_data', JSON.stringify(mcqApp));
        saveDataToFirestore();
    }

    // --- Sidebar Tabs Logic ---
    sidebarTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            sidebarTabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sidebarViews.forEach(v => v.classList.add('hidden'));
            document.getElementById(`view-${view}`).classList.remove('hidden');
        });
    });

    // --- Sidebar Toggle ---
    // --- Sidebar Toggle ---
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function toggleSidebarMobile(show) {
        if (show) {
            sidebar.classList.add('mobile-open');
            sidebarOverlay.classList.add('active');
        } else {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('active');
        }
    }

    btnCollapseSidebar.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            toggleSidebarMobile(false);
        } else {
            sidebar.classList.add('collapsed');
            btnExpandSidebar.classList.remove('hidden');
        }
    });

    btnExpandSidebar.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            toggleSidebarMobile(true);
        } else {
            sidebar.classList.remove('collapsed');
            btnExpandSidebar.classList.add('hidden');
        }
    });

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            toggleSidebarMobile(false);
        });
    }

    // Close sidebar on mobile when a nav item is clicked (optional but good UX)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && e.target.closest('.nav-header') && !e.target.closest('.tree-actions')) {
            // Only close if it's a leaf node selection or navigation action, 
            // but user might want to browse. Let's keep it manual close or close on "leaf" click.
            // For now, let's explicitely close if they select a Note/Quiz/Deck/MindMap
            if (e.target.closest('.nav-item') && (
                e.target.closest('.nav-item').innerHTML.includes('description') || // Note
                e.target.closest('.nav-item').innerHTML.includes('style') ||       // Deck
                e.target.closest('.nav-item').innerHTML.includes('quiz') ||        // Quiz
                e.target.closest('.nav-item').innerHTML.includes('account_tree')   // MindMap (if any)
            )) {
                toggleSidebarMobile(false);
            }
        }
    });

    // --- Edit Mode & Formatting ---
    btnModeToggle.addEventListener('click', () => toggleEditMode(!isEditMode));
    if (btnBold) btnBold.addEventListener('click', () => document.execCommand('bold'));
    if (btnItalic) btnItalic.addEventListener('click', () => document.execCommand('italic'));
    if (btnUnderline) btnUnderline.addEventListener('click', () => document.execCommand('underline'));

    function toggleEditMode(enable) {
        if (!currentNoteId) return;
        isEditMode = enable;
        editor.contentEditable = isEditMode;
        if (isEditMode) {
            btnModeToggle.style.background = 'var(--accent-color)';
            btnModeToggle.style.color = 'white';
            modeText.textContent = 'Editing';
            editToolbar.classList.remove('hidden');
            editor.focus();
        } else {
            btnModeToggle.style.background = 'var(--glass-border)';
            btnModeToggle.style.color = 'var(--text-primary)';
            modeText.textContent = 'Edit';
            editToolbar.classList.add('hidden');
            scanForCrossLinks(); // Re-scan on exit
        }
        if (!isEditMode) saveCurrentNote();
    }

    // --- Button Listeners (Notes) ---
    if (btnAddLessonMain) {
        btnAddLessonMain.addEventListener('click', () => { const name = prompt("Enter lesson name:"); if (name) createLesson(name); });
    }
    if (btnOpenUploadModal) {
        btnOpenUploadModal.addEventListener('click', () => {
            lessonSelect.innerHTML = '<option value="">-- Choose Lesson --</option>';
            (appData.lessons || []).forEach(l => { const opt = document.createElement('option'); opt.value = l.id; opt.textContent = l.name; lessonSelect.appendChild(opt); });
            topicSelect.innerHTML = '<option value="">-- First Choose Lesson --</option>';
            topicSelect.disabled = true;
            uploadModal.classList.remove('hidden'); uploadModal.style.display = 'flex'; modalOverlay.classList.remove('hidden');
        });
    }

    // --- Helper Functions ---
    function createLesson(name) {
        const id = crypto.randomUUID();
        appData.lessons.push({ id, name, topics: [] });
        saveAppData(); renderFolderTree();
        return id;
    }
    function createTopic(lessonId, name) {
        const lesson = appData.lessons.find(l => l.id === lessonId);
        if (lesson) { lesson.topics.push({ id: crypto.randomUUID(), name, notes: [] }); saveAppData(); renderFolderTree(); }
    }
    function createNote(topicId, title, content = '') {
        for (const lesson of appData.lessons) {
            const topic = lesson.topics.find(t => t.id === topicId);
            if (topic) { const id = crypto.randomUUID(); topic.notes.push({ id, title, content, headers: [] }); saveAppData(); renderFolderTree(); return id; }
        }
    }

    // --- Flashcard Logic ---
    function createFCLesson(name) {
        const id = crypto.randomUUID();
        flashcardsApp.lessons.push({ id, name, topics: [] });
        saveFlashcardsApp(); renderFlashcardTree(); return id;
    }
    function createFCTopic(lessonId, name) {
        const l = flashcardsApp.lessons.find(x => x.id === lessonId);
        if (l) { l.topics.push({ id: crypto.randomUUID(), name, decks: [] }); saveFlashcardsApp(); renderFlashcardTree(); }
    }
    function createDeck(topicId, name, cards = []) {
        for (const lesson of flashcardsApp.lessons) {
            const t = lesson.topics.find(x => x.id === topicId);
            if (t) { const id = crypto.randomUUID(); t.decks.push({ id, name, cards }); saveFlashcardsApp(); renderFlashcardTree(); return id; }
        }
    }

    // --- MCQ Logic ---
    function createMcqLesson(name) {
        const id = crypto.randomUUID();
        mcqApp.lessons.push({ id, name, topics: [] });
        saveMcqApp(); renderMcqTree(); return id;
    }
    function createMcqTopic(lessonId, name) {
        const l = mcqApp.lessons.find(x => x.id === lessonId);
        if (l) { l.topics.push({ id: crypto.randomUUID(), name, quizzes: [] }); saveMcqApp(); renderMcqTree(); }
    }
    function createQuiz(topicId, name, questions = []) {
        for (const lesson of mcqApp.lessons) {
            const t = lesson.topics.find(x => x.id === topicId);
            if (t) { const id = crypto.randomUUID(); t.quizzes.push({ id, name, questions }); saveMcqApp(); renderMcqTree(); return id; }
        }
    }

    // --- Notes & Editor Logic (Saving, Parsing, Linking) ---
    function loadNote(noteId) {
        let foundNote = null;
        for (const l of appData.lessons) for (const t of l.topics) { const n = t.notes.find(note => note.id === noteId); if (n) { foundNote = n; break; } }
        if (foundNote) {
            currentNoteId = noteId; currentMindMapId = null; currentDeckId = null; currentQuizId = null;
            docTitle.textContent = foundNote.title;
            noteEditorContainer.classList.remove('hidden'); mindMapContainer.classList.add('hidden'); flashcardPlayerContainer.classList.add('hidden'); flashcardListContainer.classList.add('hidden'); mcqContainer.classList.add('hidden');
            editor.innerHTML = foundNote.content;
            toggleEditMode(false); btnModeToggle.style.display = 'flex';
            scanForCrossLinks(); // Vital call restored
            document.querySelectorAll('.nav-header').forEach(h => h.classList.remove('active'));
            renderFolderTree(); renderMindMapList(); renderFlashcardTree(); renderMcqTree();
        }
    }

    function saveCurrentNote() {
        if (!currentNoteId) return;
        for (const l of appData.lessons) {
            for (const t of l.topics) {
                const n = t.notes.find(note => note.id === currentNoteId);
                if (n) {
                    n.content = editor.innerHTML;
                    n.headers = parseHeaders(editor.innerHTML);
                    saveAppData();
                    return;
                }
            }
        }
    }

    function parseHeaders(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent.trim()).filter(h => h.length > 0);
    }

    editor.addEventListener('input', () => { if (isEditMode) saveCurrentNote(); });

    // --- Search & Dictionary (Linking) ---
    function scanForCrossLinks() {
        const headerIndex = {};
        (appData.lessons || []).forEach(l => {
            l.topics.forEach(t => {
                t.notes.forEach(n => {
                    // Titles: Store as lowercase keys for lookup
                    if (n.title && n.title.length > 2) headerIndex[n.title.toLowerCase()] = n.id;
                });
            });
        });

        let html = editor.innerHTML;

        // Cleanup: Remove stale links (e.g. if note was renamed)
        // We strip the span if the text inside is no longer a valid note title pointing to the correct ID
        html = html.replace(/<span class="linked-header"[^>]*data-note-id="([^"]+)"[^>]*>(.*?)<\/span>/gi, (match, id, text) => {
            const key = text.toLowerCase();
            // If the text is still a valid title AND it points to the same note ID, keep it.
            // Otherwise, strip the span (return just the text).
            if (headerIndex[key] && headerIndex[key] === id) {
                return match;
            }
            return text;
        });

        // 1. Sort Headers/Titles by Length DESC to prevent substring collisions
        const sortedHeaderKeys = Object.keys(headerIndex).sort((a, b) => b.length - a.length);

        sortedHeaderKeys.forEach(headerKey => {
            // Prevent self-linking (don't link to the note we are currently editing)
            if (headerIndex[headerKey] === currentNoteId) return;

            // Use the key (lowercase) to find the ID, but escape the key for regex matching (case-insensitive)
            // Note: headerKey is already lowercase, but the text in the doc might not be.
            const regex = new RegExp(`(?<!<[^>]*)\\b(${escapeRegExp(headerKey)})\\b`, 'gi');

            // Avoid double linking
            if (!html.includes(`data-note-id="${headerIndex[headerKey]}"`)) {
                html = html.replace(regex, (match) => {
                    return `<span class="linked-header" data-note-id="${headerIndex[headerKey]}">${match}</span>`;
                });
            }
        });

        // 2. Sort Dictionary Terms by Length DESC
        const sortedDictKeys = Object.keys(dictionary).sort((a, b) => b.length - a.length);

        sortedDictKeys.forEach(term => {
            const regex = new RegExp(`(?<!<[^>]*)\\b(${escapeRegExp(term)})\\b`, 'gi');
            if (!html.includes(`data-term="${term}"`)) {
                html = html.replace(regex, (match) => {
                    return `<span class="defined-term" data-term="${term}">${match}</span>`;
                });
            }
        });

        if (editor.innerHTML !== html) editor.innerHTML = html;
    }

    // --- Interact with Linked Headers ---
    editor.addEventListener('click', (e) => {
        if (e.target.classList.contains('linked-header')) {
            loadNote(e.target.dataset.noteId);
        }
    });

    // --- Dictionary Highlight Logic (Selection) ---
    if (btnHighlight) btnHighlight.addEventListener('click', () => {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('hiliteColor', false, '#ffeaa733');
        saveCurrentNote();
    });

    editor.addEventListener('mouseup', (e) => {
        if (!isEditMode) return;
        if (isSelectingForExplanation) { handleExplanationSelection(); return; }
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        if (selectedText.length > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            dictPopup.style.left = `${rect.left + window.scrollX}px`;
            dictPopup.style.top = `${rect.top + window.scrollY - 40}px`;
            dictPopup.classList.remove('hidden');
            termBeingDefined = { text: selectedText, range: range.cloneRange() };
        } else { dictPopup.classList.add('hidden'); }
    });

    document.addEventListener('mousedown', (e) => {
        if (dictPopup && !dictPopup.contains(e.target) && !editor.contains(e.target)) {
            dictPopup.classList.add('hidden');
        }
    });

    if (btnAddExplanation) btnAddExplanation.addEventListener('click', () => {
        if (!termBeingDefined) return;
        dictPopup.classList.add('hidden');
        isSelectingForExplanation = true;
        editor.style.cursor = 'crosshair';
        alert('Now select the definition text inside the editor.');
    });

    function handleExplanationSelection() {
        const selection = window.getSelection();
        const explanationText = selection.toString().trim();
        if (explanationText.length > 0) {
            // Force lowercase for dictionary keys
            const term = termBeingDefined.text.toLowerCase();
            const noteTitle = document.getElementById('doc-title').textContent || "Unknown Note";

            if (!dictionary[term]) dictionary[term] = [];
            dictionary[term].push({ definition: explanationText, noteId: currentNoteId, noteTitle: noteTitle });
            saveDictionary();

            // Highlight the TERM
            try {
                const span = document.createElement('span');
                span.className = 'defined-term';
                span.textContent = termBeingDefined.text; // Keep display text as is
                span.dataset.term = term; // Key is lowercase
                termBeingDefined.range.deleteContents();
                termBeingDefined.range.insertNode(span);
            } catch (e) { console.error(e); }

            isSelectingForExplanation = false;
            editor.style.cursor = 'text';
            renderDictionaryList();
            selection.removeAllRanges();
            termBeingDefined = null;
            saveCurrentNote();
        }
    }

    // --- Global Tooltips ---
    document.body.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('defined-term')) {
            const term = e.target.dataset.term || e.target.textContent.toLowerCase();
            const entries = dictionary[term];
            if (entries) {
                let html = `<strong>${term}</strong><hr style="margin: 4px 0; border: 0; border-top: 1px solid rgba(255,255,255,0.2);">`;
                entries.forEach((entry, i) => {
                    const source = entry.noteTitle ? `<span style="display:block; font-size: 0.7rem; color: #a29bfe; opacity: 0.8;">via ${entry.noteTitle}</span>` : '';
                    html += `<div style="${i < entries.length - 1 ? 'margin-bottom: 8px;' : ''}">${entry.definition}${source}</div>`;
                });
                tooltipText.innerHTML = html;
                positionTooltip(e.target);
            }
        }
        if (e.target.classList.contains('linked-header')) {
            tooltipText.textContent = "Go to note";
            positionTooltip(e.target);
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('defined-term') || e.target.classList.contains('linked-header')) {
            tooltip.classList.add('hidden');
        }
    });

    function positionTooltip(element) {
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 5}px`;
        tooltip.classList.remove('hidden');
    }

    // --- MCQ Tree ---
    if (btnMcqAddLesson) btnMcqAddLesson.addEventListener('click', () => { const name = prompt("Lesson Name:"); if (name) createMcqLesson(name); });

    function renderMcqTree() {
        mcqTree.innerHTML = '';
        (mcqApp.lessons || []).forEach(lesson => {
            const lessonItem = createTreeItem(lesson.name, 'folder', true, lesson.id, 'mcq-lesson');
            const actions = lessonItem.querySelector('.tree-actions');
            const btnAddTopic = document.createElement('button');
            btnAddTopic.className = 'btn-add-inline';
            btnAddTopic.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px">add</span>';
            btnAddTopic.onclick = (e) => { e.stopPropagation(); const name = prompt("Topic Name:"); if (name) createMcqTopic(lesson.id, name); };
            actions.insertBefore(btnAddTopic, actions.firstChild);

            lesson.topics.forEach(topic => {
                const topicItem = createTreeItem(topic.name, 'topic', false, topic.id, 'mcq-topic');
                const tActions = topicItem.querySelector('.tree-actions');
                const btnUploadQuiz = document.createElement('button');
                btnUploadQuiz.className = 'btn-add-inline';
                btnUploadQuiz.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px">upload_file</span>';
                btnUploadQuiz.onclick = (e) => { e.stopPropagation(); openMcqUploadModal(lesson.id, topic.id); };
                tActions.insertBefore(btnUploadQuiz, tActions.firstChild);

                topic.quizzes.forEach(quiz => {
                    const quizItem = createTreeItem(quiz.name, 'deck', false, quiz.id, 'quiz');
                    quizItem.querySelector('.material-symbols-rounded').textContent = 'quiz';
                    quizItem.querySelector('.nav-header').onclick = (e) => { if (e.target.closest('.action-btn')) return; loadQuiz(quiz.id); };
                    if (currentQuizId === quiz.id) quizItem.querySelector('.nav-header').classList.add('active');
                    topicItem.querySelector('.nav-children').appendChild(quizItem);
                });
                lessonItem.querySelector('.nav-children').appendChild(topicItem);
            });
            mcqTree.appendChild(lessonItem);
        });
    }

    // --- MCQ Upload Modal ---
    function openMcqUploadModal(preLessonId, preTopicId) {
        mcqLessonSelect.innerHTML = '<option value="">-- Choose Lesson --</option>';
        mcqApp.lessons.forEach(l => { const opt = document.createElement('option'); opt.value = l.id; opt.textContent = l.name; if (l.id === preLessonId) opt.selected = true; mcqLessonSelect.appendChild(opt); });
        mcqUpdateTopics(preLessonId, preTopicId);
        mcqUploadModal.classList.remove('hidden'); mcqUploadModal.style.display = 'flex'; modalOverlay.classList.remove('hidden');
    }

    function mcqUpdateTopics(lessonId, selectedTopicId) {
        if (!lessonId) { mcqTopicSelect.innerHTML = '<option value="">-- First Choose Lesson --</option>'; mcqTopicSelect.disabled = true; return; }
        const l = mcqApp.lessons.find(x => x.id === lessonId);
        mcqTopicSelect.innerHTML = '<option value="">-- Choose Topic --</option>'; mcqTopicSelect.disabled = false;
        if (l) l.topics.forEach(t => { const opt = document.createElement('option'); opt.value = t.id; opt.textContent = t.name; if (t.id === selectedTopicId) opt.selected = true; mcqTopicSelect.appendChild(opt); });
    }

    if (mcqLessonSelect) mcqLessonSelect.addEventListener('change', () => mcqUpdateTopics(mcqLessonSelect.value, null));
    if (btnMcqCancelUpload) btnMcqCancelUpload.addEventListener('click', () => { mcqUploadModal.classList.add('hidden'); modalOverlay.classList.add('hidden'); mcqFileInput.value = ''; });

    if (mcqFileInput) mcqFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const topicId = mcqTopicSelect.value;
        if (!topicId) { alert("Select Topic"); return; }
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
            mammoth.extractRawText({ arrayBuffer: evt.target.result })
                .then(res => {
                    parseAndCreateQuiz(topicId, file.name.replace('.docx', ''), res.value);
                    mcqUploadModal.classList.add('hidden'); modalOverlay.classList.add('hidden'); mcqFileInput.value = '';
                })
                .catch(err => { console.error(err); alert("Error parsing file"); });
        };
        reader.readAsArrayBuffer(file);
    });

    function parseAndCreateQuiz(topicId, name, text) {
        // Format: !!!q:Question; a:OpA; b:OpB; c:OpC; d:OpD; e:OpE; x; e:Explanation!!!
        const regex = /!!!q:\s*([^;]+?);\s*a:\s*([^;]+?);\s*b:\s*([^;]+?);\s*c:\s*([^;]+?);\s*d:\s*([^;]+?);\s*e:\s*([^;]+?);\s*([a-e])\s*;\s*e:\s*([^!]+?)!!!/gi;
        const questions = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            questions.push({
                question: match[1].trim(),
                options: {
                    a: match[2].trim(),
                    b: match[3].trim(),
                    c: match[4].trim(),
                    d: match[5].trim(),
                    e: match[6].trim()
                },
                correct: match[7].trim().toLowerCase(),
                explanation: match[8].trim()
            });
        }
        if (questions.length === 0) { alert("No MCQs found in format !!!q:..;a:..;b:..;c:..;d:..;e:..;x;e:..!!!"); return; }
        const newId = createQuiz(topicId, name, questions);
        if (newId) loadQuiz(newId);
    }

    // --- MCQ Loading & Player ---
    function loadQuiz(id) {
        let foundQuiz = null;
        for (const l of mcqApp.lessons) for (const t of l.topics) { const q = t.quizzes.find(x => x.id === id); if (q) { foundQuiz = q; break; } }
        if (!foundQuiz) return;

        currentQuizId = id;
        currentNoteId = null; currentDeckId = null; currentMindMapId = null;
        docTitle.textContent = foundQuiz.name;

        // View Swapping
        noteEditorContainer.classList.add('hidden');
        mindMapContainer.classList.add('hidden');
        flashcardListContainer.classList.add('hidden');
        flashcardPlayerContainer.classList.add('hidden');
        mcqContainer.classList.remove('hidden');
        mcqListView.classList.remove('hidden');
        mcqPlayerView.classList.add('hidden');

        btnModeToggle.style.display = 'none'; editToolbar.classList.add('hidden');

        renderMcqList(foundQuiz);
        document.querySelectorAll('.nav-header').forEach(h => h.classList.remove('active'));
        renderMcqTree();
    }

    function renderMcqList(quiz) {
        mcqQuestionsList.innerHTML = '';
        quiz.questions.forEach((q, idx) => {
            const li = document.createElement('li');
            li.className = 'mcq-item-li';
            li.innerHTML = `<strong>Q${idx + 1}:</strong> ${scanTextForTerms(q.question)}`;
            mcqQuestionsList.appendChild(li);
        });
    }

    if (btnStartQuiz) btnStartQuiz.addEventListener('click', () => {
        mcqListView.classList.add('hidden');
        mcqPlayerView.classList.remove('hidden');
        currentQuestionIndex = 0;
        renderMcqPlayerCard();
    });

    if (btnExitQuiz) btnExitQuiz.addEventListener('click', () => {
        mcqPlayerView.classList.add('hidden');
        mcqListView.classList.remove('hidden');
    });

    function renderMcqPlayerCard() {
        let quiz = null;
        for (const l of mcqApp.lessons) for (const t of l.topics) { const q = t.quizzes.find(x => x.id === currentQuizId); if (q) { quiz = q; break; } }
        if (!quiz || !quiz.questions[currentQuestionIndex]) return;

        const qData = quiz.questions[currentQuestionIndex];
        mcqQuestionText.innerHTML = scanTextForTerms(qData.question);
        mcqOptionsContainer.innerHTML = '';
        mcqFeedback.classList.add('hidden');

        ['a', 'b', 'c', 'd', 'e'].forEach(key => {
            const val = qData.options[key];
            const btn = document.createElement('button');
            btn.className = 'mcq-option-btn';
            btn.innerHTML = `<strong>${key.toUpperCase()}.</strong> <span>${scanTextForTerms(val)}</span>`;

            btn.onclick = () => {
                // Check Answer
                const allBtns = mcqOptionsContainer.querySelectorAll('.mcq-option-btn');
                allBtns.forEach(b => b.disabled = true); // Disable all

                if (key === qData.correct) {
                    btn.classList.add('correct');
                    mcqFeedback.innerHTML = `<strong>Correct!</strong> <br> ${scanTextForTerms(qData.explanation)}`;
                    mcqFeedback.classList.remove('hidden');
                    mcqFeedback.style.borderLeftColor = '#00b894';
                } else {
                    btn.classList.add('wrong');
                    // Find and highlight correct
                    const correctBtn = Array.from(allBtns).find(b => b.innerHTML.startsWith(`<strong>${qData.correct.toUpperCase()}.`));
                    if (correctBtn) correctBtn.classList.add('correct');

                    mcqFeedback.innerHTML = `<strong>Incorrect.</strong> <br> ${scanTextForTerms(qData.explanation)}`;
                    mcqFeedback.classList.remove('hidden');
                    mcqFeedback.style.borderLeftColor = '#d63031';
                }
            };
            mcqOptionsContainer.appendChild(btn);
        });

        // Navigation
        mcqProgress.textContent = `${currentQuestionIndex + 1} / ${quiz.questions.length}`;
        btnPrevQuestion.disabled = currentQuestionIndex === 0;
        btnNextQuestion.disabled = currentQuestionIndex === quiz.questions.length - 1;
        btnPrevQuestion.style.opacity = currentQuestionIndex === 0 ? '0.5' : '1';
        btnNextQuestion.style.opacity = currentQuestionIndex === quiz.questions.length - 1 ? '0.5' : '1';
    }

    if (btnPrevQuestion) btnPrevQuestion.addEventListener('click', () => { if (currentQuestionIndex > 0) { currentQuestionIndex--; renderMcqPlayerCard(); } });
    if (btnNextQuestion) btnNextQuestion.addEventListener('click', () => { if (currentQuestionIndex < 999) { currentQuestionIndex++; renderMcqPlayerCard(); } });

    // --- Render Folder Tree ---
    function renderFolderTree() {
        folderTree.innerHTML = '';
        (appData.lessons || []).forEach(lesson => {
            const lessonItem = createTreeItem(lesson.name, 'folder', true, lesson.id, 'lesson');
            const actions = lessonItem.querySelector('.tree-actions');
            const btnAddTopic = document.createElement('button');
            btnAddTopic.className = 'btn-add-inline';
            btnAddTopic.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px">add</span>';
            btnAddTopic.onclick = (e) => { e.stopPropagation(); const name = prompt("Enter topic name:"); if (name) createTopic(lesson.id, name); };
            actions.insertBefore(btnAddTopic, actions.firstChild);

            lesson.topics.forEach(topic => {
                const topicItem = createTreeItem(topic.name, 'topic', false, topic.id, 'topic');
                const tActions = topicItem.querySelector('.tree-actions');
                const btnAddNote = document.createElement('button');
                btnAddNote.className = 'btn-add-inline';
                btnAddNote.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px">note_add</span>';
                btnAddNote.onclick = (e) => { e.stopPropagation(); const name = prompt("Enter note title:"); if (name) { const id = createNote(topic.id, name); loadNote(id); } };
                tActions.insertBefore(btnAddNote, tActions.firstChild);

                topic.notes.forEach(note => {
                    const noteItem = createTreeItem(note.title, 'note', false, note.id, 'note');
                    noteItem.querySelector('.nav-header').onclick = (e) => { if (e.target.closest('.action-btn')) return; loadNote(note.id); };
                    if (currentNoteId === note.id) noteItem.querySelector('.nav-header').classList.add('active');
                    topicItem.querySelector('.nav-children').appendChild(noteItem);
                });
                lessonItem.querySelector('.nav-children').appendChild(topicItem);
            });
            folderTree.appendChild(lessonItem);
        });
    }

    // --- Unified Tree Item Creator ---
    function createTreeItem(label, type, isOpen, id, itemType) {
        const li = document.createElement('li');
        li.className = 'nav-item';
        const header = document.createElement('div');
        header.className = 'nav-header';

        let icon = 'folder';
        if (type === 'topic') icon = 'topic';
        if (type === 'note') icon = 'description';
        if (itemType.startsWith('fc-lesson') || itemType.startsWith('mcq-lesson')) icon = 'folder_special';
        if (itemType.startsWith('fc-topic') || itemType.startsWith('mcq-topic')) icon = 'category';
        if (type === 'deck') icon = 'style';

        header.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.5rem; flex:1; overflow:hidden;">
                <span class="material-symbols-rounded" style="font-size:18px">${icon}</span> 
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${label}</span>
            </div>
            <div class="tree-actions">
                <button class="action-btn edit" title="Rename"><span class="material-symbols-rounded" style="font-size:14px">edit</span></button>
                <button class="action-btn delete" title="Delete"><span class="material-symbols-rounded" style="font-size:14px">delete</span></button>
            </div>
        `;

        if (type !== 'note' && type !== 'deck' && type !== 'quiz') {
            const children = document.createElement('div');
            children.className = `nav-children ${isOpen ? '' : 'hidden'}`;
            li.appendChild(header); li.appendChild(children);
            header.onclick = (e) => { if (!e.target.closest('.action-btn') && !e.target.closest('.btn-add-inline')) children.classList.toggle('hidden'); };
        } else { li.appendChild(header); }

        const btnEdit = header.querySelector('.action-btn.edit');
        const btnDelete = header.querySelector('.action-btn.delete');
        btnEdit.onclick = (e) => { e.stopPropagation(); renameItemOriginal(itemType, id, label, itemType); };
        btnDelete.onclick = (e) => { e.stopPropagation(); deleteItemOriginal(itemType, id, itemType); };
        return li;
    }

    function renameItemOriginal(type, id, oldName, itemType) {
        const newName = prompt(`Rename ${type}:`, oldName);
        if (!newName || newName === oldName) return;

        if (itemType.startsWith('mcq-') || itemType === 'quiz') {
            if (itemType === 'mcq-lesson') { const l = mcqApp.lessons.find(x => x.id === id); if (l) l.name = newName; }
            else if (itemType === 'mcq-topic') { for (const l of mcqApp.lessons) { const t = l.topics.find(x => x.id === id); if (t) { t.name = newName; break; } } }
            else if (itemType === 'quiz') { for (const l of mcqApp.lessons) for (const t of l.topics) { const q = t.quizzes.find(x => x.id === id); if (q) { q.name = newName; if (currentQuizId === id) docTitle.textContent = newName; break; } } }
            saveMcqApp(); renderMcqTree();
        } else if (itemType.startsWith('fc-') || itemType === 'deck') {
            if (itemType === 'fc-lesson') { const l = flashcardsApp.lessons.find(x => x.id === id); if (l) l.name = newName; }
            else if (itemType === 'fc-topic') { for (const l of flashcardsApp.lessons) { const t = l.topics.find(x => x.id === id); if (t) { t.name = newName; break; } } }
            else if (itemType === 'deck') { for (const l of flashcardsApp.lessons) for (const t of l.topics) { const d = t.decks.find(x => x.id === id); if (d) { d.name = newName; if (currentDeckId === id) docTitle.textContent = newName; break; } } }
            saveFlashcardsApp(); renderFlashcardTree();
        } else {
            if (itemType === 'lesson') { const l = appData.lessons.find(x => x.id === id); if (l) l.name = newName; }
            else if (itemType === 'topic') { for (const l of appData.lessons) { const t = l.topics.find(x => x.id === id); if (t) { t.name = newName; break; } } }
            else if (itemType === 'note') {
                for (const l of appData.lessons) for (const t of l.topics) {
                    const n = t.notes.find(x => x.id === id);
                    if (n) {
                        n.title = newName;
                        if (currentNoteId === id) docTitle.textContent = newName;

                        // Sync Dictionary Note Titles
                        let dictChanged = false;
                        Object.keys(dictionary).forEach(term => {
                            dictionary[term].forEach(entry => {
                                if (entry.noteId === id) {
                                    entry.noteTitle = newName;
                                    dictChanged = true;
                                }
                            });
                        });
                        if (dictChanged) { saveDictionary(); renderDictionaryList(); }
                        break;
                    }
                }
            }
            saveAppData(); renderFolderTree();
            // Ensure dictionary is re-rendered to update linked Note Titles if just the title changed (even if dictionary entries didn't)
            if (itemType === 'note') renderDictionaryList();
        }
    }

    function deleteItemOriginal(type, id, itemType) {
        if (!confirm(`Delete ${type}?`)) return;

        if (itemType === 'mindmap') {
            mindMapsData = mindMapsData.filter(m => m.id !== id);
            if (currentMindMapId === id) showEmptyState();
            saveMindMapsData();
            renderMindMapList();
            return;
        }

        if (itemType.startsWith('mcq-') || itemType === 'quiz') {
            if (itemType === 'mcq-lesson') mcqApp.lessons = mcqApp.lessons.filter(l => l.id !== id);
            else if (itemType === 'mcq-topic') for (const l of mcqApp.lessons) l.topics = l.topics.filter(t => t.id !== id);
            else if (itemType === 'quiz') for (const l of mcqApp.lessons) for (const t of l.topics) { t.quizzes = t.quizzes.filter(n => n.id !== id); if (currentQuizId === id) showEmptyState(); }
            saveMcqApp(); renderMcqTree();
        } else if (itemType.startsWith('fc-') || itemType === 'deck') {
            if (itemType === 'fc-lesson') flashcardsApp.lessons = flashcardsApp.lessons.filter(l => l.id !== id);
            else if (itemType === 'fc-topic') for (const l of flashcardsApp.lessons) l.topics = l.topics.filter(t => t.id !== id);
            else if (itemType === 'deck') for (const l of flashcardsApp.lessons) for (const t of l.topics) { t.decks = t.decks.filter(n => n.id !== id); if (currentDeckId === id) showEmptyState(); }
            saveFlashcardsApp(); renderFlashcardTree();
        } else {
            // Notes Cleanup Logic
            if (itemType === 'lesson') {
                const l = appData.lessons.find(x => x.id === id);
                if (l) l.topics.forEach(t => t.notes.forEach(n => cleanupDictionaryForNote(n.id)));
                appData.lessons = appData.lessons.filter(l => l.id !== id);
            }
            else if (itemType === 'topic') {
                for (const l of appData.lessons) {
                    const t = l.topics.find(x => x.id === id);
                    if (t) {
                        t.notes.forEach(n => cleanupDictionaryForNote(n.id));
                        l.topics = l.topics.filter(x => x.id !== id);
                    }
                }
            }
            else if (itemType === 'note') {
                for (const l of appData.lessons) for (const t of l.topics) {
                    if (t.notes.some(n => n.id === id)) {
                        cleanupDictionaryForNote(id);
                        t.notes = t.notes.filter(n => n.id !== id);
                    }
                }
            }
            if (currentNoteId === id) showEmptyState();
            saveAppData(); renderFolderTree();
        }
    }

    function cleanupDictionaryForNote(noteId) {
        let changed = false;
        Object.keys(dictionary).forEach(term => {
            const initialLen = dictionary[term].length;
            dictionary[term] = dictionary[term].filter(entry => entry.noteId !== noteId);
            if (dictionary[term].length !== initialLen) changed = true;
            if (dictionary[term].length === 0) { delete dictionary[term]; changed = true; }
        });
        if (changed) { saveDictionary(); renderDictionaryList(); }
    }

    // --- Shared View Loading ---
    function loadDeck(id) {
        let foundDeck = null;
        for (const l of flashcardsApp.lessons) for (const t of l.topics) { const d = t.decks.find(deck => deck.id === id); if (d) { foundDeck = d; break; } }
        if (!foundDeck) return;
        currentDeckId = id; currentNoteId = null; currentMindMapId = null; currentQuizId = null;
        docTitle.textContent = foundDeck.name;
        noteEditorContainer.classList.add('hidden'); mindMapContainer.classList.add('hidden'); flashcardPlayerContainer.classList.add('hidden'); flashcardListContainer.classList.remove('hidden'); mcqContainer.classList.add('hidden');
        btnModeToggle.style.display = 'none'; editToolbar.classList.add('hidden');
        renderFlashcardListView(foundDeck);
        document.querySelectorAll('.nav-header').forEach(h => h.classList.remove('active'));
        renderFlashcardTree();
    }
    function showEmptyState() {
        currentNoteId = null; currentDeckId = null; currentQuizId = null;
        docTitle.textContent = "Select a Note";
        noteEditorContainer.classList.remove('hidden'); mindMapContainer.classList.add('hidden'); flashcardPlayerContainer.classList.add('hidden'); flashcardListContainer.classList.add('hidden'); mcqContainer.classList.add('hidden');
        editor.contentEditable = false;
        editor.innerHTML = `<div class="empty-state" style="text-align:center; margin-top: 5rem; color: var(--text-secondary);"><span class="material-symbols-rounded" style="font-size: 48px; opacity: 0.5; margin-bottom: 1rem;">library_books</span><p>Select a note, deck, or quiz.</p></div>`;
        document.querySelectorAll('.nav-header').forEach(h => h.classList.remove('active'));
    }

    // --- Other Shared Logic (Flashcard Tree, Uploads, Listeners) ---
    // (Existing logic preserved below for brevity in rewrite, ensuring all is included)
    if (btnFcAddLesson) btnFcAddLesson.addEventListener('click', () => { const name = prompt("Enter Lesson Name:"); if (name) createFCLesson(name); });
    function renderFlashcardTree() {
        flashcardTree.innerHTML = '';
        (flashcardsApp.lessons || []).forEach(lesson => {
            const lessonItem = createTreeItem(lesson.name, 'folder', true, lesson.id, 'fc-lesson');
            const actions = lessonItem.querySelector('.tree-actions');
            const btnAddTopic = document.createElement('button'); btnAddTopic.className = 'btn-add-inline'; btnAddTopic.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px">add</span>';
            btnAddTopic.onclick = (e) => { e.stopPropagation(); const name = prompt("Topic:"); if (name) createFCTopic(lesson.id, name); };
            actions.insertBefore(btnAddTopic, actions.firstChild);
            lesson.topics.forEach(topic => {
                const topicItem = createTreeItem(topic.name, 'topic', false, topic.id, 'fc-topic');
                const tActions = topicItem.querySelector('.tree-actions');
                const btnUploadDeck = document.createElement('button'); btnUploadDeck.className = 'btn-add-inline'; btnUploadDeck.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px">upload_file</span>';
                btnUploadDeck.onclick = (e) => { e.stopPropagation(); openFcUploadModal(lesson.id, topic.id); };
                tActions.insertBefore(btnUploadDeck, tActions.firstChild);
                topic.decks.forEach(deck => {
                    const deckItem = createTreeItem(deck.name, 'deck', false, deck.id, 'deck');
                    deckItem.querySelector('.material-symbols-rounded').textContent = 'style';
                    deckItem.querySelector('.nav-header').onclick = (e) => { if (e.target.closest('.action-btn')) return; loadDeck(deck.id); };
                    if (currentDeckId === deck.id) deckItem.querySelector('.nav-header').classList.add('active');
                    topicItem.querySelector('.nav-children').appendChild(deckItem);
                });
                lessonItem.querySelector('.nav-children').appendChild(topicItem);
            });
            flashcardTree.appendChild(lessonItem);
        });
    }
    function openFcUploadModal(preLessonId, preTopicId) {
        fcLessonSelect.innerHTML = '<option value="">-- Choose Lesson --</option>';
        flashcardsApp.lessons.forEach(l => { const opt = document.createElement('option'); opt.value = l.id; opt.textContent = l.name; if (l.id === preLessonId) opt.selected = true; fcLessonSelect.appendChild(opt); });
        fcUpdateTopics(preLessonId, preTopicId);
        fcUploadModal.classList.remove('hidden'); fcUploadModal.style.display = 'flex'; modalOverlay.classList.remove('hidden');
    }
    function fcUpdateTopics(lessonId, selectedTopicId) {
        if (!lessonId) { fcTopicSelect.innerHTML = '<option value="">-- First Choose Lesson --</option>'; fcTopicSelect.disabled = true; return; }
        const l = flashcardsApp.lessons.find(x => x.id === lessonId);
        fcTopicSelect.innerHTML = '<option value="">-- Choose Topic --</option>'; fcTopicSelect.disabled = false;
        if (l) l.topics.forEach(t => { const opt = document.createElement('option'); opt.value = t.id; opt.textContent = t.name; if (t.id === selectedTopicId) opt.selected = true; fcTopicSelect.appendChild(opt); });
    }
    if (fcLessonSelect) fcLessonSelect.addEventListener('change', () => fcUpdateTopics(fcLessonSelect.value, null));
    if (btnFcCancelUpload) btnFcCancelUpload.addEventListener('click', () => { fcUploadModal.classList.add('hidden'); modalOverlay.classList.add('hidden'); fcFileInput.value = ''; });
    if (fcFileInput) fcFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0]; const topicId = fcTopicSelect.value;
        if (!topicId || !file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
            mammoth.extractRawText({ arrayBuffer: evt.target.result }).then(res => {
                // Flashcard parsing
                const regex = /!!!f:\s*([^;]+?);\s*b:\s*([^;]+?);\s*e:\s*([^!]+?)!!!/gi;
                const cards = []; let match; while ((match = regex.exec(res.value)) !== null) cards.push({ front: match[1].trim(), back: match[2].trim(), explanation: match[3].trim() });
                if (cards.length === 0) { alert("No cards found"); return; }
                const newId = createDeck(topicId, file.name.replace('.docx', ''), cards);
                if (newId) loadDeck(newId);
                fcUploadModal.classList.add('hidden'); modalOverlay.classList.add('hidden'); fcFileInput.value = '';
            }).catch(err => { console.error(err); alert("Error"); });
        };
        reader.readAsArrayBuffer(file);
    });

    // Render Dictionary & Tooltips
    // Render Dictionary & Tooltips
    function renderDictionaryList() {
        const list = document.getElementById('dictionary-list');
        list.innerHTML = '';

        // 1. Collect all Dictionary Terms
        const dictItems = Object.keys(dictionary).map(term => ({
            type: 'term',
            label: term,
            key: term.toLowerCase()
        }));

        // 2. Collect all Note Titles
        const noteItems = [];
        (appData.lessons || []).forEach(l => {
            l.topics.forEach(t => {
                t.notes.forEach(n => {
                    if (n.title && n.title.length > 0) {
                        noteItems.push({
                            type: 'note',
                            label: n.title,
                            id: n.id,
                            key: n.title.toLowerCase()
                        });
                    }
                });
            });
        });

        // 3. Merge and Sort
        const allItems = [...dictItems, ...noteItems].sort((a, b) => a.key.localeCompare(b.key));

        allItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'dict-item';
            li.style.flexDirection = 'column';

            if (item.type === 'note') {
                // Render Note Title
                li.style.cursor = 'pointer';
                li.style.borderLeft = '3px solid #ff7675'; // Distinguish note
                li.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="term" style="margin:0; color: #ff7675;">${item.label}</span>
                        <span class="material-symbols-rounded" style="font-size:14px; opacity:0.5;">description</span>
                    </div>
                `;
                li.onclick = () => loadNote(item.id);
            } else {
                // Render Dictionary Term
                const term = item.label;
                const entries = dictionary[term];

                li.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                        <span class="term" style="margin:0;">${term}</span>
                        <button class="btn-delete-term"><span class="material-symbols-rounded" style="font-size:16px;">delete_forever</span></button>
                    </div>
                `;
                li.querySelector('.btn-delete-term').onclick = (e) => { e.stopPropagation(); delete dictionary[term]; saveDictionary(); renderDictionaryList(); };

                const ul = document.createElement('ul');
                ul.style.listStyle = 'none';
                ul.style.paddingLeft = '0.5rem';
                ul.style.borderLeft = '1px solid var(--glass-border)';

                entries.forEach((entry, idx) => {
                    const dl = document.createElement('li');
                    dl.style.marginBottom = '0.5rem';
                    dl.style.fontSize = '0.85rem';
                    dl.style.display = 'flex';
                    const source = entry.noteTitle ? `<div style="font-size: 0.7rem; color: #a29bfe; opacity: 0.8; margin-top:2px;">via ${entry.noteTitle}</div>` : '';
                    dl.innerHTML = `<div style="flex:1;"><div style="color:var(--text-primary);">${entry.definition}</div>${source}</div><button class="btn-delete-term" style="opacity:0.3; padding:0;"><span class="material-symbols-rounded" style="font-size:14px;">close</span></button>`;
                    dl.querySelector('button').onclick = (e) => { e.stopPropagation(); entries.splice(idx, 1); if (entries.length === 0) delete dictionary[term]; saveDictionary(); renderDictionaryList(); };
                    ul.appendChild(dl);
                });
                li.appendChild(ul);
            }
            list.appendChild(li);
        });
    }

    function scanTextForTerms(text) {
        if (!text) return '';
        let html = text;
        Object.keys(dictionary).forEach(term => {
            const regex = new RegExp(`(?<!<[^>]*)\\b(${escapeRegExp(term)})\\b`, 'gi');
            html = html.replace(regex, (match) => `<span class="defined-term" data-term="${term}">${match}</span>`);
        });
        return html;
    }
    function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    // ... Any other missing listeners (MindMap, etc) same as previous restore ...
    // To save lines, I'll trust the previous logic for Mind Maps if untouched, but for completeness in a single file override:
    if (btnAddMindMap) btnAddMindMap.addEventListener('click', () => { const n = prompt("Name:"); if (n) { const id = crypto.randomUUID(); mindMapsData.push({ id, name: n, content: { id: 'root', text: n, children: [] } }); saveMindMapsData(); renderMindMapList(); loadMindMap(id); } });
    function renderMindMapList() {
        mindMapList.innerHTML = '';
        mindMapsData.forEach(map => {
            const li = createTreeItem(map.name, 'topic', false, map.id, 'mindmap');
            li.querySelector('.nav-header').onclick = () => loadMindMap(map.id);
            mindMapList.appendChild(li);
        });
    }
    function loadMindMap(id) {
        const map = mindMapsData.find(m => m.id === id); if (!map) return;
        currentMindMapId = id; currentNoteId = null; currentDeckId = null; currentQuizId = null;
        docTitle.textContent = map.name;
        noteEditorContainer.classList.add('hidden'); mindMapContainer.classList.remove('hidden'); flashcardListContainer.classList.add('hidden'); mcqContainer.classList.add('hidden');
        mindMapBuilder.innerHTML = ''; renderBuilder(map.content, mindMapBuilder); tabBtns[0].click(); renderMindMapList();
    }
    function renderBuilder(node, container) {
        container.innerHTML = '';
        const h = document.createElement('div'); h.className = 'builder-header';
        const i = document.createElement('input'); i.className = 'builder-input'; i.value = node.text; i.oninput = (e) => { node.text = e.target.value; saveMindMapsData(); };
        const a = document.createElement('button'); a.className = 'builder-btn add'; a.innerHTML = '+'; a.onclick = () => { node.children.push({ id: crypto.randomUUID(), text: 'New', children: [] }); saveMindMapsData(); renderBuilder(node, container); };
        h.appendChild(i); h.appendChild(a);
        if (node.id !== 'root') { const d = document.createElement('button'); d.className = 'builder-btn delete'; d.innerHTML = 'x'; d.onclick = () => { deleteNodeFromTree(currentMindMapId, node.id); }; h.appendChild(d); }
        container.appendChild(h);
        if (node.children) { const c = document.createElement('div'); c.className = 'builder-item'; node.children.forEach(x => { const w = document.createElement('div'); w.style.marginBottom = '0.5rem'; renderBuilder(x, w); c.appendChild(w); }); container.appendChild(c); }
    }
    function deleteNodeFromTree(mapId, nodeId) {
        const map = mindMapsData.find(m => m.id === mapId);
        function rm(p, i) { const idx = p.children.findIndex(x => x.id === i); if (idx !== -1) { p.children.splice(idx, 1); return true; } for (const c of p.children) if (rm(c, i)) return true; return false; }
        rm(map.content, nodeId); saveMindMapsData(); mindMapBuilder.innerHTML = ''; renderBuilder(map.content, mindMapBuilder);
    }
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active');
            tabPanes.forEach(p => p.classList.add('hidden')); document.getElementById(`tab-${target}`).classList.remove('hidden');
            if (target === 'visual' && currentMindMapId) {
                const map = mindMapsData.find(m => m.id === currentMindMapId);
                if (map) renderMermaidGraph(map.content);
            }
        });
    });
    function renderMermaidGraph(root) {
        let code = "graph TD;\nclassDef default fill:#2d3436,stroke:#6c5ce7,stroke-width:2px,color:#fff;\n";
        function trav(n) {
            const pid = n.text.replace(/[^a-z0-9]/gi, '_') + "_" + n.id.substr(0, 4); code += `${pid}["${n.text}"];\n`;
            if (n.children) n.children.forEach(c => { const cid = c.text.replace(/[^a-z0-9]/gi, '_') + "_" + c.id.substr(0, 4); code += `${pid}-->${cid};\n`; trav(c); });
        }
        trav(root);
        mermaidOutput.innerHTML = code; mermaidOutput.removeAttribute('data-processed');
        try { mermaid.init(undefined, mermaidOutput, (svgCode) => { const svg = mermaidOutput.querySelector('svg'); if (svg) { svg.style.width = '100%'; svg.style.height = '100%'; if (panZoomInstance) panZoomInstance.destroy(); panZoomInstance = svgPanZoom(svg, { zoomEnabled: true, fit: true, center: true }); } }); } catch (e) { }
    }

    if (btnResetZoom) btnResetZoom.addEventListener('click', () => {
        if (panZoomInstance) {
            panZoomInstance.reset();
            panZoomInstance.fit();
            panZoomInstance.center();
        }
    });

    // Flashcard Render List View 
    function renderFlashcardListView(deck) {
        fcTableBody.innerHTML = '';
        deck.cards.forEach(card => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${scanTextForTerms(card.front)}</td><td>${scanTextForTerms(card.back)}</td><td>${scanTextForTerms(card.explanation)}</td>`;
            fcTableBody.appendChild(tr);
        });
    }

    if (btnStartStudy) btnStartStudy.addEventListener('click', () => {
        flashcardListContainer.classList.add('hidden');
        flashcardPlayerContainer.classList.remove('hidden');
        currentCardIndex = 0;
        renderStudyCard();
    });

    if (btnExitStudy) btnExitStudy.addEventListener('click', () => {
        flashcardPlayerContainer.classList.add('hidden');
        flashcardListContainer.classList.remove('hidden');
    });

    function renderStudyCard() {
        let deck = null;
        for (const l of flashcardsApp.lessons) for (const t of l.topics) { const d = t.decks.find(x => x.id === currentDeckId); if (d) { deck = d; break; } }
        if (!deck || !deck.cards[currentCardIndex]) return;

        const card = deck.cards[currentCardIndex];
        const isFlipped = false;

        flashcardScene.innerHTML = `
            <div class="flashcard" onclick="this.classList.toggle('flip')">
                <div class="flashcard-face flashcard-front">
                    <div class="fc-label">Front</div>
                    <div class="fc-content-text">${scanTextForTerms(card.front)}</div>
                </div>
                <div class="flashcard-face flashcard-back">
                    <div class="fc-label">Back</div>
                    <div class="fc-content-text">${scanTextForTerms(card.back)}</div>
                    ${card.explanation ? `<div class="fc-explanation">${scanTextForTerms(card.explanation)}</div>` : ''}
                </div>
            </div>
        `;

        fcProgress.textContent = `${currentCardIndex + 1} / ${deck.cards.length}`;
        btnPrevCard.disabled = currentCardIndex === 0;
        btnNextCard.disabled = currentCardIndex === deck.cards.length - 1;
        btnPrevCard.style.opacity = currentCardIndex === 0 ? '0.5' : '1';
        btnNextCard.style.opacity = currentCardIndex === deck.cards.length - 1 ? '0.5' : '1';
    }

    if (btnPrevCard) btnPrevCard.addEventListener('click', () => { if (currentCardIndex > 0) { currentCardIndex--; renderStudyCard(); } });
    if (btnNextCard) btnNextCard.addEventListener('click', () => { if (currentCardIndex < 999) { currentCardIndex++; renderStudyCard(); } });

    // Note Upload Modal Logic (Final Ensure)
    if (lessonSelect) lessonSelect.addEventListener('change', () => {
        const lessonId = lessonSelect.value;
        if (!lessonId) { topicSelect.innerHTML = '<option value="">-- First Choose Lesson --</option>'; topicSelect.disabled = true; return; }
        const lesson = appData.lessons.find(l => l.id === lessonId);
        topicSelect.innerHTML = '<option value="">-- Choose Topic --</option>'; topicSelect.disabled = false;
        lesson.topics.forEach(t => { const opt = document.createElement('option'); opt.value = t.id; opt.textContent = t.name; topicSelect.appendChild(opt); });
    });
    if (btnCancelUpload) btnCancelUpload.addEventListener('click', () => { uploadModal.classList.add('hidden'); modalOverlay.classList.add('hidden'); fileInputModal.value = ''; });
    if (fileInputModal) fileInputModal.addEventListener('change', (e) => {
        const file = e.target.files[0]; const topicId = topicSelect.value;
        if (!topicId || !file) return;
        uploadModal.classList.add('hidden'); modalOverlay.classList.add('hidden');
        const reader = new FileReader();
        reader.onload = function (evt) {
            mammoth.convertToHtml({ arrayBuffer: evt.target.result }).then(res => { const newId = createNote(topicId, file.name.replace('.docx', ''), res.value); loadNote(newId); fileInputModal.value = ''; }).catch(err => console.error(err));
        };
        reader.readAsArrayBuffer(file);
    });

});
