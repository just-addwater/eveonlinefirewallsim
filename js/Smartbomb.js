/**
 * EVE Online Firewalling Simulator - Smartbomb Class
 * Handles smartbomb activation, area damage, and visual effects
 */

import { Utils } from './Utils.js';

export class Smartbomb {
    constructor(scene, owner) {
        this.scene = scene;
        this.owner = owner;

        // Smartbomb stats (EVE Online large smartbomb)
        this.range = 7500; // meters (7.5km)
        this.damage = 200; // per activation
        this.cycleTime = 3000; // ms (3 seconds)
        this.capacitorCost = 600; // cap units per cycle

        this.isActive = false;
        this.isCycling = false;
        this.cooldownRemaining = 0;
        this.activationCount = 0;

        // Visual effect meshes
        this.rangeIndicator = null;
        this.explosionEffect = null;

        this.createRangeIndicator();
    }

    /**
     * Create visual range indicator
     */
    createRangeIndicator() {
        const geometry = new THREE.SphereGeometry(this.range, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.15,
            wireframe: true,
            side: THREE.DoubleSide
        });

        this.rangeIndicator = new THREE.Mesh(geometry, material);
        this.rangeIndicator.visible = false;
        this.scene.add(this.rangeIndicator);
    }

    /**
     * Update smartbomb position to follow owner
     */
    update() {
        if (this.owner && this.owner.position) {
            this.rangeIndicator.position.set(
                this.owner.position.x,
                this.owner.position.y,
                this.owner.position.z
            );
        }

        // Update cooldown
        if (this.cooldownRemaining > 0) {
            this.cooldownRemaining -= 1000; // Tick rate (1 second)
            if (this.cooldownRemaining <= 0) {
                this.isCycling = false;
            }
        }
    }

    /**
     * Activate smartbomb
     */
    activate(missiles) {
        if (this.isCycling) return { success: false, reason: 'cycling' };

        // Check capacitor
        if (this.owner.currentCapacitor < this.capacitorCost) {
            return { success: false, reason: 'no_cap' };
        }

        // Drain capacitor
        this.owner.currentCapacitor -= this.capacitorCost;

        // Set cycling state
        this.isCycling = true;
        this.cooldownRemaining = this.cycleTime;
        this.activationCount++;

        // Apply damage to missiles in range
        const missilesDestroyed = this.applyDamage(missiles);

        // Create visual effect
        this.createExplosionEffect();

        return {
            success: true,
            missilesDestroyed: missilesDestroyed,
            activationCount: this.activationCount
        };
    }

    /**
     * Apply damage to all entities in range
     */
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

    /**
     * Create explosion visual effect
     */
    createExplosionEffect() {
        // Create expanding sphere
        const geometry = new THREE.SphereGeometry(100, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        this.explosionEffect = new THREE.Mesh(geometry, material);
        this.explosionEffect.position.set(
            this.owner.position.x,
            this.owner.position.y,
            this.owner.position.z
        );
        this.scene.add(this.explosionEffect);

        // Animate expansion
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

    /**
     * Toggle range indicator visibility
     */
    toggleRangeIndicator(visible) {
        if (this.rangeIndicator) {
            this.rangeIndicator.visible = visible;
        }
    }

    /**
     * Get smartbomb status
     */
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

    /**
     * Cleanup
     */
    dispose() {
        if (this.rangeIndicator) {
            this.scene.remove(this.rangeIndicator);
            this.rangeIndicator.geometry.dispose();
            this.rangeIndicator.material.dispose();
        }
    }
}