/**
 * EVE Online Firewalling Simulator - Main Entry Point
 * Initializes the game and manages the main loop
 */

import { Battleship } from './Battleship.js';
import { EnemyShip } from './EnemyShip.js';
import { InputController } from './InputController.js';
import { HUD } from './HUD.js';
import { SimulationManager } from './SimulationManager.js';
import { Utils } from './Utils.js';

class FirewallingSimulator {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingProgress = document.getElementById('loading-progress');
        this.loadingText = document.getElementById('loading-text');

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.battleship = null;
        this.enemies = [];
        this.inputController = null;
        this.hud = null;
        this.simulationManager = null;

        this.init();
    }

    /**
     * Initialize the simulator
     */
    async init() {
        this.updateLoading(10, 'Setting up 3D environment...');
        await this.initThreeJS();

        this.updateLoading(30, 'Creating battleship...');
        await this.createBattleship();

        this.updateLoading(50, 'Spawning enemy fleet...');
        await this.createEnemies();

        this.updateLoading(70, 'Initializing HUD...');
        await this.setupHUD();

        this.updateLoading(85, 'Configuring controls...');
        await this.setupControls();

        this.updateLoading(95, 'Starting simulation...');
        await this.startSimulation();

        this.updateLoading(100, 'Ready!');

        // Hide loading screen
        setTimeout(() => {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
        }, 500);
    }

    /**
     * Initialize Three.js scene, camera, renderer
     */
    async initThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.Fog(0x000000, 5000, 50000);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            1,
            100000
        );
        this.camera.position.set(0, -1000, 500);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);

        // Add starfield (optimized)
        this.createStarfield();

        // Add grid for reference (optimized)
        const gridHelper = new THREE.GridHelper(50000, 50, 0x00d4ff, 0x003344);
        gridHelper.rotation.x = Math.PI / 2;
        this.scene.add(gridHelper);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        return new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Create starfield background (optimized)
     */
    createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 2000; // Reduced from 10,000
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 100000;
            positions[i + 1] = (Math.random() - 0.5) * 100000;
            positions[i + 2] = (Math.random() - 0.5) * 100000;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 3,
            transparent: true,
            opacity: 0.8
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    /**
     * Create player battleship
     */
    async createBattleship() {
        this.battleship = new Battleship(this.scene);
        return new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Create enemy ships
     */
    async createEnemies() {
        const enemyCount = Utils.randomInt(5, 10);

        for (let i = 0; i < enemyCount; i++) {
            const enemy = new EnemyShip(this.scene, i, this.battleship);
            this.enemies.push(enemy);
        }

        return new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Setup HUD
     */
    async setupHUD() {
        this.hud = new HUD();

        // Setup radial menu callbacks
        window.addEventListener('radialMenuAction', (e) => {
            this.handleRadialMenuAction(e.detail);
        });

        return new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Setup input controls
     */
    async setupControls() {
        this.inputController = new InputController(
            this.camera,
            this.canvas,
            this.battleship,
            (x, y) => this.hud.showRadialMenu(x, y)
        );

        // Setup smartbomb toggle
        window.addEventListener('toggleSmartbomb', () => {
            this.simulationManager.activateSmartbomb();
        });

        return new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Start the simulation
     */
    async startSimulation() {
        this.simulationManager = new SimulationManager(
            this.battleship,
            this.enemies,
            (battleship, enemies, missiles, stats) => {
                this.hud.update(battleship, enemies, missiles, stats);
            }
        );

        this.simulationManager.start();

        // Start render loop
        this.animate();

        // Enable smartbomb range indicator by default
        this.battleship.toggleSmartbombIndicator(true);

        return new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Handle radial menu actions
     */
    handleRadialMenuAction(action) {
        console.log('Radial menu action:', action);
        // Placeholder for future radial menu actions
    }

    /**
     * Main animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        const currentTime = performance.now();

        // Update simulation (handles 1Hz ticks internally)
        if (this.simulationManager) {
            this.simulationManager.update(currentTime);
        }

        // Update camera to follow battleship
        if (this.inputController) {
            this.inputController.updateCamera();
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Update loading screen
     */
    updateLoading(percent, text) {
        this.loadingProgress.style.width = percent + '%';
        this.loadingText.textContent = text;
    }
}

// Start the simulator when page loads
window.addEventListener('DOMContentLoaded', () => {
    new FirewallingSimulator();
});