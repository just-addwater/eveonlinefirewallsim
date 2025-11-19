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
        this.navigationMode = null;
        this.navigationTarget = null;

        // Ship stats
        this.baseSpeed = 125;
        this.currentSpeed = 0;
        this.maxSpeed = this.baseSpeed;
        this.signatureRadius = 400;
        this.baseSignatureRadius = 400;
        this.mass = 100000000;
        this.inertiaModifier = 0.1;

        // Tank stats
        this.maxShield = 10000;
        this.currentShield = 10000;
        this.maxArmor = 8000;
        this.currentArmor = 8000;
        this.maxCapacitor = 5000;
        this.currentCapacitor = 5000;
        this.capacitorRecharge = 100;

        // Propulsion modules
        this.afterburnerActive = false;
        this.afterburnerBoost = 1.5;
        this.afterburnerSigPenalty = 1.1;
        this.afterburnerCapCost = 50;

        this.mwdActive = false;
        this.mwdBoost = 5.0;
        this.mwdSigPenalty = 6.0;
        this.mwdCapCost = 200;
        this.mwdCycleTime = 10000;
        this.mwdCycleRemaining = 0;

        this.createMesh();
        this.smartbomb = new Smartbomb(this.scene, this);
    }

    createMesh() {
        this.mesh = new THREE.Group();

        // Main hull (optimized)
        const hullGeometry = new THREE.CylinderGeometry(20, 30, 100, 6);
        const hullMaterial = new THREE.MeshLambertMaterial({ color: 0x2a5a7a });
        const hull = new THREE.Mesh(hullGeometry, hullMaterial);
        hull.rotation.z = Math.PI / 2;
        this.mesh.add(hull);

        // Wings (optimized)
        const wingGeometry = new THREE.BoxGeometry(80, 5, 40);
        const wingMaterial = new THREE.MeshLambertMaterial({ color: 0x1a3a4a });

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
        engine.position.x = -65;
        this.mesh.add(engine);

        // Engine light (optimized)
        const engineLight = new THREE.PointLight(0x00d4ff, 1, 150);
        engineLight.position.set(-65, 0, 0);
        this.mesh.add(engineLight);

        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        this.updatePropulsion(deltaTime);
        this.updateNavigation(deltaTime);
        this.rechargeCapacitor();
        this.smartbomb.update();
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);

        this.currentSpeed = Math.sqrt(
            this.velocity.x * this.velocity.x +
            this.velocity.y * this.velocity.y +
            this.velocity.z * this.velocity.z
        );
    }

    updatePropulsion(deltaTime) {
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

    updateNavigation(deltaTime) {
        if (!this.targetPosition) {
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
            this.targetPosition = null;
            return;
        }

        const normalized = Utils.normalize(direction);
        const acceleration = this.maxSpeed * 0.3;
        this.velocity.x += normalized.x * acceleration * deltaTime;
        this.velocity.y += normalized.y * acceleration * deltaTime;
        this.velocity.z += normalized.z * acceleration * deltaTime;

        const currentVel = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y + this.velocity.z * this.velocity.z);
        if (currentVel > this.maxSpeed) {
            const ratio = this.maxSpeed / currentVel;
            this.velocity.x *= ratio;
            this.velocity.y *= ratio;
            this.velocity.z *= ratio;
        }

        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;

        if (currentVel > 1) {
            this.mesh.lookAt(
                this.position.x + this.velocity.x,
                this.position.y + this.velocity.y,
                this.position.z + this.velocity.z
            );
        }
    }

    rechargeCapacitor() {
        this.currentCapacitor = Math.min(
            this.maxCapacitor,
            this.currentCapacitor + this.capacitorRecharge
        );
    }

    navigateTo(position, mode = 'approach') {
        this.targetPosition = { ...position };
        this.navigationMode = mode;
    }

    toggleAfterburner() {
        this.afterburnerActive = !this.afterburnerActive;
        return this.afterburnerActive;
    }

    activateMWD() {
        if (this.mwdActive) return false;
        this.mwdActive = true;
        this.mwdCycleRemaining = this.mwdCycleTime;
        return true;
    }

    activateSmartbomb(missiles) {
        return this.smartbomb.activate(missiles);
    }

    toggleSmartbombIndicator(visible) {
        this.smartbomb.toggleRangeIndicator(visible);
    }

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