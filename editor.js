// editor.js
// ЛОГИКА РЕДАКТОРА + ВИЗУАЛИЗАЦИЯ ДЛЯ JSON-ИСТОРИЙ (ПОЛНАЯ ПЕРЕРАБОТКА)

let story = null;
let currentNodeKey = null;

const nodeUl = document.getElementById('node-ul');
const addNodeBtn = document.getElementById('add-node');
const nodeSearch = document.getElementById('node-search');
const nodeEditor = document.getElementById('node-editor');
const editNodeName = document.getElementById('edit-node-name');
const editNodeAudio = document.getElementById('edit-node-audio');
const editNodeText = document.getElementById('edit-node-text');
const choicesUl = document.getElementById('choices-ul');
const addChoiceBtn = document.getElementById('add-choice');
const saveNodeBtn = document.getElementById('save-node');
const deleteNodeBtn = document.getElementById('delete-node');

const storyTitle = document.getElementById('story-title');
const storyCover = document.getElementById('story-cover');
const storyStart = document.getElementById('story-start');

const newStoryBtn = document.getElementById('new-story');
const importJson = document.getElementById('import-json');
const exportJson = document.getElementById('export-json');
const statusEl = document.getElementById('status');

const storyGraphDiv = document.getElementById('story-graph');
let cy = null;

function blankStory() {
    return {
        game_name: {
            title: '',
            cover: '',
            start: '',
            nodes: {}
        }
    }
}

function renderNodesList(filter = '') {
    nodeUl.innerHTML = '';
    if (!story) return;
    const keys = Object.keys(story.game_name.nodes).filter(k =>
        k.toLowerCase().includes(filter.toLowerCase())
    );
    keys.forEach(key => {
        const li = document.createElement('li');
        li.textContent = key;
        li.className = (currentNodeKey === key) ? 'selected' : '';
        li.onclick = () => {
            openNodeEditor(key);
        };
        nodeUl.appendChild(li);
    });
}

function renderStoryGlobals() {
    if (!story) return;
    storyTitle.value = story.game_name.title || '';
    storyCover.value = story.game_name.cover || '';
    renderStartSelect();
}

function renderStartSelect() {
    if (!story) return;
    const nodes = story.game_name.nodes;
    storyStart.innerHTML = '';
    Object.keys(nodes).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key;
        storyStart.appendChild(opt);
    });
    storyStart.value = story.game_name.start || '';
}

function openNodeEditor(key) {
    currentNodeKey = key;
    const node = story.game_name.nodes[key];
    nodeEditor.style.display = '';
    editNodeName.value = key;
    editNodeAudio.value = node.audio || '';
    editNodeText.value = node.text || '';
    renderChoices(node.choices);
    highlightSelectedNode();
    fitAndFocusGraphOnNode(key);
}

function highlightSelectedNode() {
    Array.from(nodeUl.children).forEach(li => {
        if (li.textContent === currentNodeKey) {
            li.classList.add('selected');
        } else {
            li.classList.remove('selected');
        }
    });
    // граф: подсветить выбранную вершину
    if (cy && currentNodeKey) {
        cy.elements().removeClass('active-selected');
        const n = cy.$id(currentNodeKey);
        if (n) n.addClass('active-selected');
    }
}

function renderChoices(choices) {
    choicesUl.innerHTML = '';
    choices.forEach((choice, idx) => {
        const li = document.createElement('li');
        li.className = 'choice-item';

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = choice.text;
        textInput.placeholder = 'Текст выбора...';
        textInput.oninput = () => {
            choice.text = textInput.value;
        };
        li.appendChild(textInput);

        const nextInput = document.createElement('input');
        nextInput.type = 'text';
        nextInput.value = choice.next;
        nextInput.placeholder = 'ID целевого узла...';
        nextInput.oninput = () => {
            choice.next = nextInput.value;
        };
        li.appendChild(nextInput);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Удалить';
        removeBtn.onclick = () => {
            choices.splice(idx, 1);
            renderChoices(choices);
            renderStoryGraph();
        };
        li.appendChild(removeBtn);

        choicesUl.appendChild(li);
    });
}

function closeNodeEditor() {
    nodeEditor.style.display = 'none';
    currentNodeKey = null;
    highlightSelectedNode();
}

addNodeBtn.onclick = () => {
    if (!story) return;
    let newKey = prompt('ID нового узла? (латиницей, уникально)');
    if (!newKey) return;
    if (story.game_name.nodes[newKey]) {
        alert('Узел с таким именем уже есть!');
        return;
    }
    story.game_name.nodes[newKey] = {
        audio: '',
        text: '',
        choices: []
    };
    renderNodesList(nodeSearch.value);
    openNodeEditor(newKey);
    renderStartSelect();
    renderStoryGraph();
}

nodeSearch.oninput = () => {
    renderNodesList(nodeSearch.value);
};

saveNodeBtn.onclick = () => {
    if (!story || !currentNodeKey) return;
    let node = story.game_name.nodes[currentNodeKey];
    // Смена ключа
    if (editNodeName.value !== currentNodeKey) {
        if (story.game_name.nodes[editNodeName.value]) {
            alert('Узел с таким именем уже есть!');
            return;
        }
        story.game_name.nodes[editNodeName.value] = node;
        delete story.game_name.nodes[currentNodeKey];
        if (story.game_name.start === currentNodeKey) {
            story.game_name.start = editNodeName.value;
        }
        Object.values(story.game_name.nodes).forEach(n => {
            n.choices.forEach(c => {
                if (c.next === currentNodeKey) c.next = editNodeName.value;
            });
        });
        currentNodeKey = editNodeName.value;
    }
    node.audio = editNodeAudio.value;
    node.text = editNodeText.value;
    renderNodesList(nodeSearch.value);
    renderStartSelect();
    renderStoryGraph();
    status('Сохранено');
};

deleteNodeBtn.onclick = () => {
    if (!story || !currentNodeKey) return;
    if (!confirm('Удалить этот узел?')) return;
    Object.values(story.game_name.nodes).forEach(n => {
        n.choices = n.choices.filter(c => c.next !== currentNodeKey);
    });
    delete story.game_name.nodes[currentNodeKey];
    closeNodeEditor();
    renderNodesList(nodeSearch.value);
    renderStartSelect();
    renderStoryGraph();
};

addChoiceBtn.onclick = () => {
    if (!story || !currentNodeKey) return;
    let node = story.game_name.nodes[currentNodeKey];
    node.choices.push({ text: '', next: '' });
    renderChoices(node.choices);
    renderStoryGraph();
};

storyTitle.oninput = () => { if (story) story.game_name.title = storyTitle.value; };
storyCover.oninput = () => { if (story) story.game_name.cover = storyCover.value; };
storyStart.onchange = () => { if (story) story.game_name.start = storyStart.value; renderStoryGraph(); };

newStoryBtn.onclick = () => {
    if (!confirm('Начать новую историю? Текущая будет потеряна.')) return;
    story = blankStory();
    renderNodesList();
    renderStoryGlobals();
    closeNodeEditor();
    renderStoryGraph();
};

importJson.onchange = (e) => {
    if (!e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            let obj = JSON.parse(evt.target.result);
            if (!obj.game_name || !obj.game_name.nodes) {
                throw new Error('Файл не похож на input.json');
            }
            story = obj;
            renderNodesList();
            renderStoryGlobals();
            closeNodeEditor();
            renderStoryGraph();
            status('Файл импортирован');
        } catch (err) {
            status('Ошибка: ' + err.message);
        }
    };
    reader.readAsText(file);
};

exportJson.onclick = () => {
    if (!story) return;
    const str = JSON.stringify(story, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'input.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 10);
};

function status(msg) {
    statusEl.textContent = msg;
    setTimeout(() => { statusEl.textContent = ''; }, 2000);
}

function fitAndFocusGraphOnNode(key) {
    if (cy && key) {
        cy.fit(cy.$id(key), 100);
        cy.$id(key).select();
    }
}

function renderStoryGraph() {
    if (!story || !story.game_name.nodes) return;
    if (cy) { cy.destroy(); cy = null; }
    const nodes = story.game_name.nodes;
    let elements = [];
    Object.keys(nodes).forEach(k => {
        elements.push({
            data: { id: k, label: nodes[k].text ? k + "\n" + nodes[k].text.slice(0, 28) : k },
            classes: [ (k === story.game_name.start ? 'startnode' : ''), (k === currentNodeKey ? 'active-selected' : '') ].join(' ')
        });
    });
    Object.entries(nodes).forEach(([from, node]) => {
        (node.choices || []).forEach(choice => {
            if (choice.next && nodes[choice.next]) {
                elements.push({ data: { source: from, target: choice.next } });
            }
        });
    });
    cy = cytoscape({
        container: storyGraphDiv,
        elements,
        boxSelectionEnabled: false,
        autoungrabify: true,
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#6092e8',
                    'label': 'data(label)',
                    'font-size': 12,
                    'color': '#fff',
                    'border-width': 2,
                    'border-color': '#37576b',
                    'text-halign': 'center',
                    'text-valign': 'center',
                    'width': 75,
                    'height': 48,
                    'shape': 'roundrectangle',
                    'text-wrap': 'wrap',
                    'text-max-width': 98
                }
            },
            {
                selector: 'node.startnode',
                style: {
                    'background-color': '#43c37b',
                    'border-color': '#2b8855',
                }
            },
            {
                selector: 'node.active-selected',
                style: {
                    'border-width': 5,
                    'border-color': '#e6c023',
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 3,
                    'line-color': '#88b3ec',
                    'target-arrow-color': '#88b3ec',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                }
            }
        ],
        layout: {
            name: 'dagre',
            rankDir: 'LR',
            nodeSep: 70,
            edgeSep: 36,
            rankSep: 80,
            animate: true,
            fit: true,
            padding: 20
        },
        minZoom: 0.15,
        maxZoom: 2.3
    });
    // Акцент при старте
    if(currentNodeKey && cy.$id(currentNodeKey).length) {
        fitAndFocusGraphOnNode(currentNodeKey);
    }
    // Клик по узлу -> показать в редакторе
    cy.on('tap', 'node', function(evt) {
        const nid = evt.target.id();
        openNodeEditor(nid);
    });
}

window.onload = function() {
    story = blankStory();
    renderNodesList();
    renderStoryGlobals();
    renderStoryGraph();
};
