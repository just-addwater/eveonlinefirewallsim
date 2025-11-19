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

        this.maxHP = 120;
        this.currentHP = 120;
        this.velocity = 3000;
        this.explosionRadius = 125;
        this.explosionVelocity = 150;
        this.baseDamage = 500;
        this.flightTime = 0;
        this.maxFlightTime = 20;

        this.alive = true;
        this.hasImpacted = false;

        this.createMesh();
    }

    createMesh() {
        this.mesh = new THREE.Group();

        // Optimized missile body
        const bodyGeometry = new THREE.CylinderGeometry(2, 3, 10, 4);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.z = Math.PI / 2;
        this.mesh.add(body);

        // Optimized trail
        const trailGeometry = new THREE.CylinderGeometry(1, 2, 20, 4);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.4
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.rotation.z = Math.PI / 2;
        trail.position.x = -15;
        this.mesh.add(trail);

        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        if (!this.alive || !this.target) return;

        this.flightTime += deltaTime;

        if (this.flightTime >= this.maxFlightTime) {
            this.destroy('timeout');
            return;
        }

        const targetPos = this.target.position;
        const direction = {
            x: targetPos.x - this.position.x,
            y: targetPos.y - this.position.y,
            z: targetPos.z - this.position.z
        };

        const normalized = Utils.normalize(direction);
        const distance = this.velocity * deltaTime;
        this.position.x += normalized.x * distance;
        this.position.y += normalized.y * distance;
        this.position.z += normalized.z * distance;

        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.lookAt(targetPos.x, targetPos.y, targetPos.z);

        const distToTarget = Utils.distance3D(this.position, targetPos);
        if (distToTarget < 50) {
            this.impact();
        }
    }

    takeDamage(damage) {
        if (!this.alive) return false;

        this.currentHP -= damage;

        if (this.currentHP <= 0) {
            this.destroy('destroyed');
            return true;
        }

        return false;
    }

    impact() {
        if (this.hasImpacted || !this.alive) return;

        this.hasImpacted = true;

        const targetVelocity = this.target.currentSpeed || 0;
        const targetSigRadius = this.target.signatureRadius || 400;

        const damage = Utils.calculateMissileDamage(
            this.baseDamage,
            targetSigRadius,
            targetVelocity,
            this.explosionRadius,
            this.explosionVelocity
        );

        if (this.target.takeDamage) {
            this.target.takeDamage(damage);
        }

        this.destroy('impact');
    }

    destroy(reason) {
        if (!this.alive) return;

        this.alive = false;
        this.createExplosion();

        setTimeout(() => {
            if (this.mesh) {
                this.scene.remove(this.mesh);
                this.mesh.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
        }, 100);
    }

    createExplosion() {
        // Optimized explosion
        const geometry = new THREE.SphereGeometry(15, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.8
        });

        const explosion = new THREE.Mesh(geometry, material);
        explosion.position.set(this.position.x, this.position.y, this.position.z);
        this.scene.add(explosion);

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