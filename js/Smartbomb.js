/**
 * EVE Online Firewalling Simulator - Smartbomb Class
 * Handles smartbomb activation, area damage, and visual effects
 */

import { Utils } from './Utils.js';

export class Smartbomb {
    constructor(scene, owner) {
        this.scene = scene;
        this.owner = owner;

        this.range = 7500;
        this.damage = 200;
        this.cycleTime = 3000;
        this.capacitorCost = 600;

        this.isActive = false;
        this.isCycling = false;
        this.cooldownRemaining = 0;
        this.activationCount = 0;

        this.rangeIndicator = null;
        this.explosionEffect = null;

        this.createRangeIndicator();
    }

    createRangeIndicator() {
        // Optimized range indicator
        const geometry = new THREE.SphereGeometry(this.range, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.15,
            wireframe: true
        });

        this.rangeIndicator = new THREE.Mesh(geometry, material);
        this.rangeIndicator.visible = false;
        this.scene.add(this.rangeIndicator);
    }

    update() {
        if (this.owner && this.owner.position) {
            this.rangeIndicator.position.set(
                this.owner.position.x,
                this.owner.position.y,
                this.owner.position.z
            );
        }

        if (this.cooldownRemaining > 0) {
            this.cooldownRemaining -= 1000;
            if (this.cooldownRemaining <= 0) {
                this.isCycling = false;
            }
        }
    }

    activate(missiles) {
        if (this.isCycling) return { success: false, reason: 'cycling' };

        if (this.owner.currentCapacitor < this.capacitorCost) {
            return { success: false, reason: 'no_cap' };
        }

        this.owner.currentCapacitor -= this.capacitorCost;
        this.isCycling = true;
        this.cooldownRemaining = this.cycleTime;
        this.activationCount++;

        const missilesDestroyed = this.applyDamage(missiles);
        this.createExplosionEffect();

        return {
            success: true,
            missilesDestroyed: missilesDestroyed,
            activationCount: this.activationCount
        };
    }

    applyDamage(missiles) {
        if (!missiles || !this.owner) return 0;

        let destroyedCount = 0;
        const ownerPos = this.owner.position;

        missiles.forEach(missile => {
            if (!missile.alive) return;

            const distance = Utils.distance3D(ownerPos, missile.position);

            if (distance <= this.range) {
                const destroyed = missile.takeDamage(this.damage);
                if (destroyed) destroyedCount++;
            }
        });

        return destroyedCount;
    }

    createExplosionEffect() {
        // Optimized explosion effect
        const geometry = new THREE.SphereGeometry(100, 12, 12);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.6,
            wireframe: false
        });

        this.explosionEffect = new THREE.Mesh(geometry, material);
        this.explosionEffect.position.set(
            this.owner.position.x,
            this.owner.position.y,
            this.owner.position.z
        );
        this.scene.add(this.explosionEffect);

        let scale = 0.1;
        const maxScale = this.range / 100;
        const interval = setInterval(() => {
            scale += maxScale / 10;
            this.explosionEffect.scale.set(scale, scale, scale);
            material.opacity -= 0.06;

            if (material.opacity <= 0 || scale >= maxScale) {
                clearInterval(interval);
                this.scene.remove(this.explosionEffect);
                this.explosionEffect.geometry.dispose();
                this.explosionEffect.material.dispose();
                this.explosionEffect = null;
            }
        }, 50);
    }

    toggleRangeIndicator(visible) {
        if (this.rangeIndicator) {
            this.rangeIndicator.visible = visible;
        }
    }

    getStatus() {
        return {
            isActive: this.isActive,
            isCycling: this.isCycling,
            cooldownRemaining: this.cooldownRemaining,
            activationCount: this.activationCount,
            range: this.range,
            damage: this.damage
        };
    }

    dispose() {
        if (this.rangeIndicator) {
            this.scene.remove(this.rangeIndicator);
            this.rangeIndicator.geometry.dispose();
            this.rangeIndicator.material.dispose();
        }
    }
}