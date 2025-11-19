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

        this.shipType = this.randomShipType();
        this.velocity = { x: 0, y: 0, z: 0 };
        this.currentSpeed = 0;
        this.maxSpeed = Utils.randomFloat(200, 600);
        this.signatureRadius = 125;

        this.targetPosition = null;
        this.behaviorChangeTimer = Utils.randomFloat(5, 20);
        this.behaviorChangeInterval = Utils.randomFloat(5, 20);

        this.missileTimer = Utils.randomFloat(3, 8);
        this.missileLaunchInterval = Utils.randomFloat(5, 10);
        this.volleySize = Utils.randomInt(3, 6);

        this.launchedMissiles = [];

        this.createMesh();
        this.chooseNewBehavior();
    }

    randomShipType() {
        const types = ['Frigate', 'Destroyer', 'Cruiser', 'Battlecruiser'];
        return types[Math.floor(Math.random() * types.length)];
    }

    createMesh() {
        this.mesh = new THREE.Group();

        let hullSize = 20;
        let color = 0xff3333;

        switch (this.shipType) {
            case 'Frigate':
                hullSize = 15;
                color = 0xff5555;
                break;
            case 'Destroyer':
                hullSize = 20;
                color = 0xff4444;
                break;
            case 'Cruiser':
                hullSize = 30;
                color = 0xff3333;
                break;
            case 'Battlecruiser':
                hullSize = 40;
                color = 0xff2222;
                break;
        }

        // Optimized geometry
        const hullGeometry = new THREE.CylinderGeometry(hullSize * 0.6, hullSize, hullSize * 3, 4);
        const hullMaterial = new THREE.MeshLambertMaterial({ color: color });
        const hull = new THREE.Mesh(hullGeometry, hullMaterial);
        hull.rotation.z = Math.PI / 2;
        this.mesh.add(hull);

        // Optimized light
        const hostileLight = new THREE.PointLight(0xff0000, 0.5, 75);
        this.mesh.add(hostileLight);

        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        this.behaviorChangeTimer -= deltaTime;
        if (this.behaviorChangeTimer <= 0) {
            this.chooseNewBehavior();
            this.behaviorChangeTimer = this.behaviorChangeInterval;
        }

        this.updateMovement(deltaTime);

        this.missileTimer -= deltaTime;
        if (this.missileTimer <= 0 && this.target) {
            this.launchMissileVolley();
            this.missileTimer = this.missileLaunchInterval;
        }

        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    }

    chooseNewBehavior() {
        if (!this.target) return;

        const behaviors = ['orbit', 'keeprange', 'approach_retreat'];
        const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
        const targetPos = this.target.position;
        let offset;

        switch (behavior) {
            case 'orbit':
                const orbitDist = Utils.randomFloat(30000, 70000);
                offset = Utils.randomPointOnSphere(orbitDist);
                this.targetPosition = {
                    x: targetPos.x + offset.x,
                    y: targetPos.y + offset.y,
                    z: targetPos.z + offset.z
                };
                break;

            case 'keeprange':
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
                offset = Utils.randomPointOnSphere(Utils.randomFloat(50000, 90000));
                this.targetPosition = {
                    x: targetPos.x + offset.x,
                    y: targetPos.y + offset.y,
                    z: targetPos.z + offset.z
                };
                break;
        }

        this.maxSpeed = Utils.randomFloat(200, 600);
    }

    updateMovement(deltaTime) {
        if (!this.targetPosition) return;

        const direction = {
            x: this.targetPosition.x - this.position.x,
            y: this.targetPosition.y - this.position.y,
            z: this.targetPosition.z - this.position.z
        };

        const normalized = Utils.normalize(direction);
        const acceleration = this.maxSpeed * 0.2;
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

        this.currentSpeed = currentVel;

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

    launchMissileVolley() {
        if (!this.target) return [];

        const missiles = [];

        for (let i = 0; i < this.volleySize; i++) {
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

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}