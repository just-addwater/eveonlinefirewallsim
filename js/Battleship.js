/**
 * EVE Online Firewalling Simulator - Battleship Class
 * Player-controlled battleship with propulsion modules
 */

import { Utils } from './Utils.js';
import { Smartbomb } from './Smartbomb.js';

export class Battleship {
    constructor(scene) {
        this.scene = scene;

        // Position and movement
        this.position = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.targetPosition = null;
        this.navigationMode = null; // 'approach', 'orbit', 'keeprange'
        this.navigationTarget = null;

        // Ship stats
        this.baseSpeed = 125; // m/s
        this.currentSpeed = 0;
        this.maxSpeed = this.baseSpeed;
        this.signatureRadius = 400; // meters
        this.baseSignatureRadius = 400;
        this.mass = 100000000; // 100,000,000 kg
        this.inertiaModifier = 0.1;

        // Tank stats
        this.maxShield = 10000;
        this.currentShield = 10000;
        this.maxArmor = 8000;
        this.currentArmor = 8000;
        this.maxCapacitor = 5000;
        this.currentCapacitor = 5000;
        this.capacitorRecharge = 100; // per tick

        // Propulsion modules
        this.afterburnerActive = false;
        this.afterburnerBoost = 1.5; // +150%
        this.afterburnerSigPenalty = 1.1; // +10%
        this.afterburnerCapCost = 50; // per tick

        this.mwdActive = false;
        this.mwdBoost = 5.0; // +500%
        this.mwdSigPenalty = 6.0; // +500%
        this.mwdCapCost = 200; // per tick
        this.mwdCycleTime = 10000; // 10 seconds
        this.mwdCycleRemaining = 0;

        // Smartbomb
        this.smartbomb = new Smartbomb(scene, this);

        // Create 3D mesh
        this.createMesh();
    }

    /**
     * Create battleship 3D model
     */
    createMesh() {
        // Main hull (simplified battleship shape)
        const hullGeometry = new THREE.CylinderGeometry(30, 50, 150, 8);
        const hullMaterial = new THREE.MeshPhongMaterial({
            color: 0x4a5568,
            emissive: 0x2563eb,
            emissiveIntensity: 0.2,
            shininess: 30
        });

        this.mesh = new THREE.Mesh(hullGeometry, hullMaterial);
        this.mesh.rotation.z = Math.PI / 2;

        // Add wings
        const wingGeometry = new THREE.BoxGeometry(100, 5, 40);
        const wingMaterial = new THREE.MeshPhongMaterial({
            color: 0x334155,
            emissive: 0x1e40af,
            emissiveIntensity: 0.1
        });

        const wing1 = new THREE.Mesh(wingGeometry, wingMaterial);
        wing1.position.set(0, 30, 0);
        this.mesh.add(wing1);

        const wing2 = new THREE.Mesh(wingGeometry, wingMaterial);
        wing2.position.set(0, -30, 0);
        this.mesh.add(wing2);

        // Engine glow
        const engineGeometry = new THREE.CylinderGeometry(15, 20, 30, 8);
        const engineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.7
        });

        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.rotation.z = Math.PI / 2;
        engine.position.x = -90;
        this.mesh.add(engine);

        // Add point lights for engines
        const engineLight = new THREE.PointLight(0x00d4ff, 2, 200);
        engineLight.position.x = -90;
        this.mesh.add(engineLight);

        this.scene.add(this.mesh);
    }

    /**
     * Update battleship (called every tick)
     */
    update(deltaTime) {
        // Update propulsion modules
        this.updatePropulsion(deltaTime);

        // Update navigation
        this.updateNavigation(deltaTime);

        // Recharge capacitor
        this.rechargeCapacitor();

        // Update smartbomb
        this.smartbomb.update();

        // Update mesh position
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);

        // Calculate current total speed
        this.currentSpeed = Math.sqrt(
            this.velocity.x * this.velocity.x +
            this.velocity.y * this.velocity.y +
            this.velocity.z * this.velocity.z
        );
    }

    /**
     * Update propulsion modules
     */
    updatePropulsion(deltaTime) {
        // Calculate max speed based on active modules
        this.maxSpeed = this.baseSpeed;
        this.signatureRadius = this.baseSignatureRadius;

        if (this.afterburnerActive) {
            if (this.currentCapacitor >= this.afterburnerCapCost) {
                this.maxSpeed *= this.afterburnerBoost;
                this.signatureRadius *= this.afterburnerSigPenalty;
                this.currentCapacitor -= this.afterburnerCapCost;
            } else {
                this.afterburnerActive = false;
            }
        }

        if (this.mwdActive) {
            this.mwdCycleRemaining -= deltaTime * 1000;

            if (this.mwdCycleRemaining > 0 && this.currentCapacitor >= this.mwdCapCost) {
                this.maxSpeed *= this.mwdBoost;
                this.signatureRadius *= this.mwdSigPenalty;
                this.currentCapacitor -= this.mwdCapCost;
            } else {
                this.mwdActive = false;
                this.mwdCycleRemaining = 0;
            }
        }
    }

    /**
     * Update navigation based on mode
     */
    updateNavigation(deltaTime) {
        if (!this.targetPosition) {
            // Slow down if no target
            this.velocity.x *= 0.95;
            this.velocity.y *= 0.95;
            this.velocity.z *= 0.95;
            return;
        }

        const direction = {
            x: this.targetPosition.x - this.position.x,
            y: this.targetPosition.y - this.position.y,
            z: this.targetPosition.z - this.position.z
        };

        const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);

        if (distance < 100) {
            // Reached target
            this.targetPosition = null;
            return;
        }

        const normalized = Utils.normalize(direction);

        // Apply acceleration towards target
        const acceleration = this.maxSpeed * 0.3;
        this.velocity.x += normalized.x * acceleration * deltaTime;
        this.velocity.y += normalized.y * acceleration * deltaTime;
        this.velocity.z += normalized.z * acceleration * deltaTime;

        // Limit to max speed
        const currentVel = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y + this.velocity.z * this.velocity.z);
        if (currentVel > this.maxSpeed) {
            const ratio = this.maxSpeed / currentVel;
            this.velocity.x *= ratio;
            this.velocity.y *= ratio;
            this.velocity.z *= ratio;
        }

        // Update position
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;

        // Rotate ship to face movement direction
        if (currentVel > 1) {
            this.mesh.lookAt(
                this.position.x + this.velocity.x,
                this.position.y + this.velocity.y,
                this.position.z + this.velocity.z
            );
        }
    }

    /**
     * Recharge capacitor
     */
    rechargeCapacitor() {
        this.currentCapacitor = Math.min(
            this.maxCapacitor,
            this.currentCapacitor + this.capacitorRecharge
        );
    }

    /**
     * Navigate to position
     */
    navigateTo(position, mode = 'approach') {
        this.targetPosition = { ...position };
        this.navigationMode = mode;
    }

    /**
     * Toggle afterburner
     */
    toggleAfterburner() {
        this.afterburnerActive = !this.afterburnerActive;
        return this.afterburnerActive;
    }

    /**
     * Activate MWD
     */
    activateMWD() {
        if (this.mwdActive) return false;

        this.mwdActive = true;
        this.mwdCycleRemaining = this.mwdCycleTime;
        return true;
    }

    /**
     * Activate smartbomb
     */
    activateSmartbomb(missiles) {
        return this.smartbomb.activate(missiles);
    }

    /**
     * Toggle smartbomb range indicator
     */
    toggleSmartbombIndicator(visible) {
        this.smartbomb.toggleRangeIndicator(visible);
    }

    /**
     * Take damage
     */
    takeDamage(damage) {
        if (this.currentShield > 0) {
            this.currentShield -= damage;
            if (this.currentShield < 0) {
                this.currentArmor += this.currentShield;
                this.currentShield = 0;
            }
        } else if (this.currentArmor > 0) {
            this.currentArmor -= damage;
            if (this.currentArmor < 0) {
                this.currentArmor = 0;
            }
        }
    }

    /**
     * Get ship status
     */
    getStatus() {
        return {
            position: { ...this.position },
            velocity: this.currentSpeed,
            shield: (this.currentShield / this.maxShield) * 100,
            armor: (this.currentArmor / this.maxArmor) * 100,
            capacitor: (this.currentCapacitor / this.maxCapacitor) * 100,
            afterburnerActive: this.afterburnerActive,
            mwdActive: this.mwdActive,
            mwdCycleRemaining: this.mwdCycleRemaining,
            signatureRadius: this.signatureRadius,
            smartbomb: this.smartbomb.getStatus()
        };
    }
}