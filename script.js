document.getElementById('imageUpload').addEventListener('change', handleImageUpload);

let canvas = document.getElementById('designCanvas');
let ctx = canvas.getContext('2d');
let canvasContainer = document.getElementById('canvasContainer');

canvas.width = canvasContainer.offsetWidth;
canvas.height = canvasContainer.offsetHeight;

let image = null;
let isDragging = false;
let offsetX, offsetY;

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            image = new Image();
            image.onload = function() {
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            };
            image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

canvas.addEventListener('mousedown', (e) => {
    if (image) {
        isDragging = true;
        offsetX = e.clientX - image.x;
        offsetY = e.clientY - image.y;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        image.x = e.clientX - offsetX;
        image.y = e.clientY - offsetY;
        drawImage();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

function drawImage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, image.x, image.y, image.width, image.height);
}

// Add resize functionality (simple example)
canvas.addEventListener('wheel', (e) => {
    if (image) {
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        image.width *= scaleFactor;
        image.height *= scaleFactor;
        drawImage();
    }
});
