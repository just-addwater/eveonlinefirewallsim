/**
 * EVE Online Firewalling Simulator - Enemy Ship Class
 * AI-controlled enemy ships that launch missiles
 */

import { Utils } from './Utils.js';
import { Missile } from './Missile.js';

export class EnemyShip {
    constructor(scene, id, target, startPosition) {
        this.scene = scene;
        this.id = id;
        this.target = target;
        this.position = startPosition || Utils.randomPointOnSphere(Utils.randomFloat(40000, 80000));

        // Ship stats
        this.shipType = this.randomShipType();
        this.velocity = { x: 0, y: 0, z: 0 };
        this.currentSpeed = 0;
        this.maxSpeed = Utils.randomFloat(200, 600);
        this.signatureRadius = 125;

        // AI behavior
        this.targetPosition = null;
        this.behaviorChangeTimer = Utils.randomFloat(5, 20);
        this.behaviorChangeInterval = Utils.randomFloat(5, 20);

        // Missile launching
        this.missileTimer = Utils.randomFloat(3, 8);
        this.missileLaunchInterval = Utils.randomFloat(5, 10);
        this.volleySize = Utils.randomInt(3, 6);

        // Track missiles
        this.launchedMissiles = [];

        this.createMesh();
        this.chooseNewBehavior();
    }

    /**
     * Get random ship type
     */
    randomShipType() {
        const types = ['Frigate', 'Destroyer', 'Cruiser', 'Battlecruiser'];
        return types[Math.floor(Math.random() * types.length)];
    }

    /**
     * Create enemy ship mesh
     */
    createMesh() {
        // Different sizes based on ship type
        const sizes = {
            'Frigate': { length: 40, width: 15 },
            'Destroyer': { length: 60, width: 20 },
            'Cruiser': { length: 80, width: 25 },
            'Battlecruiser': { length: 100, width: 30 }
        };

        const size = sizes[this.shipType];

        // Main hull
        const geometry = new THREE.CylinderGeometry(size.width, size.width * 0.7, size.length, 6);
        const material = new THREE.MeshPhongMaterial({
            color: 0x8b0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.3
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = Math.PI / 2;
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);

        // Add hostile indicator light
        const light = new THREE.PointLight(0xff0000, 1, 100);
        this.mesh.add(light);

        this.scene.add(this.mesh);
    }

    /**
     * Update enemy ship AI (called every tick)
     */
    update(deltaTime) {
        // Update behavior timer
        this.behaviorChangeTimer -= deltaTime;
        if (this.behaviorChangeTimer <= 0) {
            this.chooseNewBehavior();
            this.behaviorChangeTimer = this.behaviorChangeInterval;
        }

        // Update movement
        this.updateMovement(deltaTime);

        // Update missile timer
        this.missileTimer -= deltaTime;
        if (this.missileTimer <= 0 && this.target) {
            this.launchMissileVolley();
            this.missileTimer = this.missileLaunchInterval;
        }

        // Update mesh
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    }

    /**
     * Choose new AI behavior
     */
    chooseNewBehavior() {
        if (!this.target) return;

        const behaviors = ['orbit', 'keeprange', 'approach_retreat'];
        const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];

        const targetPos = this.target.position;
        let offset;

        switch (behavior) {
            case 'orbit':
                // Orbit at random distance
                const orbitDist = Utils.randomFloat(30000, 70000);
                offset = Utils.randomPointOnSphere(orbitDist);
                this.targetPosition = {
                    x: targetPos.x + offset.x,
                    y: targetPos.y + offset.y,
                    z: targetPos.z + offset.z
                };
                break;

            case 'keeprange':
                // Keep at specific range
                const keepDist = Utils.randomFloat(40000, 80000);
                const direction = Utils.normalize({
                    x: this.position.x - targetPos.x,
                    y: this.position.y - targetPos.y,
                    z: this.position.z - targetPos.z
                });
                this.targetPosition = {
                    x: targetPos.x + direction.x * keepDist,
                    y: targetPos.y + direction.y * keepDist,
                    z: targetPos.z + direction.z * keepDist
                };
                break;

            case 'approach_retreat':
                // Random position near target
                offset = Utils.randomPointOnSphere(Utils.randomFloat(50000, 90000));
                this.targetPosition = {
                    x: targetPos.x + offset.x,
                    y: targetPos.y + offset.y,
                    z: targetPos.z + offset.z
                };
                break;
        }

        // Randomly change speed
        this.maxSpeed = Utils.randomFloat(200, 600);
    }

    /**
     * Update movement
     */
    updateMovement(deltaTime) {
        if (!this.targetPosition) return;

        const direction = {
            x: this.targetPosition.x - this.position.x,
            y: this.targetPosition.y - this.position.y,
            z: this.targetPosition.z - this.position.z
        };

        const normalized = Utils.normalize(direction);

        // Apply velocity
        const acceleration = this.maxSpeed * 0.2;
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

        this.currentSpeed = currentVel;

        // Update position
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;

        // Rotate to face direction
        if (currentVel > 1) {
            this.mesh.lookAt(
                this.position.x + this.velocity.x,
                this.position.y + this.velocity.y,
                this.position.z + this.velocity.z
            );
        }
    }

    /**
     * Launch missile volley at target
     */
    launchMissileVolley() {
        if (!this.target) return [];

        const missiles = [];

        for (let i = 0; i < this.volleySize; i++) {
            // Add slight random offset to launch position
            const offset = {
                x: Utils.randomFloat(-10, 10),
                y: Utils.randomFloat(-10, 10),
                z: Utils.randomFloat(-10, 10)
            };

            const launchPos = {
                x: this.position.x + offset.x,
                y: this.position.y + offset.y,
                z: this.position.z + offset.z
            };

            const missile = new Missile(this.scene, launchPos, this.target, this.id);
            missiles.push(missile);
            this.launchedMissiles.push(missile);
        }

        return missiles;
    }

    /**
     * Get enemy info for HUD
     */
    getInfo() {
        return {
            id: this.mesh.id,
            name: `${this.shipType} #${this.id}`,
            distance: this.target ? Utils.distance3D(this.position, this.target.position) : 0,
            velocity: Math.round(this.currentSpeed),
            type: this.shipType,
            hostile: true
        };
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}