// Game configuration - adjust these values to tune gameplay

// Target zone size in degrees - each zone is this many degrees wide
// Total target width = ZONE_SIZE * 5 (for zones: 2, 3, 4, 3, 2)
export const ZONE_SIZE = 8;

// Generate a random target angle from -90 to +90 degrees (full range)
export function generateTargetAngle(): number {
    // Use crypto for better randomness
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const random = array[0] / (0xFFFFFFFF + 1); // 0 to 1 exclusive
    return random * 180 - 90; // -90 to +90 degrees
}

// Scoring thresholds based on ZONE_SIZE
export const SCORE_THRESHOLDS = {
    BULLSEYE: ZONE_SIZE,        // 4 points - center zone
    INNER: ZONE_SIZE * 2,       // 3 points - inner zones
    OUTER: ZONE_SIZE * 3,       // 2 points - outer zones
};

export function calculateScore(needleAngle: number, targetAngle: number): number {
    const diff = Math.abs(needleAngle - targetAngle);
    if (diff <= SCORE_THRESHOLDS.BULLSEYE) return 4;
    if (diff <= SCORE_THRESHOLDS.INNER) return 3;
    if (diff <= SCORE_THRESHOLDS.OUTER) return 2;
    return 0;
}

// Convert angle (degrees) to clip-path percentage
// For a semicircle, a line from bottom center at angle θ hits the top edge at x = 50% + tan(θ) * 50%
function angleToPercent(degrees: number): number {
    return Math.tan(degrees * Math.PI / 180) * 50;
}

export function getZoneClipPaths(zoneSize: number = ZONE_SIZE) {
    const z1 = angleToPercent(zoneSize);      // bullseye boundary
    const z2 = angleToPercent(zoneSize * 2);  // inner boundary
    const z3 = angleToPercent(zoneSize * 3);  // outer boundary
    return {
        zone4: `polygon(50% 100%, ${50 - z1}% 0%, ${50 + z1}% 0%)`,
        zone3Left: `polygon(50% 100%, ${50 - z2}% 0%, ${50 - z1}% 0%)`,
        zone3Right: `polygon(50% 100%, ${50 + z1}% 0%, ${50 + z2}% 0%)`,
        zone2Left: `polygon(50% 100%, ${50 - z3}% 0%, ${50 - z2}% 0%)`,
        zone2Right: `polygon(50% 100%, ${50 + z2}% 0%, ${50 + z3}% 0%)`,
    };
}
