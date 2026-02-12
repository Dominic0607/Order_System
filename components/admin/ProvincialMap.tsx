
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
    shippingCost?: number; // Added Shipping Cost
}

interface ProvincialMapProps {
    data: ProvinceStat[];
}

const ProvincialMap: React.FC<ProvincialMapProps> = ({ data }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]); 
    const hoverStateIdRef = useRef<string | number | null>(null);
    const animationRef = useRef<number | null>(null);

    // UX State - Added 'shipping'
    const [activeMetric, setActiveMetric] = useState<'revenue' | 'orders' | 'shipping'>('revenue');
    const isUserInteracting = useRef(false);

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
                stats[key] = { ...item, shippingCost: Number(item.shippingCost) || 0 };
            } else {
                stats[key].revenue += (Number(item.revenue) || 0);
                stats[key].orders += (Number(item.orders) || 0);
                stats[key].shippingCost = (stats[key].shippingCost || 0) + (Number(item.shippingCost) || 0);
            }
        });
        return stats;
    }, [data]);

    // Calculate Ranks (Dynamic based on Metric)
    const topRanks = useMemo(() => {
        const sorted = Object.values(statsMap).sort((a, b) => {
            const valA = a[activeMetric as keyof ProvinceStat] || 0;
            const valB = b[activeMetric as keyof ProvinceStat] || 0;
            // @ts-ignore
            return valB - valA;
        });
        const ranks: Record<string, number> = {};
        sorted.forEach((item, index) => {
            const key = normalizeName(item.name);
            if (key) ranks[key] = index + 1;
        });
        return ranks;
    }, [statsMap, activeMetric]);

    // Helper to get color based on metric
    const getMetricColor = () => {
        switch(activeMetric) {
            case 'revenue': return '#fde047'; // Gold
            case 'orders': return '#d8b4fe'; // Lavender
            case 'shipping': return '#34d399'; // Emerald
            default: return '#fde047';
        }
    };
    
    const getMetricHighlightColor = () => {
        switch(activeMetric) {
            case 'revenue': return '#facc15'; // Gold
            case 'orders': return '#c084fc'; // Purple
            case 'shipping': return '#10b981'; // Emerald
            default: return '#facc15';
        }
    };

    // 4. Update Map Logic
    useEffect(() => {
        if (!isMapReady || !map || !rawGeoJson) return;

        try {
            // @ts-ignore
            const maplibregl = window.maplibregl;

            // Setup User Interaction Listeners
            const pauseAnimation = () => { isUserInteracting.current = true; };
            const resumeAnimation = () => { isUserInteracting.current = false; };
            
            map.on('mousedown', pauseAnimation);
            map.on('touchstart', pauseAnimation);
            map.on('dragstart', pauseAnimation);
            map.on('mouseup', resumeAnimation);
            map.on('touchend', resumeAnimation);
            map.on('dragend', resumeAnimation);
            map.on('zoomstart', pauseAnimation);
            map.on('zoomend', resumeAnimation);

            // --- 1. CINEMATIC CAMERA ENTRY ---
            if (!animationRef.current) { 
                 map.flyTo({
                    center: [104.9160, 12.7], 
                    zoom: 7.6, 
                    pitch: 62, 
                    bearing: -15,
                    speed: 0.5,
                    curve: 1.5,
                    essential: true
                });
            }

            // "4D" Drone Hover Effect
            const animateCamera = (timestamp: number) => {
                const lightPhase = timestamp / 3000;
                const lx = Math.sin(lightPhase) * 1.5;
                const ly = Math.cos(lightPhase) * 1.5;
                map.setLight({
                    anchor: 'map',
                    color: getMetricColor(),
                    intensity: 0.6 + Math.sin(lightPhase * 2) * 0.15, 
                    position: [lx, ly, 90] 
                });

                if (!isUserInteracting.current) {
                    const phase = timestamp / 15000; 
                    const newBearing = -15 + Math.sin(phase) * 3; 
                    const newPitch = 62 + Math.cos(phase * 0.7) * 2; 
                    map.jumpTo({ bearing: newBearing, pitch: newPitch });
                }

                animationRef.current = requestAnimationFrame(animateCamera);
            };
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            animationRef.current = requestAnimationFrame(animateCamera);

            // --- 2. ATMOSPHERIC FOG ---
            if (map.setFog) {
                map.setFog({
                    'range': [1, 12],
                    'color': '#0f0518',
                    'horizon-blend': 0.15,
                    'high-color': activeMetric === 'shipping' ? '#064e3b' : '#7e22ce', // Dark Green or Purple Haze
                    'space-color': '#0f0518',
                    'star-intensity': 0.9 
                });
            }

            // Prepare Source Data
            const processedFeatures = rawGeoJson.features.map((feature: any) => {
                const props = feature.properties || {};
                const namesToTry = [props.name_kh, props.Name_KH, props.name_en, props.Name_EN, props.name, props.shapeName];
                let revenue = 0;
                let orders = 0;
                let shippingCost = 0;
                let displayName = props.name_en || props.shapeName || "Province";
                let rank = 999;

                for (const n of namesToTry) {
                    if (!n) continue;
                    const key = normalizeName(String(n));
                    if (statsMap[key]) {
                        revenue = statsMap[key].revenue;
                        orders = statsMap[key].orders;
                        shippingCost = statsMap[key].shippingCost || 0; // Simulated
                        if (topRanks[key]) rank = topRanks[key];
                        displayName = n; 
                        break;
                    }
                }
                
                // For visualization purposes, we map the active metric to 'revenue' property if needed,
                // BUT better to just rely on the mapped values and adjust colors.
                // Since EXTRUSION_HEIGHT_EXPRESSION uses 'revenue', to visualize shipping or orders height,
                // we'd need to swap the value.
                // LET'S SWAP THE VALUE for the visualizer 'revenue' field based on metric.
                let visualValue = revenue;
                if (activeMetric === 'orders') visualValue = orders * 50; // Scale up orders for height
                if (activeMetric === 'shipping') visualValue = shippingCost * 20; // Scale up shipping

                // We override 'revenue' just for the map style expression to work without changing style definitions
                // This is a hack but efficient for this context.
                // We keep real values in other props.
                return { 
                    ...feature, 
                    properties: { 
                        ...props, 
                        revenue: visualValue, // Used for Height
                        realRevenue: revenue,
                        orders, 
                        shippingCost,
                        displayName, 
                        rank 
                    } 
                };
            });

            const processedGeoJson = { type: 'FeatureCollection', features: processedFeatures };
            const source = map.getSource('cambodia-3d-source');
            
            if (source) {
                source.setData(processedGeoJson);
            } else {
                map.addSource('cambodia-3d-source', {
                    type: 'geojson',
                    data: processedGeoJson,
                    generateId: true
                });

                // Layers...
                map.addLayer({
                    'id': 'province-hover-fill',
                    'type': 'fill',
                    'source': 'cambodia-3d-source',
                    'paint': {
                        'fill-color': getMetricHighlightColor(),
                        'fill-opacity': [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            0.5,
                            0
                        ]
                    }
                });

                map.addLayer({
                    'id': 'province-3d',
                    'type': 'fill-extrusion',
                    'source': 'cambodia-3d-source',
                    'paint': {
                        'fill-extrusion-color': FILL_COLOR_EXPRESSION,
                        'fill-extrusion-height': EXTRUSION_HEIGHT_EXPRESSION,
                        'fill-extrusion-base': 0,
                        'fill-extrusion-opacity': 0.95,
                        'fill-extrusion-vertical-gradient': true
                    }
                });
                
                map.addLayer({
                    'id': 'province-outlines',
                    'type': 'line',
                    'source': 'cambodia-3d-source',
                    'paint': {
                        'line-color': getMetricColor(),
                        'line-width': 1,
                        'line-opacity': 0.4
                    }
                });

                map.addLayer({
                    'id': 'province-floor-glow',
                    'type': 'line',
                    'source': 'cambodia-3d-source',
                    'paint': {
                        'line-color': activeMetric === 'shipping' ? '#059669' : '#a855f7', 
                        'line-width': 4,
                        'line-opacity': 0.3,
                        'line-blur': 6
                    }
                }, 'province-3d');

                map.addLayer({
                    'id': 'province-glass-shell',
                    'type': 'fill-extrusion',
                    'source': 'cambodia-3d-source',
                    'paint': {
                        'fill-extrusion-color': '#ffffff',
                        'fill-extrusion-height': EXTRUSION_HEIGHT_EXPRESSION,
                        'fill-extrusion-base': EXTRUSION_HEIGHT_EXPRESSION, 
                        'fill-extrusion-opacity': 0.1
                    }
                });

                map.addLayer({
                    'id': 'province-highlight',
                    'type': 'fill-extrusion',
                    'source': 'cambodia-3d-source',
                    'paint': {
                        'fill-extrusion-color': '#ffffff',
                        'fill-extrusion-height': ['+', EXTRUSION_HEIGHT_EXPRESSION, 2000],
                        'fill-extrusion-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0]
                    }
                });

                // Interactions...
                popupRef.current = new maplibregl.Popup({
                    closeButton: false,
                    closeOnClick: false,
                    className: 'custom-map-popup',
                    offset: 80,
                    maxWidth: '300px'
                });

                map.on('mousemove', 'province-3d', (e: any) => {
                     if (e.features.length > 0) {
                        map.getCanvas().style.cursor = 'pointer';
                        const feature = e.features[0];
                        
                        if (hoverStateIdRef.current !== null) {
                            map.setFeatureState({ source: 'cambodia-3d-source', id: hoverStateIdRef.current }, { hover: false });
                        }
                        hoverStateIdRef.current = feature.id;
                        map.setFeatureState({ source: 'cambodia-3d-source', id: feature.id }, { hover: true });

                        const { displayName, realRevenue, orders, shippingCost } = feature.properties;
                        
                        let mainValue = `$${Number(realRevenue).toLocaleString()}`;
                        let mainLabel = "REVENUE";
                        let subValue = `${orders} UNITS`;
                        let subLabel = "ORDERS";

                        if (activeMetric === 'orders') {
                            mainValue = `${orders}`;
                            mainLabel = "ORDERS";
                            subValue = `$${Number(realRevenue).toLocaleString()}`;
                            subLabel = "REVENUE";
                        } else if (activeMetric === 'shipping') {
                             mainValue = `$${Number(shippingCost).toLocaleString()}`;
                             mainLabel = "SHIPPING";
                             subValue = `${orders} UNITS`;
                             subLabel = "ORDERS";
                        }

                        popupRef.current
                            .setLngLat(e.lngLat)
                            .setHTML(`
                                <div class="relative overflow-hidden bg-[#0f0518]/90 backdrop-blur-xl rounded-lg border border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.3)] min-w-[200px] group">
                                    <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                    <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
                                    
                                    <div class="p-4 relative z-10">
                                        <div class="flex items-center justify-between mb-3 pb-2 border-b border-purple-500/30">
                                            <h4 class="font-mono font-bold text-sm text-purple-100 tracking-widest uppercase">${displayName}</h4>
                                            <div class="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_10px_#facc15] animate-pulse"></div>
                                        </div>
                                        
                                        <div class="space-y-3">
                                            <div class="flex justify-between items-end">
                                                <span class="text-purple-300 text-[10px] font-bold uppercase tracking-widest">${mainLabel}</span>
                                                <span class="font-mono font-black text-xl text-yellow-300 drop-shadow-[0_0_5px_rgba(253,224,71,0.5)]">${mainValue}</span>
                                            </div>
                                            
                                            <div class="w-full h-1 bg-purple-900/50 rounded-full overflow-hidden">
                                                <div class="h-full bg-gradient-to-r from-purple-600 to-yellow-300 w-[60%] relative">
                                                    <div class="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white]"></div>
                                                </div>
                                            </div>

                                            <div class="flex justify-between items-center">
                                                <span class="text-purple-300 text-[10px] font-bold uppercase tracking-widest">${subLabel}</span>
                                                <div class="flex items-center gap-1.5">
                                                    <span class="text-xs text-purple-200 font-mono">${subValue}</span>
                                                </div>
                                            </div>
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
            
            // --- UPDATE LAYER COLORS DYNAMICALLY ---
            if (map.getLayer('province-outlines')) {
                map.setPaintProperty('province-outlines', 'line-color', getMetricColor());
            }
             if (map.getLayer('province-hover-fill')) {
                map.setPaintProperty('province-hover-fill', 'fill-color', getMetricHighlightColor());
            }

            // --- REFRESH RANK MARKERS ---
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current = [];
            processedFeatures.forEach((feature: any) => {
                const { rank, displayName, realRevenue, orders, shippingCost } = feature.properties;
                // Only show top 3 ranks
                if (rank && rank <= 3) {
                     const coords = feature.geometry.type === 'Polygon' 
                        ? feature.geometry.coordinates[0] 
                        : feature.geometry.coordinates.flat(1)[0]; 
                    if (!coords) return;
                    const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
                    coords.forEach((coord: any) => bounds.extend(coord));
                    const center = bounds.getCenter();

                    const el = document.createElement('div');
                    el.className = 'province-rank-marker';
                    
                    let displayValue = `$${(realRevenue/1000).toFixed(1)}k`;
                    if (activeMetric === 'orders') displayValue = `${orders} Orders`;
                    if (activeMetric === 'shipping') displayValue = `$${(shippingCost/1000).toFixed(1)}k Ship`;

                    el.innerHTML = `
                        <div class="flex flex-col items-center group cursor-pointer animate-float hover:z-50">
                            <div class="relative transition-transform duration-300 group-hover:scale-110">
                                <div class="absolute -inset-4 bg-purple-600/30 blur-xl rounded-full animate-pulse"></div>
                                <div class="relative bg-[#0f0518]/90 backdrop-blur-xl border border-purple-500/60 rounded-full px-4 py-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center gap-3">
                                    <div class="flex flex-col items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-yellow-400 shadow-inner">
                                        <span class="font-black text-white text-xs leading-none">#${rank}</span>
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="text-[10px] text-purple-200 font-bold uppercase tracking-wider leading-tight">${displayName}</span>
                                        <span class="text-[9px] text-yellow-300 font-mono">${displayValue}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* THE POLE / BEAM */}
                            <div class="w-px h-16 bg-gradient-to-b from-purple-500 via-purple-500/50 to-transparent relative">
                                <div class="absolute inset-0 bg-purple-400 blur-[2px] opacity-50"></div>
                            </div>
                            
                            {/* BASE EFFECT ON GROUND */}
                            <div class="w-8 h-8 border border-purple-500/30 rounded-full flex items-center justify-center -mt-2 animate-[spin_8s_linear_infinite]">
                                <div class="w-6 h-6 border border-dashed border-purple-500/50 rounded-full"></div>
                                <div class="absolute w-2 h-2 bg-purple-500 blur-sm rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    `;
                    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -40] }).setLngLat(center).addTo(map);
                    markersRef.current.push(marker);
                }
            });

        } catch (e) {
            console.error("Layer Update Error:", e);
        }
        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }, [isMapReady, rawGeoJson, statsMap, topRanks, activeMetric]); 

    if (geoError || mapError) {
        return (
            <div className="w-full h-[500px] flex items-center justify-center bg-gray-900/50 rounded-3xl border border-red-500/20 text-red-400">
                <p>Map Error: {geoError || mapError}</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[650px] xl:h-[750px] bg-[#0f0518] rounded-[2.5rem] border border-purple-500/20 shadow-[0_0_60px_rgba(88,28,135,0.4)] overflow-hidden group">
            
            {/* Header / Title Overlay - Minimalist Centered Pill */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <div className="flex items-center gap-4 bg-[#0f0518]/60 backdrop-blur-md px-6 py-2.5 rounded-full border border-purple-500/30 shadow-2xl">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div>
                        <span className="text-[10px] text-purple-300 font-mono uppercase tracking-widest">Live Geo-Data</span>
                    </div>
                    <div className="w-px h-3 bg-white/10"></div>
                    <h2 className="text-sm font-bold text-white tracking-wide uppercase font-sans">
                        Cambodia <span className="text-yellow-400">Nexus</span>
                    </h2>
                </div>
            </div>

            {/* CONTROL PANEL (Floating) */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-3 z-10">
                <div className="flex flex-col bg-[#0f0518]/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-1.5 shadow-2xl">
                     <button 
                        onClick={() => setActiveMetric('revenue')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-between gap-3 ${activeMetric === 'revenue' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-400 hover:bg-purple-900/50'}`}
                     >
                        <span>Revenue</span>
                        {activeMetric === 'revenue' && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></div>}
                     </button>
                     <button 
                        onClick={() => setActiveMetric('orders')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-between gap-3 ${activeMetric === 'orders' ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-purple-400 hover:bg-purple-900/50'}`}
                     >
                        <span>Orders</span>
                        {activeMetric === 'orders' && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                     </button>
                     <button 
                        onClick={() => setActiveMetric('shipping')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-between gap-3 ${activeMetric === 'shipping' ? 'bg-emerald-600 text-white shadow-lg' : 'text-purple-400 hover:bg-purple-900/50'}`}
                     >
                        <span>Shipping</span>
                        {activeMetric === 'shipping' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></div>}
                     </button>
                </div>
            </div>

            {/* SCANNIG RADAR BEAM */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-purple-400 to-transparent absolute top-0 animate-scan blur-[1px]"></div>
                <div className="w-full h-[100px] bg-gradient-to-b from-purple-400/5 to-transparent absolute top-0 animate-scan"></div>
            </div>

            {/* HOLOGRAPHIC GRID OVERLAY */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-10" style={{
                backgroundImage: `
                    linear-gradient(to right, rgba(168, 85, 247, 0.3) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(168, 85, 247, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
                maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
            }}></div>

            {/* DIGITAL PARTICLES */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                 {[...Array(20)].map((_, i) => (
                    <div key={i} className="absolute w-0.5 h-0.5 bg-yellow-300 rounded-full animate-float-particle" style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${10 + Math.random() * 10}s`,
                        opacity: Math.random() * 0.5
                    }}></div>
                 ))}
            </div>

            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-900/10 blur-[120px] pointer-events-none rounded-full mix-blend-screen"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-900/10 blur-[120px] pointer-events-none rounded-full mix-blend-screen"></div>

            <div ref={mapContainerRef} className="w-full h-full" />
            
            {(!isMapReady || geoLoading) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f0518] z-20">
                    <div className="w-20 h-20 border-t-2 border-b-2 border-purple-500 rounded-full animate-spin flex items-center justify-center relative">
                         <div className="w-16 h-16 border-l-2 border-r-2 border-yellow-300 rounded-full animate-reverse-spin"></div>
                         <div className="absolute inset-0 bg-purple-500/10 blur-xl animate-pulse"></div>
                    </div>
                    <p className="mt-6 text-xs font-black text-purple-400 uppercase tracking-[0.3em] animate-pulse">Initializing Neural Link...</p>
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
                
                @keyframes reverse-spin {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                .animate-reverse-spin {
                    animation: reverse-spin 3s linear infinite;
                }

                @keyframes float-particle {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    10% { opacity: 0.5; }
                    90% { opacity: 0.5; }
                    100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
                }
                .animate-float-particle {
                    animation: float-particle linear infinite;
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
