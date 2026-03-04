// --- State Management ---
const state = {
    layers: [], // Array of layer objects
    selectedLayerId: null,
    view: {
        scale: 1,
        panX: 0,
        panY: 0
    },
    activeTool: 'select' 
};

// Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const container = document.getElementById('canvasContainer');
const canvas = document.getElementById('designCanvas');
const ctx = canvas.getContext('2d');
const layerListEl = document.getElementById('layerList');
const activeLayerProps = document.getElementById('activeLayerProps');

// --- Initialization ---
function initCanvas() {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    draw();
    updateLayerList();
}

// Helper to create a unique ID
function generateId() {
    return 'layer-' + Date.now();
}

// --- Layer Management Functions ---

function addLayer(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Calculate initial size to fit in canvas
                const aspectRatio = img.width / img.height;
                let newWidth = 200;
                let newHeight = 200 / aspectRatio;

                // Center the layer
                const x = (CANVAS_WIDTH / 2) - (newWidth / 2);
                const y = (CANVAS_HEIGHT / 2) - (newHeight / 2);

                const newLayer = {
                    id: generateId(),
                    image: img,
                    name: file.name,
                    x: x,
                    y: y,
                    width: newWidth,
                    height: newHeight,
                    scale: 1,
                    rotation: 0,
                    opacity: 1,
                    visible: true
                };

                state.layers.push(newLayer);
                selectLayer(newLayer.id);
                resolve();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function deleteLayer(id) {
    const index = state.layers.findIndex(l => l.id === id);
    if (index !== -1) {
        state.layers.splice(index, 1);
        if (state.selectedLayerId === id) {
            state.selectedLayerId = null;
            activeLayerProps.style.display = 'none';
        }
        draw();
        updateLayerList();
    }
}

function selectLayer(id) {
    state.selectedLayerId = id;
    updateLayerList();
    updateActiveLayerProps();
}

function moveLayer(id, direction) {
    const index = state.layers.findIndex(l => l.id === id);
    if (index === -1) return;

    if (direction === 'up' && index < state.layers.length - 1) {
        [state.layers[index], state.layers[index + 1]] = [state.layers[index + 1], state.layers[index]];
    } else if (direction === 'down' && index > 0) {
        [state.layers[index], state.layers[index - 1]] = [state.layers[index - 1], state.layers[index]];
    }
    
    updateLayerList();
    draw();
}

// --- Drawing Logic (The Engine) ---
function draw() {
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply View Transformations (Pan & Zoom)
    ctx.save();
    
    // Center the canvas view
    ctx.translate(CANVAS_WIDTH / 2 + state.view.panX, CANVAS_HEIGHT / 2 + state.view.panY);
    ctx.scale(state.view.scale, state.view.scale);
    
    // Translate back to start drawing from 0,0 relative to the new center
    ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);

    // 1. Draw Background Layer (The Shirt)
    drawShirtBackground();

    // 2. Draw All Layers (Top to Bottom order in array = Back to Front visually)
    // In 2D Canvas, the last draw is on top.
    state.layers.forEach(layer => {
        if (!layer.visible) return;

        // Save context for this specific layer
        ctx.save();
        
        // Move to layer position
        ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
        
        // Apply transforms
        ctx.rotate(layer.rotation * (Math.PI / 180));
        ctx.scale(layer.scale, layer.scale);
        
        // Apply Opacity
        ctx.globalAlpha = layer.opacity;

        // Draw Image
        ctx.drawImage(layer.image, 0, 0, layer.width, layer.height);

        // Draw Selection Border if this layer is selected
        if (layer.id === state.selectedLayerId) {
            ctx.strokeStyle = "#4f46e5"; // Purple
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(0, 0, layer.width, layer.height);
            
            // Draw resize handle at bottom right of selection
            ctx.fillStyle = "white";
            ctx.fillRect(layer.width - 6, layer.height - 6, 6, 6);
        }

        ctx.restore();
    });

    ctx.restore();
}

function drawShirtBackground() {
    const x = 0;
    const y = 0;
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // Base shirt color
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(x, y, w, h);

    // Shirt Outline
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    // Neck
    ctx.moveTo(w/2, y);
    ctx.lineTo(w/2, y + 60);
    ctx.lineTo(w/2 - 40, y + 40);
    // Left Shoulder
    ctx.lineTo(x, y + 100);
    // Left Body
    ctx.lineTo(x, y + h);
    // Right Body
    ctx.lineTo(x + w, y + h);
    // Right Shoulder
    ctx.lineTo(x + w - 40, y + 40);
    // Right Neck
    ctx.lineTo(w/2 + 40, y + 60);
    ctx.lineTo(w/2, y);
    ctx.stroke();
}

// --- UI Updates ---

function updateLayerList() {
    layerListEl.innerHTML = '';
    
    if (state.layers.length === 0) {
        layerListEl.innerHTML = '<div class="empty-layer-msg">No layers added yet. Upload an image to start.</div>';
        activeLayerProps.style.display = 'none';
        document.getElementById('layerCount').textContent = '0';
        return;
    }

    // We need to render from back to front (bottom of array to top)
    // So we iterate normally (0 to length-1)
    state.layers.forEach(layer => {
        const layerEl = document.createElement('div');
        layerEl.className = `layer-item ${layer.id === state.selectedLayerId ? 'selected' : ''}`;
        layerEl.onclick = () => selectLayer(layer.id);

        // Layer Header (Name + Opacity Preview)
        const nameEl = document.createElement('div');
        nameEl.className = 'layer-item-header';
        nameEl.innerHTML = `
            <i class="fa-solid fa-image" style="color: #9ca3af;"></i>
            <span class="layer-name">${layer.name}</span>
            <span class="layer-opacity">${Math.round(layer.opacity * 100)}%</span>
        `;

        // Layer Actions (Move Up, Down, Delete)
        const actionsEl = document.createElement('div');
        actionsEl.className = 'layer-item-actions';

        // Move Up Button
        const btnUp = document.createElement('button');
        btnUp.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        btnUp.title = 'Move Up';
        btnUp.onclick = (e) => {
            e.stopPropagation(); // Prevent selection click
            moveLayer(layer.id, 'up');
        };

        // Move Down Button
        const btnDown = document.createElement('button');
        btnDown.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
        btnDown.title = 'Move Down';
        btnDown.onclick = (e) => {
            e.stopPropagation();
            moveLayer(layer.id, 'down');
        };

        // Delete Button
        const btnDelete = document.createElement('button');
        btnDelete.className = 'delete-btn';
        btnDelete.innerHTML = '<i class="fa-solid fa-trash"></i>';
        btnDelete.title = 'Delete Layer';
        btnDelete.onclick = (e) => {
            e.stopPropagation();
            if(confirm(`Are you sure you want to delete "${layer.name}"?`)) {
                deleteLayer(layer.id);
            }
        };

        actionsEl.appendChild(btnUp);
        actionsEl.appendChild(btnDown);
        actionsEl.appendChild(btnDelete);

        layerEl.appendChild(nameEl);
        layerEl.appendChild(actionsEl);
        layerListEl.appendChild(layerEl);
    });

    document.getElementById('layerCount').textContent = state.layers.length;
}

function updateActiveLayerProps() {
    const layer = state.layers.find(l => l.id === state.selectedLayerId);
    
    if (!layer) {
        activeLayerProps.style.display = 'none';
        return;
    }

    activeLayerProps.style.display = 'block';
    
    // Update Sliders to match selected layer
    document.getElementById('layerOpacitySlider').value = layer.opacity;
    document.getElementById('layerScaleSlider').value = layer.scale;
    
    // Set event listeners for the sliders
    const opacitySlider = document.getElementById('layerOpacitySlider');
    const scaleSlider = document.getElementById('layerScaleSlider');

    opacitySlider.oninput = (e) => {
        layer.opacity = parseFloat(e.target.value);
        document.querySelector(`.layer-item.selected .layer-opacity`).textContent = `${Math.round(layer.opacity * 100)}%`;
        draw();
    };

    scaleSlider.oninput = (e) => {
        layer.scale = parseFloat(e.target.value);
        draw();
    };
}

// --- Event Listeners (Upload & Interaction) ---

const dropZone = document.getElementById('dropZone');

// Drag and Drop Events
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
    }
});

// Click to upload
const uploadInput = document.getElementById('imageUpload');
uploadInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) processFile(e.target.files[0]);
});

function processFile(file) {
    addLayer(file).then(() => {
        updateLayerList();
        draw();
        document.getElementById('statusMessage').textContent = `Added layer: ${file.name}`;
        setTimeout(() => {
            document.getElementById('statusMessage').textContent = "Ready";
        }, 3000);
    });
}

// --- Canvas Interaction (Drag, Pan, Zoom) ---

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    
    // Calculate mouse position relative to the transformed canvas
    // This is tricky because we translate/rotate the context
    // We need to reverse the math:
    
    // 1. Offset by canvas center and pan
    let mouseX = e.clientX - rect.left - (CANVAS_WIDTH / 2 + state.view.panX);
    let mouseY = e.clientY - rect.top - (CANVAS_HEIGHT / 2 + state.view.panY);
    
    // 2. Reverse Scale
    mouseX /= state.view.scale;
    mouseY /= state.view.scale;

    // 3. Reverse Rotation (for the selected layer)
    let clickedLayerId = null;
    
    // Iterate backwards (Front to Back) to find top-most layer
    for (let i = state.layers.length - 1; i >= 0; i--) {
        const layer = state.layers[i];
        
        // Check bounds (unrotated for simplicity, or use point rotation for precision)
        // For this version, unrotated bounds check is usually sufficient for UI
        if (
            mouseX >= layer.x && mouseX <= layer.x + layer.width &&
            mouseY >= layer.y && mouseY <= layer.y + layer.height
        ) {
            clickedLayerId = layer.id;
            break;
        }
    }

    if (clickedLayerId) {
        selectLayer(clickedLayerId);
        
        // Start Dragging this layer
        const layer = state.layers.find(l => l.id === clickedLayerId);
        layer.isDragging = true;
        layer.dragOffsetX = mouseX - layer.x;
        layer.dragOffsetY = mouseY - layer.y;
        container.style.cursor = 'move';
    } else {
        // If clicked empty space, check tool mode
        if (state.activeTool === 'pan') {
            state.view.isPanning = true;
            state.view.lastMouseX = e.clientX;
            state.view.lastMouseY = e.clientY;
            container.style.cursor = 'grabbing';
        } else {
            // Deselect if clicking empty space in select mode
            selectLayer(null);
        }
    }
});

window.addEventListener('mousemove', (e) => {
    // Handle Layer Dragging
    const draggedLayer = state.layers.find(l => l.isDragging);
    if (draggedLayer) {
        const rect = canvas.getBoundingClientRect();
        let mouseX = e.clientX - rect.left - (CANVAS_WIDTH / 2 + state.view.panX);
        let mouseY = e.clientY - rect.top - (CANVAS_HEIGHT / 2 + state.view.panY);
        
        mouseX /= state.view.scale;
        mouseY /= state.view.scale;

        draggedLayer.x = mouseX - draggedLayer.dragOffsetX;
        draggedLayer.y = mouseY - draggedLayer.dragOffsetY;
        
        // Update opacity display in list
        const layerItem = document.querySelector(`.layer-item.selected .layer-opacity`);
        if (layerItem) layerItem.textContent = `${Math.round(draggedLayer.opacity * 100)}%`;
        
        draw();
    } 
    // Handle Panning
    else if (state.view.isPanning) {
        const dx = e.clientX - state.view.lastMouseX;
        const dy = e.clientY - state.view.lastMouseY;
        
        state.view.panX += dx;
        state.view.panY += dy;
        
        state.view.lastMouseX = e.clientX;
        state.view.lastMouseY = e.clientY;
        
        draw();
    }
});

window.addEventListener('mouseup', () => {
    state.layers.forEach(l => l.isDragging = false);
    state.view.isPanning = false;
    container.style.cursor = 'default';
});

// Zoom Logic
container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    
    const newScale = Math.min(Math.max(0.1, state.view.scale + delta), 10);
    state.view.scale = newScale;
    draw();
});

// Resize Logic
const resizeHandle = document.getElementById('resizeHandle');
resizeHandle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    let startX = e.clientX;
    let startY = e.clientY;
    let startWidth = container.offsetWidth;
    let startHeight = container.offsetHeight;

    const onMouseMove = (e) => {
        let newWidth = Math.max(400, startWidth + (e.clientX - startX));
        let newHeight = Math.max(300, startHeight + (e.clientY - startY));
        
        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;
        
        // We don't need to initCanvas() because canvas.width is fixed, 
        // but we might want to scale the view to fit if the container shrinks.
        // For now, we just redraw to allow panning to see the whole canvas.
        draw();
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});

// Layer Management Buttons
document.getElementById('btnMoveUp').onclick = () => {
    if (state.selectedLayerId) moveLayer(state.selectedLayerId, 'up');
};

document.getElementById('btnMoveDown').onclick = () => {
    if (state.selectedLayerId) moveLayer(state.selectedLayerId, 'down');
};

document.getElementById('btnDeleteLayer').onclick = () => {
    if (state.selectedLayerId) {
        if(confirm(`Are you sure you want to delete the selected layer?`)) {
            deleteLayer(state.selectedLayerId);
        }
    }
};

// Tool Switching
const toolPanBtn = document.getElementById('toolPan');
const toolSelectBtn = document.getElementById('toolSelect');

toolPanBtn.onclick = () => {
    state.activeTool = 'pan';
    toolPanBtn.classList.add('active');
    toolSelectBtn.classList.remove('active');
    container.style.cursor = 'grab';
};

toolSelectBtn.onclick = () => {
    state.activeTool = 'select';
    toolSelectBtn.classList.add('active');
    toolPanBtn.classList.remove('active');
    container.style.cursor = 'default';
};

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        state.activeTool = 'pan';
        container.style.cursor = 'grab';
        toolPanBtn.classList.add('active');
        toolSelectBtn.classList.remove('active');
    }
    
    // Delete selected layer with Delete key
    if (e.code === 'Delete' && state.selectedLayerId) {
        if(confirm(`Delete layer "${state.layers.find(l => l.id === state.selectedLayerId).name}"?`)) {
            deleteLayer(state.selectedLayerId);
        }
    }
    
    // Rotate with Arrow Keys
    if (state.selectedLayerId) {
        const layer = state.layers.find(l => l.id === state.selectedLayerId);
        if (e.code === 'ArrowLeft') { layer.rotation -= 15; draw(); }
        if (e.code === 'ArrowRight') { layer.rotation += 15; draw(); }
        if (e.code === 'ArrowUp') { layer.scale += 0.1; draw(); }
        if (e.code === 'ArrowDown') { layer.scale -= 0.1; draw(); }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        state.activeTool = 'select';
        container.style.cursor = 'default';
        toolPanBtn.classList.remove('active');
        toolSelectBtn.classList.add('active');
    }
});

// Global Zoom Slider
const globalZoomSlider = document.getElementById('globalZoomSlider');
globalZoomSlider.addEventListener('input', (e) => {
    state.view.scale = parseFloat(e.target.value);
    draw();
});

// Reset View
document.getElementById('btnResetView').addEventListener('click', () => {
    state.view.scale = 1;
    state.view.panX = 0;
    state.view.panY = 0;
    globalZoomSlider.value = 1;
    draw();
});

// Export
document.getElementById('exportBtn').addEventListener('click', () => {
    // Create a temporary canvas to render the final image
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = CANVAS_WIDTH;
    exportCanvas.height = CANVAS_HEIGHT;
    const exportCtx = exportCanvas.getContext('2d');
    
    // Fill with white background
    exportCtx.fillStyle = "white";
    exportCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw Shirt
    drawShirtBackground(); // This draws on the main canvas, we need to replicate the logic or use a function
    // Let's just draw a white rect for simplicity in export, or copy the drawShirtBackground logic
    // For a robust export, we'd put all drawing logic into functions that accept a context
    exportCtx.strokeStyle = "#e5e7eb";
    exportCtx.lineWidth = 8;
    exportCtx.lineCap = "round";
    exportCtx.beginPath();
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;
    exportCtx.moveTo(w/2, 0);
    exportCtx.lineTo(w/2, 60);
    exportCtx.lineTo(w/2 - 40, 40);
    exportCtx.lineTo(0, 100);
    exportCtx.lineTo(0, h);
    exportCtx.lineTo(w, h);
    exportCtx.lineTo(w - 40, 40);
    exportCtx.lineTo(w/2 + 40, 60);
    exportCtx.lineTo(w/2, 0);
    exportCtx.stroke();

    // Draw Layers
    state.layers.forEach(layer => {
        if (!layer.visible) return;
        
        exportCtx.save();
        exportCtx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
        exportCtx.rotate(layer.rotation * (Math.PI / 180));
        exportCtx.scale(layer.scale, layer.scale);
        exportCtx.globalAlpha = layer.opacity;
        exportCtx.drawImage(layer.image, 0, 0, layer.width, layer.height);
        exportCtx.restore();
    });

    // Trigger Download
    const link = document.createElement('a');
    link.download = 'my-design.png';
    link.href = exportCanvas.toDataURL();
    link.click();
    
    document.getElementById('statusMessage').textContent = "Design exported!";
    setTimeout(() => {
        document.getElementById('statusMessage').textContent = "Ready";
    }, 3000);
});

// Initialize
initCanvas();
updateLayerList();
