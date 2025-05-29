let book = null;
let storyKey = null;
let currentNodeKey = null;

// --- DOM ELEMENTS ---
const coverImg = document.getElementById('cover-img');
const bookTitle = document.getElementById('book-title');
const chapterTitle = document.getElementById('chapter-title');
const audioPlayer = document.getElementById('audio-player');
const choicesDiv = document.getElementById('choices');

// --- LOAD BOOK FROM JSON ---
async function loadBook() {
    const response = await fetch('input.json');
    const json = await response.json();
    // Берём первую ключевую историю (RE_Hearsed)
    const keys = Object.keys(json);
    if(keys.length === 0) {
        alert('Empty input.json');
        return;
    }
    storyKey = keys[0];
    book = json[storyKey];
    currentNodeKey = book.start;
    renderNode(currentNodeKey);
}

function renderNode(key) {
    const node = book.nodes[key];
    if (!node) {
        alert('Node 1' + key + '\u00bb не найдена в истории.');
        return;
    }
    currentNodeKey = key;

    // Update book info
    coverImg.src = book.cover || '';
    bookTitle.textContent = book.title || storyKey || 'Untitled';
    chapterTitle.textContent = node.text || '';

    // Setup audio
    audioPlayer.src = node.audio || '';
    audioPlayer.currentTime = 0;
    if (node.audio) audioPlayer.play();

    // Clear and hide choices initially
    choicesDiv.innerHTML = '';
    choicesDiv.classList.add('hidden');
}

// When node finishes, present choices if available
audioPlayer.addEventListener('ended', () => {
    if (!book) return;
    const node = book.nodes[currentNodeKey];
    if (node.choices && node.choices.length > 0) {
        choicesDiv.classList.remove('hidden');
        choicesDiv.innerHTML = '';
        node.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.textContent = choice.text || '...';
            btn.onclick = () => {
                renderNode(choice.next);
            };
            choicesDiv.appendChild(btn);
        });
    }
});

// Start loading book
loadBook();
