
export const MAP_COLORS = {
    base: '#020617', 
    highlight: '#ffffff', // Pure White for focus
    levels: [
        '#1e293b', // 0 - Empty (Slate 800)
        '#7f1d1d', // 1 - Dark Red (Low)
        '#b91c1c', // 2 - Red 700
        '#ea580c', // 3 - Orange 600
        '#f59e0b', // 4 - Amber 500
        '#facc15', // 5 - Yellow 400
        '#ffffff'  // 6 - Pure White (Highest)
    ]
};

export const REVENUE_LEVELS = [0, 100, 500, 1000, 5000, 10000];

// 3D Extrusion Height Calculation
// Slightly increased for better 3D definition at closer zoom
export const EXTRUSION_HEIGHT_EXPRESSION = [
    'interpolate',
    ['linear'],
    ['get', 'revenue'],
    0, 200,
    100, 1000,
    1000, 4000,
    10000, 15000,
    50000, 35000 
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
    'rgba(30, 41, 59, 0.6)' // Semi-transparent Slate 800 for empty areas
];
