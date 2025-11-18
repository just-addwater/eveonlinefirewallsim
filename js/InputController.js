/**
 * EVE Online Firewalling Simulator - Input Controller
 * Handles mouse and keyboard input for navigation and camera controls
 */

export class InputController {
    constructor(camera, canvas, battleship, setRadialMenuCallback) {
        this.camera = camera;
        this.canvas = canvas;
        this.battleship = battleship;
        this.setRadialMenuCallback = setRadialMenuCallback;

        // Camera controls
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.cameraRotation = { theta: 0, phi: Math.PI / 4 };
        this.cameraDistance = 1000;
        this.minDistance = 300;
        this.maxDistance = 5000;

        // Selection
        this.selectedObject = null;

        // Raycaster for object picking
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.setupEventListeners();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this));
        this.canvas.addEventListener('contextmenu', this.onRightClick.bind(this));

        // Keyboard events
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    /**
     * Mouse down event
     */
    onMouseDown(event) {
        if (event.button === 0) { // Left click
            this.isDragging = true;
            this.previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
    }

    /**
     * Mouse move event
     */
    onMouseMove(event) {
        if (this.isDragging) {
            // Rotate camera
            const deltaX = event.clientX - this.previousMousePosition.x;
            const deltaY = event.clientY - this.previousMousePosition.y;

            this.cameraRotation.theta -= deltaX * 0.005;
            this.cameraRotation.phi += deltaY * 0.005;

            // Clamp phi to prevent camera flip
            this.cameraRotation.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraRotation.phi));

            this.previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
    }

    /**
     * Mouse up event
     */
    onMouseUp(event) {
        if (event.button === 0) { // Left click
            if (!this.isDragging) {
                // Click - not drag
                this.handleLeftClick(event);
            }
            this.isDragging = false;
        }
    }

    /**
     * Handle left click (for navigation)
     */
    handleLeftClick(event) {
        // Update mouse vector for raycasting
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast to find click position in 3D space
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Create a plane at battleship's position
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, intersectPoint);

        if (intersectPoint) {
            // Navigate to clicked position
            this.battleship.navigateTo({
                x: intersectPoint.x,
                y: intersectPoint.y,
                z: intersectPoint.z
            }, 'approach');
        }
    }

    /**
     * Right click event (radial menu)
     */
    onRightClick(event) {
        event.preventDefault();

        // Show radial menu at cursor position
        if (this.setRadialMenuCallback) {
            this.setRadialMenuCallback(event.clientX, event.clientY);
        }

        return false;
    }

    /**
     * Mouse wheel event (zoom)
     */
    onMouseWheel(event) {
        event.preventDefault();

        this.cameraDistance += event.deltaY * 0.5;
        this.cameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraDistance));
    }

    /**
     * Key down event
     */
    onKeyDown(event) {
        switch (event.key.toLowerCase()) {
            case ' ': // Spacebar - toggle smartbomb
                event.preventDefault();
                // This will be handled by main game loop
                window.dispatchEvent(new CustomEvent('toggleSmartbomb'));
                break;

            case 'a': // Afterburner
                event.preventDefault();
                this.battleship.toggleAfterburner();
                break;

            case 'shift': // MWD
                event.preventDefault();
                this.battleship.activateMWD();
                break;

            case 'tab': // Toggle overview
                event.preventDefault();
                window.dispatchEvent(new CustomEvent('toggleOverview'));
                break;

            case 'escape': // Cancel
                event.preventDefault();
                this.battleship.targetPosition = null;
                break;
        }
    }

    /**
     * Key up event
     */
    onKeyUp(event) {
        // Handle key releases if needed
    }

    /**
     * Update camera position based on rotation and distance
     */
    updateCamera() {
        const battleshipPos = this.battleship.position;

        // Calculate camera position in spherical coordinates
        const x = battleshipPos.x + this.cameraDistance * Math.sin(this.cameraRotation.phi) * Math.cos(this.cameraRotation.theta);
        const y = battleshipPos.y + this.cameraDistance * Math.sin(this.cameraRotation.phi) * Math.sin(this.cameraRotation.theta);
        const z = battleshipPos.z + this.cameraDistance * Math.cos(this.cameraRotation.phi);

        this.camera.position.set(x, y, z);
        this.camera.lookAt(battleshipPos.x, battleshipPos.y, battleshipPos.z);
    }
}