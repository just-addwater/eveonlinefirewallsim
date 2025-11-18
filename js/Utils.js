/**
 * EVE Online Firewalling Simulator - Utility Functions
 * Common math and helper functions used throughout the simulation
 */

export const Utils = {
    /**
     * Calculate distance between two 3D points
     */
    distance3D(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    /**
     * Normalize a vector
     */
    normalize(vector) {
        const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
        if (length === 0) return { x: 0, y: 0, z: 0 };
        return {
            x: vector.x / length,
            y: vector.y / length,
            z: vector.z / length
        };
    },

    /**
     * Lerp between two values
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Random integer between min and max (inclusive)
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Random float between min and max
     */
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Format number with commas
     */
    formatNumber(num) {
        return num.toLocaleString('en-US');
    },

    /**
     * Format distance (meters to km if large)
     */
    formatDistance(meters) {
        if (meters >= 1000) {
            return (meters / 1000).toFixed(1) + ' km';
        }
        return Math.round(meters) + ' m';
    },

    /**
     * Convert degrees to radians
     */
    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    },

    /**
     * Convert radians to degrees
     */
    radToDeg(radians) {
        return radians * (180 / Math.PI);
    },

    /**
     * EVE Online damage application formula
     * Simplified version of missile damage calculation
     */
    calculateMissileDamage(baseDamage, targetSigRadius, targetVelocity, missileExpRadius, missileVelocity) {
        const sigFactor = Math.min(1, targetSigRadius / missileExpRadius);
        const velFactor = targetVelocity / missileVelocity;
        return baseDamage * sigFactor * Math.pow(velFactor, 0.5);
    },

    /**
     * Generate a random point on a sphere
     */
    randomPointOnSphere(radius) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        return {
            x: radius * Math.sin(phi) * Math.cos(theta),
            y: radius * Math.sin(phi) * Math.sin(theta),
            z: radius * Math.cos(phi)
        };
    },

    /**
     * Get random color from EVE palette
     */
    getRandomEVEColor() {
        const colors = [
            0x00d4ff, // EVE Blue
            0xffd700, // EVE Gold
            0xff3333, // EVE Red
            0x00ff88, // EVE Green
            0xff00ff, // Magenta
            0x00ffff  // Cyan
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
};