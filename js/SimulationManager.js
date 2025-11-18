/**
 * EVE Online Firewalling Simulator - Simulation Manager
 * Manages the 1Hz tick system and coordinates all game updates
 */

export class SimulationManager {
    constructor(battleship, enemies, updateCallback) {
        this.battleship = battleship;
        this.enemies = enemies;
        this.updateCallback = updateCallback;

        // 1 Hz tick rate (1 second)
        this.tickRate = 1000; // ms
        this.lastTickTime = 0;
        this.accumulator = 0;

        // Missile tracking
        this.missiles = [];

        // Statistics
        this.stats = {
            missilesLaunched: 0,
            missilesDestroyed: 0,
            smartbombCycles: 0,
            sessionStartTime: Date.now()
        };

        this.isRunning = false;
    }

    /**
     * Start the simulation
     */
    start() {
        this.isRunning = true;
        this.lastTickTime = performance.now();
    }

    /**
     * Stop the simulation
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Main update loop (called every frame for interpolation)
     */
    update(currentTime) {
        if (!this.isRunning) return;

        const deltaTime = currentTime - this.lastTickTime;
        this.lastTickTime = currentTime;

        this.accumulator += deltaTime;

        // Process ticks at fixed 1 Hz rate
        while (this.accumulator >= this.tickRate) {
            this.tick();
            this.accumulator -= this.tickRate;
        }

        // Interpolate visual updates between ticks
        const alpha = this.accumulator / this.tickRate;
        this.interpolate(alpha);
    }

    /**
     * Process one simulation tick (1 second)
     */
    tick() {
        const deltaTime = this.tickRate / 1000; // Convert to seconds

        // Update battleship
        this.battleship.update(deltaTime);

        // Update enemies
        this.enemies.forEach(enemy => {
            enemy.update(deltaTime);

            // Check if enemy should launch missiles
            const newMissiles = this.checkEnemyMissileLaunch(enemy);
            if (newMissiles.length > 0) {
                this.missiles.push(...newMissiles);
                this.stats.missilesLaunched += newMissiles.length;
            }
        });

        // Update missiles
        this.missiles.forEach(missile => {
            if (missile.alive) {
                missile.update(deltaTime);
            }
        });

        // Clean up dead missiles
        this.missiles = this.missiles.filter(m => m.alive || (Date.now() - m.destroyTime < 1000));

        // Callback to update HUD
        if (this.updateCallback) {
            this.updateCallback(this.battleship, this.enemies, this.missiles, this.stats);
        }
    }

    /**
     * Check if enemy should launch missiles this tick
     */
    checkEnemyMissileLaunch(enemy) {
        // This is called from enemy.update() which handles timing
        return [];
    }

    /**
     * Interpolate visuals between ticks
     */
    interpolate(alpha) {
        // Smooth visual updates between ticks
        // This is where you'd add interpolation for movement
    }

    /**
     * Activate smartbomb
     */
    activateSmartbomb() {
        const result = this.battleship.activateSmartbomb(this.missiles);

        if (result.success) {
            this.stats.smartbombCycles++;
            this.stats.missilesDestroyed += result.missilesDestroyed;
        }

        return result;
    }

    /**
     * Add missiles to tracking (from enemy launches)
     */
    addMissiles(missiles) {
        this.missiles.push(...missiles);
        this.stats.missilesLaunched += missiles.length;
    }

    /**
     * Get current statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            missilesLaunched: 0,
            missilesDestroyed: 0,
            smartbombCycles: 0,
            sessionStartTime: Date.now()
        };
    }
}