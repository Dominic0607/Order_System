
export const MAP_COLORS = {
    base: '#1e293b',
    highlight: '#fbbf24',
    levels: [
        '#1f2937', // 0 - Empty
        '#172554', // 1 - Low
        '#1e40af', // 2
        '#2563eb', // 3
        '#3b82f6', // 4
        '#60a5fa', // 5 - High
        '#93c5fd'  // 6 - Very High
    ]
};

export const REVENUE_LEVELS = [0, 100, 500, 1000, 5000, 10000];

// 3D Extrusion Height Calculation
// We use a base height + revenue factor
export const EXTRUSION_HEIGHT_EXPRESSION = [
    'interpolate',
    ['linear'],
    ['get', 'revenue'],
    0, 0,
    100, 2000,
    1000, 10000,
    10000, 30000,
    50000, 60000 
];

export const FILL_COLOR_EXPRESSION = [
    'case',
    ['!=', ['get', 'revenue'], 0],
    [
        'step',
        ['get', 'revenue'],
        MAP_COLORS.levels[0],
        REVENUE_LEVELS[1], MAP_COLORS.levels[1],
        REVENUE_LEVELS[2], MAP_COLORS.levels[2],
        REVENUE_LEVELS[3], MAP_COLORS.levels[3],
        REVENUE_LEVELS[4], MAP_COLORS.levels[4],
        REVENUE_LEVELS[5], MAP_COLORS.levels[5]
    ],
    'rgba(255,255,255,0.02)' // Default ghost color
];
