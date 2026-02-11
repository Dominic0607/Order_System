import React, { useEffect, useRef, useState, useMemo } from 'react';

interface ProvinceStat {
    name: string;
    revenue: number;
    orders: number;
}

interface ProvincialMapProps {
    data: ProvinceStat[];
}

const GEOJSON_URLS = [
    "https://raw.githubusercontent.com/seanghai/cambodia-geojson/master/cambodia-provinces.geojson",
    "https://raw.githubusercontent.com/romnea/cambodia-geojson/master/provinces.geojson",
    "https://raw.githubusercontent.com/kheang-hong/cambodia-geojson/master/provinces.geojson"
];

const COLOR_PALETTE = ['#1f2937', '#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];
const REVENUE_THRESHOLDS = [0, 500, 1000, 5000, 10000, 20000];

const ProvincialMap: React.FC<ProvincialMapProps> = ({ data }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null); 
    const popupRef = useRef<any>(null);
    const rawGeoJsonRef = useRef<any>(null); // Store raw GeoJSON for updates
    
    const [isMapReady, setIsMapReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Memoize stats lookup with safety check
    const normalizeName = (name: string) => {
        if (!name) return "";
        return String(name).toLowerCase()
            .replace(/\s/g, '')
            .replace(/province|city|រាជធានី|ខេត្ត/g, '')
            .trim();
    };

    // Safe Data Access: Ensure 'data' is always an array to prevent "Uncaught TypeError"
    const safeData = useMemo(() => Array.isArray(data) ? data : [], [data]);

    const statsMap = useMemo(() => {
        const stats: Record<string, ProvinceStat> = {};
        safeData.forEach(item => {
            if (!item || !item.name) return;
            const key = normalizeName(item.name);
            if (!key) return;
            if (!stats[key]) {
                stats[key] = { ...item };
            } else {
                stats[key].revenue += (Number(item.revenue) || 0);
                stats[key].orders += (Number(item.orders) || 0);
            }
        });
        return stats;
    }, [safeData]);

    // 1. Initialize Map (Run Once)
    useEffect(() => {
        let isMounted = true;

        const initMap = async () => {
            if (!mapContainerRef.current) return;
            // If map already exists, don't re-init
            if (mapRef.current) return;

            setLoading(true);
            setError(null);

            try {
                // Poll for library
                let attempts = 0;
                // @ts-ignore
                while (!window.maplibregl && attempts < 50) { 
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }

                if (!isMounted) return;

                // @ts-ignore
                const maplibregl = window.maplibregl;
                if (!maplibregl) throw new Error("ដំណើរការផែនទីបរាជ័យ (Library not loaded)");

                // Fetch GeoJSON
                let geojsonData: any = null;
                for (const url of GEOJSON_URLS) {
                    try {
                        const res = await fetch(url);
                        if (res.ok) {
                            geojsonData = await res.json();
                            break;
                        }
                    } catch (e) {
                        console.warn(`Failed to load ${url}`, e);
                    }
                }

                if (!isMounted) return;
                if (!geojsonData) throw new Error("មិនអាចទាញយកទិន្នន័យផែនទីបានទេ");

                // Store raw data for later updates
                rawGeoJsonRef.current = geojsonData;

                // Check container again before creating map
                if (!mapContainerRef.current) return;

                // Create Map
                const map = new maplibregl.Map({
                    container: mapContainerRef.current,
                    style: {
                        version: 8,
                        sources: {
                            'osm': {
                                type: 'raster',
                                tiles: ['https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png'],
                                tileSize: 256,
                                attribution: '&copy; CartoDB'
                            }
                        },
                        layers: [
                            {
                                id: 'osm-layer',
                                type: 'raster',
                                source: 'osm',
                                paint: { 'raster-opacity': 0.6 }
                            }
                        ]
                    },
                    center: [104.9, 12.5],
                    zoom: 5.5,
                    maxBounds: [[102, 9], [108, 15]]
                });

                mapRef.current = map;
                
                if (maplibregl.NavigationControl) {
                    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
                }

                // Catch internal map errors
                map.on('error', (e: any) => {
                    console.warn("MapLibre internal error:", e);
                });

                map.on('load', () => {
                    if (!isMounted) return;
                    
                    try {
                        if (!map.getSource('cambodia-provinces')) {
                            // Add Source with empty/initial data
                            map.addSource('cambodia-provinces', {
                                type: 'geojson',
                                data: geojsonData // Initial data
                            });
                        }

                        // Add Layers
                        if (!map.getLayer('province-fills')) {
                            map.addLayer({
                                id: 'province-fills',
                                type: 'fill',
                                source: 'cambodia-provinces',
                                paint: {
                                    'fill-color': [
                                        'step',
                                        ['get', 'revenue'],
                                        COLOR_PALETTE[0],
                                        REVENUE_THRESHOLDS[1], COLOR_PALETTE[1],
                                        REVENUE_THRESHOLDS[2], COLOR_PALETTE[2],
                                        REVENUE_THRESHOLDS[3], COLOR_PALETTE[3],
                                        REVENUE_THRESHOLDS[4], COLOR_PALETTE[4],
                                        REVENUE_THRESHOLDS[5], COLOR_PALETTE[5]
                                    ],
                                    'fill-opacity': 0.8,
                                    'fill-outline-color': '#ffffff'
                                }
                            });
                        }

                        if (!map.getLayer('province-borders')) {
                            map.addLayer({
                                id: 'province-borders',
                                type: 'line',
                                source: 'cambodia-provinces',
                                paint: { 'line-color': '#64748b', 'line-width': 1 }
                            });
                        }

                        if (!map.getLayer('province-highlight')) {
                            map.addLayer({
                                id: 'province-highlight',
                                type: 'line',
                                source: 'cambodia-provinces',
                                paint: { 'line-color': '#fbbf24', 'line-width': 3 },
                                filter: ['==', 'displayName', '']
                            });
                        }

                        // Interaction Handlers
                        map.on('mousemove', 'province-fills', (e: any) => {
                            if (e.features?.length > 0) {
                                const props = e.features[0].properties;
                                map.getCanvas().style.cursor = 'pointer';
                                map.setFilter('province-highlight', ['==', 'displayName', props.displayName]);

                                if (!popupRef.current && maplibregl.Popup) {
                                    popupRef.current = new maplibregl.Popup({
                                        closeButton: false,
                                        closeOnClick: false,
                                        className: 'custom-map-popup'
                                    });
                                }

                                if (popupRef.current) {
                                    popupRef.current
                                        .setLngLat(e.lngLat)
                                        .setHTML(`
                                            <div class="p-2 text-gray-900">
                                                <h4 class="font-bold text-sm uppercase">${props.displayName}</h4>
                                                <div class="text-xs mt-1">
                                                    <div class="flex justify-between gap-4"><span>Revenue:</span><span class="font-bold text-blue-600">$${props.revenue.toLocaleString()}</span></div>
                                                    <div class="flex justify-between gap-4"><span>Orders:</span><span class="font-bold">${props.orders}</span></div>
                                                </div>
                                            </div>
                                        `)
                                        .addTo(map);
                                }
                            }
                        });

                        map.on('mouseleave', 'province-fills', () => {
                            map.getCanvas().style.cursor = '';
                            map.setFilter('province-highlight', ['==', 'displayName', '']);
                            if (popupRef.current) {
                                popupRef.current.remove();
                                popupRef.current = null;
                            }
                        });

                        setIsMapReady(true);
                        setLoading(false);
                    } catch (layerError) {
                        console.error("Layer setup error:", layerError);
                        // Non-fatal, map might just be empty
                        setLoading(false);
                    }
                });

            } catch (err: any) {
                console.error("Map Init Error:", err);
                if (isMounted) {
                    setError(err.message || "Map initialization failed.");
                    setLoading(false);
                }
            }
        };

        initMap().catch(e => {
            console.error("Map Init Uncaught Error:", e);
            if (isMounted) setError("Map initialization crashed.");
        });

        return () => {
            isMounted = false;
            if (mapRef.current) {
                // Safely remove map
                try {
                    mapRef.current.remove();
                } catch(e) {
                    console.warn("Map remove error", e);
                }
                mapRef.current = null;
            }
        };
    }, []);

    // 2. Update Data when Props Change
    useEffect(() => {
        if (!isMapReady || !mapRef.current || !rawGeoJsonRef.current) return;

        try {
            const rawData = rawGeoJsonRef.current;
            
            // Merge current stats into GeoJSON
            const mergedFeatures = rawData.features.map((feature: any) => {
                const props = feature.properties || {};
                const namesToTry = [
                    props.name_kh, props.Name_KH, props.name_en, props.Name_EN, 
                    props.name, props.Name, props.HRNAME_KH, props.HRName
                ];
                
                let revenue = 0;
                let orders = 0;
                let displayName = props.name_en || props.Name_EN || "Unknown";

                for (const n of namesToTry) {
                    if (!n) continue;
                    const key = normalizeName(String(n));
                    if (statsMap[key]) {
                        revenue = statsMap[key].revenue;
                        orders = statsMap[key].orders;
                        displayName = n; 
                        break;
                    }
                }

                return {
                    ...feature,
                    properties: {
                        ...props,
                        revenue,
                        orders,
                        displayName
                    }
                };
            });

            // Update Source
            const source = mapRef.current.getSource('cambodia-provinces');
            if (source) {
                source.setData({
                    type: 'FeatureCollection',
                    features: mergedFeatures
                });
            }
        } catch (updateError) {
            console.error("Error updating map data:", updateError);
        }

    }, [statsMap, isMapReady]);

    return (
        <div className="relative w-full h-[500px] lg:h-[600px] bg-gray-950/20 rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
            <div ref={mapContainerRef} className="w-full h-full" />
            
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm z-20">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-xs font-bold text-gray-500 animate-pulse">Initializing Map...</p>
                </div>
            )}
            
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-30 p-6 text-center">
                    <p className="text-red-400 font-bold mb-2">{error}</p>
                    <button onClick={() => window.location.reload()} className="text-xs text-blue-400 hover:underline">Retry</button>
                </div>
            )}

            {/* Custom Legend */}
            <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-md p-3 rounded-xl border border-white/10 z-10 shadow-xl pointer-events-none">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Revenue Scale</p>
                <div className="flex flex-col gap-1">
                    {REVENUE_THRESHOLDS.map((val, i) => {
                        if (i === 0) return null; 
                        const color = COLOR_PALETTE[i];
                        const prev = REVENUE_THRESHOLDS[i-1];
                        return (
                            <div key={i} className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }}></span>
                                <span className="text-[9px] text-gray-300 font-mono">${prev / 1000}k - ${val / 1000}k</span>
                            </div>
                        );
                    })}
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLOR_PALETTE[5] }}></span>
                        <span className="text-[9px] text-gray-300 font-mono">&gt; ${REVENUE_THRESHOLDS[5] / 1000}k</span>
                    </div>
                </div>
            </div>
            
            <style>{`
                .maplibregl-popup-content {
                    background: rgba(255, 255, 255, 0.95) !important;
                    border-radius: 12px !important;
                    padding: 0 !important;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
                    border: 1px solid rgba(0,0,0,0.1) !important;
                }
                .maplibregl-popup-tip {
                    border-top-color: rgba(255, 255, 255, 0.95) !important;
                }
                .maplibregl-ctrl-group {
                    background: rgba(30, 41, 59, 0.8) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                }
                .maplibregl-ctrl button {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                }
                .maplibregl-ctrl-icon {
                    filter: invert(1) !important;
                }
            `}</style>
        </div>
    );
};

export default ProvincialMap;