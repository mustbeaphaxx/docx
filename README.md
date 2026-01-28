# Docx Notes & Dictionary

A comprehensive note-taking application with Mind Map, Flashcard, and MCQ capabilities.

## Setup & Running

Because this application uses **ES Modules** (for Firebase integration) and specific browser APIs, it **must be run via a local web server**. Opening `index.html` directly in the file explorer will likely result in CORS errors.

### Option 1: Python (Recommended for macOS/Linux)
You likely already have Python installed. Open your terminal in this directory and run:

```bash
python3 -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 2: Node.js (npx)
If you have Node.js installed:

```bash
npx serve .
```

## Features
*   **Notes**: Rich text editing with cross-linking.
*   **Mind Maps**: Visualize concepts with Mermaid.js.
*   **Flashcards**: spaced repetition study mode.
*   **MCQs**: Quiz mode with persistent scores.
*   **Dictionary**: Auto-detected terms and definitions.
*   **Cloud Sync**: Data persists via Firebase Firestore.

## Deployment

### Option 1: Firebase Hosting (Recommended)
Since you provided a Firebase configuration, this is the easiest way to host.

**If you don't have Node.js/npm installed:**
Run this command in your terminal to install the Firebase tool directly:
```bash
curl -sL https://firebase.tools | bash
```

**If you have npm:**
```bash
npm install -g firebase-tools
```

**Then deploy:**
1.  Login: `firebase login`
2.  Deploy: `firebase deploy`

It will give you a URL like `https://docx-f22ae.web.app`.

### Option 2: GitHub Pages
1.  Go to Settings > Pages > Select `main` branch.

