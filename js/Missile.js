/**
 * EVE Online Firewalling Simulator - Missile Class
 * Handles missile physics, tracking, and damage application
 */

import { Utils } from './Utils.js';

export class Missile {
    constructor(scene, startPos, target, launcherId) {
        this.scene = scene;
        this.position = { ...startPos };
        this.target = target;
        this.launcherId = launcherId;

        // Missile stats (EVE Online heavy missile approximation)
        this.maxHP = 120;
        this.currentHP = 120;
        this.velocity = 3000; // m/s
        this.explosionRadius = 125; // meters
        this.explosionVelocity = 150; // m/s
        this.baseDamage = 500;
        this.flightTime = 0;
        this.maxFlightTime = 20; // seconds

        this.alive = true;
        this.hasImpacted = false;

        // Create 3D representation
        this.createMesh();
    }

    createMesh() {
        // Missile body
        const geometry = new THREE.CylinderGeometry(2, 2, 15, 8);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff6600,
            emissive: 0xff3300,
            emissiveIntensity: 0.5
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = Math.PI / 2;
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);

        // Add trail
        const trailGeometry = new THREE.CylinderGeometry(0.5, 1.5, 25, 8);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.6
        });

        this.trail = new THREE.Mesh(trailGeometry, trailMaterial);
        this.trail.rotation.x = Math.PI / 2;
        this.trail.position.z = -20;
        this.mesh.add(this.trail);

        // Add point light for glow
        const light = new THREE.PointLight(0xff6600, 1, 100);
        this.mesh.add(light);

        this.scene.add(this.mesh);
    }

    /**
     * Update missile position (called on each tick)
     */
    update(deltaTime) {
        if (!this.alive || !this.target) return;

        this.flightTime += deltaTime;

        // Check max flight time
        if (this.flightTime >= this.maxFlightTime) {
            this.destroy('timeout');
            return;
        }

        // Calculate direction to target
        const targetPos = this.target.position;
        const direction = {
            x: targetPos.x - this.position.x,
            y: targetPos.y - this.position.y,
            z: targetPos.z - this.position.z
        };

        const normalized = Utils.normalize(direction);

        // Move towards target
        const distance = this.velocity * deltaTime;
        this.position.x += normalized.x * distance;
        this.position.y += normalized.y * distance;
        this.position.z += normalized.z * distance;

        // Update mesh position and rotation
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);

        // Point missile towards target
        this.mesh.lookAt(targetPos.x, targetPos.y, targetPos.z);

        // Check if reached target
        const distToTarget = Utils.distance3D(this.position, targetPos);
        if (distToTarget < 50) {
            this.impact();
        }
    }

    /**
     * Take damage from smartbomb
     */
    takeDamage(damage) {
        if (!this.alive) return false;

        this.currentHP -= damage;

        if (this.currentHP <= 0) {
            this.destroy('destroyed');
            return true;
        }

        return false;
    }

    /**
     * Missile impacts target
     */
    impact() {
        if (this.hasImpacted || !this.alive) return;

        this.hasImpacted = true;

        // Calculate damage based on EVE formula
        const targetVelocity = this.target.velocity || 0;
        const targetSigRadius = this.target.signatureRadius || 400;

        const damage = Utils.calculateMissileDamage(
            this.baseDamage,
            targetSigRadius,
            targetVelocity,
            this.explosionRadius,
            this.explosionVelocity
        );

        // Apply damage to target
        if (this.target.takeDamage) {
            this.target.takeDamage(damage);
        }

        this.destroy('impact');
    }

    /**
     * Destroy missile
     */
    destroy(reason) {
        if (!this.alive) return;

        this.alive = false;

        // Create explosion effect
        this.createExplosion();

        // Remove mesh after short delay
        setTimeout(() => {
            if (this.mesh) {
                this.scene.remove(this.mesh);
                this.mesh.geometry.dispose();
                this.mesh.material.dispose();
            }
        }, 500);
    }

    /**
     * Create explosion visual effect
     */
    createExplosion() {
        const geometry = new THREE.SphereGeometry(10, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.8
        });

        const explosion = new THREE.Mesh(geometry, material);
        explosion.position.set(this.position.x, this.position.y, this.position.z);
        this.scene.add(explosion);

        // Animate explosion
        let scale = 0.1;
        const interval = setInterval(() => {
            scale += 0.2;
            explosion.scale.set(scale, scale, scale);
            material.opacity -= 0.1;

            if (material.opacity <= 0) {
                clearInterval(interval);
                this.scene.remove(explosion);
                explosion.geometry.dispose();
                explosion.material.dispose();
            }
        }, 50);
    }

    /**
     * Get missile info for HUD
     */
    getInfo() {
        return {
            id: this.mesh?.id || 0,
            name: `Missile #${this.launcherId}`,
            distance: this.target ? Utils.distance3D(this.position, this.target.position) : 0,
            velocity: this.velocity,
            type: 'Missile',
            hp: this.currentHP,
            maxHP: this.maxHP
        };
    }
}