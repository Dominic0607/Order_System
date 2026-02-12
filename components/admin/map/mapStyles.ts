
export const MAP_COLORS = {
    base: '#0f0518', // Deep Purple Void
    highlight: '#ffd700', // Gold
    levels: [
        '#2e1065', // 0 - Deep Purple 900
        '#581c87', // 1 - Purple 800
        '#7e22ce', // 2 - Purple 700
        '#a855f7', // 3 - Purple 500
        '#d8b4fe', // 4 - Lavender
        '#facc15', // 5 - Yellow 400
        '#fde047'  // 6 - Yellow 300 (Highest)
    ]
};

export const REVENUE_LEVELS = [0, 500, 2000, 5000, 10000, 25000];

// 3D Extrusion Height Calculation
export const EXTRUSION_HEIGHT_EXPRESSION = [
    'interpolate',
    ['linear'],
    ['get', 'revenue'],
    0, 200,
    500, 1500,
    5000, 8000,
    10000, 20000,
    50000, 45000 
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
    'rgba(46, 16, 101, 0.5)' // Semi-transparent Deep Purple
];
