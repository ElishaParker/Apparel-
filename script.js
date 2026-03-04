// --- State Management ---
const state = {
    image: null,
    logo: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0, // in degrees
        scale: 1,
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0
    },
    view: {
        scale: 1,
        panX: 0,
        panY: 0,
        isPanning: false,
        lastMouseX: 0,
        lastMouseY: 0
    },
    activeTool: 'select' // 'select' or 'pan'
};

const container = document.getElementById('canvasContainer');
const canvas = document.getElementById('designCanvas');
const ctx = canvas.getContext('2d');
const resizeHandle = document.getElementById('resizeHandle');

// UI Elements
const propertiesPanel = document.getElementById('propertiesPanel');
const scaleSlider = document.getElementById('scaleSlider');
const rotateSlider = document.getElementById('rotateSlider');
const scaleValue = document.getElementById('scaleValue');
const rotateValue = document.getElementById('rotateValue');

// --- Initialization ---
function initCanvas() {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    
    // Center logo initially if image exists
    if (state.image) {
        state.logo.x = (canvas.width / 2) - (state.logo.width / 2);
        state.logo.y = (canvas.height / 2) - (state.logo.height / 2);
    }
    draw();
}

// --- Drawing Logic (The Engine) ---
function draw() {
    // 1. Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Apply View Transformations (Pan & Zoom)
    ctx.save();
    
    // Pan (translate)
    ctx.translate(container.offsetWidth / 2 + state.view.panX, container.offsetHeight / 2 + state.view.panY);
    
    // Zoom (scale around center)
    ctx.scale(state.view.scale, state.view.scale);

    // 3. Draw Background (The "Apparel" part - simplified as a white shirt for now)
    // Draw a shirt shape or just a background color
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(-400, -300, 800, 600); // Background area
    drawShirtOutline(-400, -300, 800, 600);

    // 4. Draw Logo
    if (state.image) {
        ctx.save();
        
        // Move to logo position
        ctx.translate(state.logo.x + state.logo.width / 2, state.logo.y + state.logo.height / 2);
        ctx.rotate(state.logo.rotation * (Math.PI / 180));
        ctx.translate(-state.logo.width / 2, -state.logo.height / 2);

        // Apply Scale
        ctx.scale(state.logo.scale, state.logo.scale);

        // Draw the image
        ctx.drawImage(state.image, 0, 0, state.logo.width, state.logo.height);

        // Draw Selection Box
        ctx.strokeStyle = "#4f46e5"; // Purple
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(0, 0, state.logo.width, state.logo.height);
        
        ctx.restore();
    }

    ctx.restore();
}

// Helper to draw a shirt shape
function drawShirtOutline(x, y, w, h) {
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 5;
    ctx.beginPath();
    // Neck
    ctx.moveTo(x + w/2, y);
    ctx.lineTo(x + w/2, y + 60);
    ctx.lineTo(x + w/2 - 40, y + 40);
    // Left Shoulder
    ctx.lineTo(x, y + 100);
    // Left Body
    ctx.lineTo(x, y + h);
    // Right Body
    ctx.lineTo(x + w, y + h);
    // Right Shoulder
    ctx.lineTo(x + w - 40, y + 40);
    // Right Neck
    ctx.lineTo(x + w/2 + 40, y + 60);
    ctx.lineTo(x + w/2, y);
    ctx.stroke();
}

// --- Upload Logic ---
document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
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
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
});

function handleImageUpload(e) {
    if (e.target.files.length > 0) processFile(e.target.files[0]);
}

function processFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        state.image = new Image();
        state.image.onload = () => {
            // Calculate aspect ratio to fit
            const aspectRatio = state.image.width / state.image.height;
            state.logo.width = 200;
            state.logo.height = 200 / aspectRatio;
            
            // Center the image
            state.logo.x = (canvas.width / 2) - (state.logo.width / 2);
            state.logo.y = (canvas.height / 2) - (state.logo.height / 2);
            
            // Reset properties
            state.logo.scale = 1;
            state.logo.rotation = 0;
            updateUI();
            
            // Show properties panel
            propertiesPanel.style.display = 'block';
            draw();
        };
        state.image.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// --- Interaction Logic (Dragging & Panning) ---
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - (container.offsetWidth / 2 + state.view.panX);
    const mouseY = e.clientY - rect.top - (container.offsetHeight / 2 + state.view.panY);

    // 1. Check if clicking the logo
    // We must account for rotation by checking the bounding box at the rotated angle.
    // For simplicity in this version, we check the unrotated bounding box first.
    // For a perfect rotation select, we'd use a point-rotation algorithm.
    
    // Check simple bounds
    if (state.image) {
        const logoX = state.logo.x;
        const logoY = state.logo.y;
        const logoW = state.logo.width;
        const logoH = state.logo.height;

        if (mouseX >= logoX && mouseX <= logoX + logoW &&
            mouseY >= logoY && mouseY <= logoY + logoH) {
            
            state.logo.isDragging = true;
            state.logo.dragOffsetX = mouseX - state.logo.x;
            state.logo.dragOffsetY = mouseY - state.logo.y;
            container.style.cursor = 'move';
            return;
        }
    }

    // 2. If not logo, check tool mode
    if (state.activeTool === 'pan' || e.button === 1 || e.button === 2) {
        state.view.isPanning = true;
        state.view.lastMouseX = e.clientX;
        state.view.lastMouseY = e.clientY;
        container.style.cursor = 'grabbing';
    }
});

window.addEventListener('mousemove', (e) => {
    if (state.logo.isDragging) {
        const rect = canvas.getBoundingClientRect();
        // Calculate mouse position relative to canvas internal coordinate system
        const mouseX = e.clientX - rect.left - (container.offsetWidth / 2 + state.view.panX);
        const mouseY = e.clientY - rect.top - (container.offsetHeight / 2 + state.view.panY);
        
        state.logo.x = mouseX - state.logo.dragOffsetX;
        state.logo.y = mouseY - state.logo.dragOffsetY;
        
        updateUIValues();
        draw();
    } 
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
    state.logo.isDragging = false;
    state.view.isPanning = false;
    container.style.cursor = 'default';
});

// --- Zoom Logic (Wheel) ---
container.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    
    const newScale = Math.min(Math.max(0.1, state.view.scale + delta), 5);
    
    // Simple zoom logic: adjust scale
    // Advanced zoom would adjust panX/Y to zoom towards mouse pointer
    state.view.scale = newScale;
    
    draw();
});

// --- Resize Logic ---
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
        
        initCanvas(); // Re-calculate internal resolution
        updateUIValues();
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});

// --- Properties & Tools ---
function updateUI() {
    scaleSlider.value = state.logo.scale;
    rotateSlider.value = state.logo.rotation;
    updateUIValues();
}

function updateUIValues() {
    scaleValue.textContent = `${Math.round(state.logo.scale * 100)}%`;
    rotateValue.textContent = `${Math.round(state.logo.rotation)}°`;
}

// Property Sliders
scaleSlider.addEventListener('input', (e) => {
    state.logo.scale = parseFloat(e.target.value);
    updateUIValues();
    draw();
});

rotateSlider.addEventListener('input', (e) => {
    state.logo.rotation = parseFloat(e.target.value);
    updateUIValues();
    draw();
});

// Tool Switching
const toolPanBtn = document.getElementById('toolPan');
const toolSelectBtn = document.getElementById('toolSelect');

toolPanBtn.addEventListener('click', () => {
    state.activeTool = 'pan';
    toolPanBtn.classList.add('active');
    toolSelectBtn.classList.remove('active');
    container.style.cursor = 'grab';
});

toolSelectBtn.addEventListener('click', () => {
    state.activeTool = 'select';
    toolSelectBtn.classList.add('active');
    toolPanBtn.classList.remove('active');
    container.style.cursor = 'default';
});

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        state.activeTool = 'pan';
        container.style.cursor = 'grab';
        toolPanBtn.classList.add('active');
        toolSelectBtn.classList.remove('active');
    }
    
    // Rotate with arrow keys
    if (e.code === 'ArrowLeft') { state.logo.rotation -= 15; updateUI(); draw(); }
    if (e.code === 'ArrowRight') { state.logo.rotation += 15; updateUI(); draw(); }
    if (e.code === 'ArrowUp') { state.logo.scale += 0.1; updateUI(); draw(); }
    if (e.code === 'ArrowDown') { state.logo.scale -= 0.1; updateUI(); draw(); }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        state.activeTool = 'select';
        container.style.cursor = 'default';
        toolPanBtn.classList.remove('active');
        toolSelectBtn.classList.add('active');
    }
});

// Layer Management (Simplified)
document.getElementById('btnBringFront').addEventListener('click', () => {
    // In a multi-layer system, this would push to top of array.
    // Here, we just ensure it's drawn last (which it is by default in this loop).
    console.log("Logo is on top layer.");
});

document.getElementById('btnSendBack').addEventListener('click', () => {
    console.log("Logo sent to back (behind shirt).");
    // Since we draw shirt then logo, it's always on top. 
    // To actually send it behind, we'd need to restructure draw() to draw layers array.
});

// --- Export Feature ---
document.getElementById('exportBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'my-design.png';
    link.href = canvas.toDataURL();
    link.click();
});

// Initialize
initCanvas();
updateUI();
