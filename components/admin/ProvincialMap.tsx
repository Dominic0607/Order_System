
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useCambodiaGeoJSON } from '../../hooks/useCambodiaGeoJSON';
import { normalizeName } from '../../utils/mapUtils';
import MapLegend from './map/MapLegend';
import { useMapEngine } from '../../hooks/useMapEngine';
import { EXTRUSION_HEIGHT_EXPRESSION, FILL_COLOR_EXPRESSION, MAP_COLORS } from './map/mapStyles';

interface ProvinceStat {
    name: string;
    revenue: number;
    orders: number;
}

interface ProvincialMapProps {
    data: ProvinceStat[];
}

const ProvincialMap: React.FC<ProvincialMapProps> = ({ data }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]); // Store active markers
    const hoverStateIdRef = useRef<string | number | null>(null);
    const animationRef = useRef<number | null>(null);

    // 1. Data Hook
    const { geoJson: rawGeoJson, loading: geoLoading, error: geoError } = useCambodiaGeoJSON();
    
    // 2. Map Engine Hook
    const { map, isMapReady, mapError } = useMapEngine(mapContainerRef);

    // 3. Process Data
    const statsMap = useMemo(() => {
        const stats: Record<string, ProvinceStat> = {};
        if (!Array.isArray(data)) return stats;
        data.forEach(item => {
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
    }, [data]);

    // Calculate Ranks
    const topRanks = useMemo(() => {
        const sorted = Object.values(statsMap).sort((a, b) => b.revenue - a.revenue);
        const ranks: Record<string, number> = {};
        sorted.forEach((item, index) => {
            const key = normalizeName(item.name);
            if (key) ranks[key] = index + 1;
        });
        return ranks;
    }, [statsMap]);

    // 4. Update Map Logic (3D Layers & Markers)
    useEffect(() => {
        if (!isMapReady || !map || !rawGeoJson) return;

        try {
            // @ts-ignore
            const maplibregl = window.maplibregl;

            // --- 1. DRAMATIC ENTRANCE ---
            // Fly to Cambodia "Command Center" View starting from the engine's default
            map.flyTo({
                center: [104.9160, 12.5657],
                zoom: 7.8, // Zoom out slightly
                pitch: 45, // Aim closer to top-down
                bearing: -10,
                speed: 0.6, // Even smoother
                curve: 1.2,
                essential: true
            });

            // --- 2. DYNAMIC LIGHTING ANIMATION ---
            // Rotate the light source to create shifting shadows ("Time Lapse" effect)
            const animateLight = (timestamp: number) => {
                const phase = timestamp / 4000; // Speed of day/night cycle
                // Orbit light around the center
                const x = Math.sin(phase) * 1.5;
                const y = Math.cos(phase) * 1.5;
                
                map.setLight({
                    anchor: 'viewport',
                    color: '#ffffff',
                    intensity: 0.5 + Math.sin(phase) * 0.1, // Pulse intensity slightly
                    position: [x, y, 80] // Changing position X/Y
                });
                
                animationRef.current = requestAnimationFrame(animateLight);
            };
            animationRef.current = requestAnimationFrame(animateLight);


            // Prepare Source Data with Stats
            const processedFeatures = rawGeoJson.features.map((feature: any) => {
                const props = feature.properties || {};
                const namesToTry = [props.name_kh, props.Name_KH, props.name_en, props.Name_EN, props.name, props.shapeName];
                let revenue = 0;
                let orders = 0;
                let displayName = props.name_en || props.shapeName || "Province";
                let rank = 999;

                for (const n of namesToTry) {
                    if (!n) continue;
                    const key = normalizeName(String(n));
                    if (statsMap[key]) {
                        revenue = statsMap[key].revenue;
                        orders = statsMap[key].orders;
                        if (topRanks[key]) rank = topRanks[key];
                        displayName = n; 
                        break;
                    }
                }
                return { ...feature, properties: { ...props, revenue, orders, displayName, rank } };
            });

            const processedGeoJson = { type: 'FeatureCollection', features: processedFeatures };

            // Update or Add Source
            const source = map.getSource('cambodia-3d-source');
            if (source) {
                source.setData(processedGeoJson);
            } else {
                map.addSource('cambodia-3d-source', {
                    type: 'geojson',
                    data: processedGeoJson,
                    generateId: true
                });

                // --- 3D EXTRUSION LAYER ---
                map.addLayer({
                    'id': 'province-3d',
                    'type': 'fill-extrusion',
                    'source': 'cambodia-3d-source',
                    'paint': {
                        'fill-extrusion-color': FILL_COLOR_EXPRESSION,
                        'fill-extrusion-height': EXTRUSION_HEIGHT_EXPRESSION,
                        'fill-extrusion-base': 0,
                        'fill-extrusion-opacity': 0.9,
                        'fill-extrusion-vertical-gradient': true
                    }
                });

                // 2D Base Glow Layer (Shows on Hover)
                map.addLayer({
                    'id': 'province-hover-fill',
                    'type': 'fill',
                    'source': 'cambodia-3d-source',
                    'paint': {
                        'fill-color': '#f59e0b', // Amber 500 Glow
                        'fill-opacity': [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            0.5,
                            0
                        ]
                    }
                }, 'province-3d'); // Place below 3D

                // Glowing Neon Outline
                map.addLayer({
                    'id': 'province-outlines',
                    'type': 'line',
                    'source': 'cambodia-3d-source',
                    'paint': {
                        'line-color': '#f97316', // Orange 500
                        'line-width': 2,
                        'line-opacity': 0.5,
                        'line-blur': 2 // Glow effect
                    }
                });

                // Highlight Layer (3D Pop on Hover)
                map.addLayer({
                    'id': 'province-highlight',
                    'type': 'fill-extrusion',
                    'source': 'cambodia-3d-source',
                    'paint': {
                        'fill-extrusion-color': '#ffffff', // Brilliant White Highlight
                        'fill-extrusion-height': [
                            '+', 
                            EXTRUSION_HEIGHT_EXPRESSION, 
                            1000 
                        ],
                        'fill-extrusion-opacity': [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            0.8,
                            0
                        ]
                    }
                });

                // Initialize Popup
                popupRef.current = new maplibregl.Popup({
                    closeButton: false,
                    closeOnClick: false,
                    className: 'custom-map-popup',
                    offset: 40,
                    maxWidth: '280px'
                });

                // Interactions
                map.on('mousemove', 'province-3d', (e: any) => {
                    if (e.features.length > 0) {
                        map.getCanvas().style.cursor = 'pointer';
                        const feature = e.features[0];
                        
                        if (hoverStateIdRef.current !== null) {
                            map.setFeatureState({ source: 'cambodia-3d-source', id: hoverStateIdRef.current }, { hover: false });
                        }
                        hoverStateIdRef.current = feature.id;
                        map.setFeatureState({ source: 'cambodia-3d-source', id: feature.id }, { hover: true });

                        // Elegant Popup
                        const { displayName, revenue, orders } = feature.properties;
                        popupRef.current
                            .setLngLat(e.lngLat)
                            .setHTML(`
                                <div class="p-4 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl min-w-[180px]">
                                    <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                                        <h4 class="font-bold text-sm text-white tracking-wide">${displayName}</h4>
                                        ${revenue > 0 ? '<div class="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse"></div>' : ''}
                                    </div>
                                    <div class="space-y-2">
                                        <div class="flex justify-between items-baseline">
                                            <span class="text-slate-400 text-xs font-medium uppercase tracking-wider">Revenue</span>
                                            <span class="font-black text-lg text-orange-400">$${Number(revenue).toLocaleString()}</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-slate-500 text-xs font-medium uppercase tracking-wider">Orders</span>
                                            <span class="text-slate-200 text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700">${orders}</span>
                                        </div>
                                    </div>
                                </div>
                            `)
                            .addTo(map);
                    }
                });

                map.on('mouseleave', 'province-3d', () => {
                    map.getCanvas().style.cursor = '';
                    if (hoverStateIdRef.current !== null) {
                        map.setFeatureState({ source: 'cambodia-3d-source', id: hoverStateIdRef.current }, { hover: false });
                    }
                    hoverStateIdRef.current = null;
                    popupRef.current.remove();
                });
            }

            // --- REFRESH RANK MARKERS (FLOATING CAPSULES) ---
            // 1. Remove old markers
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current = [];

            // 2. Add new markers for Top 3
            processedFeatures.forEach((feature: any) => {
                const { rank, displayName } = feature.properties;
                if (rank && rank <= 3) {
                    // Calculate Center
                    const coords = feature.geometry.type === 'Polygon' 
                        ? feature.geometry.coordinates[0] 
                        : feature.geometry.coordinates.flat(1)[0]; 
                    
                    if (!coords) return;

                    const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
                    coords.forEach((coord: any) => bounds.extend(coord));
                    const center = bounds.getCenter();

                    // Minimalist Glass Marker
                    const el = document.createElement('div');
                    el.className = 'province-rank-marker';
                    el.innerHTML = `
                        <div class="flex flex-col items-center group cursor-pointer animate-float">
                            <div class="relative">
                                <div class="absolute inset-0 bg-orange-500/30 blur-lg rounded-full animate-pulse"></div>
                                <div class="px-4 py-2 bg-slate-900/80 backdrop-blur-md rounded-full shadow-lg border border-orange-400/50 flex items-center gap-3 relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-shimmer"></div>
                                    <span class="font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-orange-500 text-sm">#${rank}</span>
                                    <div class="w-px h-3 bg-white/20"></div>
                                    <span class="text-xs font-bold text-white tracking-wide whitespace-nowrap">${displayName}</span>
                                </div>
                            </div>
                            <div class="w-0.5 h-6 bg-gradient-to-b from-orange-500 to-transparent opacity-50"></div>
                            <div class="w-3 h-3 border border-orange-500 rounded-full flex items-center justify-center -mt-1 opacity-50">
                                <div class="w-1 h-1 bg-orange-400 rounded-full"></div>
                            </div>
                        </div>
                    `;

                    // Add to map
                    const marker = new maplibregl.Marker({
                        element: el,
                        anchor: 'bottom',
                        offset: [0, -10] 
                    })
                    .setLngLat(center)
                    .addTo(map);

                    markersRef.current.push(marker);
                }
            });

        } catch (e) {
            console.error("Layer Update Error:", e);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isMapReady, rawGeoJson, statsMap, topRanks]);

    if (geoError || mapError) {
        return (
            <div className="w-full h-[500px] flex items-center justify-center bg-gray-900/50 rounded-3xl border border-red-500/20 text-red-400">
                <p>Map Error: {geoError || mapError}</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[600px] xl:h-[700px] bg-[#020617] rounded-[1.5rem] border border-slate-800 shadow-[0_0_40px_rgba(56,189,248,0.1)] overflow-hidden group">
            
            {/* Header / Title Overlay with Glass effect */}
            <div className="absolute top-5 left-6 pointer-events-none z-10">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                         <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                        </span>
                        <span className="text-[10px] text-sky-400 font-mono tracking-widest uppercase">Live Data Stream</span>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 drop-shadow-lg">
                        CAMBODIA <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">NEXUS</span>
                    </h2>
                </div>
            </div>

            {/* SCANNIG RADAR BEAM */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent absolute top-0 animate-scan blur-[1px]"></div>
                <div className="w-full h-[20px] bg-gradient-to-b from-cyan-400/10 to-transparent absolute top-0 animate-scan"></div>
            </div>

            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] pointer-events-none rounded-full mix-blend-screen transform translate-x-1/2 -translate-y-1/2"></div>

            <div ref={mapContainerRef} className="w-full h-full" />
            
            {(!isMapReady || geoLoading) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617] z-20">
                    <div className="w-16 h-16 border-4 border-slate-800 border-t-cyan-400 rounded-full animate-spin"></div>
                    <p className="mt-4 text-[10px] font-bold text-cyan-400 uppercase tracking-widest animate-pulse">Initializing System...</p>
                </div>
            )}

            <MapLegend />
            
            <style>{`
                .maplibregl-popup {
                    z-index: 100;
                }
                .maplibregl-popup-content {
                    background: transparent !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    border: none !important;
                }
                .maplibregl-popup-tip { display: none !important; }
                .province-rank-marker { z-index: 5; }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 3s infinite;
                }

                @keyframes scan {
                    0% { top: -10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 110%; opacity: 0; }
                }
                .animate-scan {
                    animation: scan 8s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default ProvincialMap;
