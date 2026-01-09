// Game configuration - adjust these values to tune gameplay

// Target zone size in degrees - each zone is this many degrees wide
// Total target width = ZONE_SIZE * 5 (for zones: 2, 3, 4, 3, 2)
export const ZONE_SIZE = 6;

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

// CSS clip-path percentages for each zone
// These are calculated based on ZONE_SIZE
// 50% = center, each degree ≈ 0.556% of arc
const DEG_TO_PERCENT = 0.556;

export function getZoneClipPaths(zoneSize: number = ZONE_SIZE) {
    const z = zoneSize * DEG_TO_PERCENT;
    return {
        zone4: `polygon(50% 100%, ${50 - z}% 0%, ${50 + z}% 0%)`,
        zone3Left: `polygon(50% 100%, ${50 - z * 2}% 0%, ${50 - z}% 0%)`,
        zone3Right: `polygon(50% 100%, ${50 + z}% 0%, ${50 + z * 2}% 0%)`,
        zone2Left: `polygon(50% 100%, ${50 - z * 3}% 0%, ${50 - z * 2}% 0%)`,
        zone2Right: `polygon(50% 100%, ${50 + z * 2}% 0%, ${50 + z * 3}% 0%)`,
    };
}
