
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useCambodiaGeoJSON } from '../../hooks/useCambodiaGeoJSON';
import { normalizeName } from '../../utils/mapUtils';
import MapLegend from './map/MapLegend';
import { useMapEngine } from '../../hooks/useMapEngine';
import { EXTRUSION_HEIGHT_EXPRESSION, FILL_COLOR_EXPRESSION } from './map/mapStyles';

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
    const hoverStateIdRef = useRef<string | number | null>(null);

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

    // 4. Update Map Logic (3D Layers)
    useEffect(() => {
        if (!isMapReady || !map || !rawGeoJson) return;

        try {
            // @ts-ignore
            const maplibregl = window.maplibregl;

            // Prepare Source Data with Stats
            const processedFeatures = rawGeoJson.features.map((feature: any) => {
                const props = feature.properties || {};
                const namesToTry = [props.name_kh, props.Name_KH, props.name_en, props.Name_EN, props.name, props.shapeName];
                let revenue = 0;
                let orders = 0;
                let displayName = props.name_en || props.shapeName || "Province";

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
                return { ...feature, properties: { ...props, revenue, orders, displayName } };
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

                // --- 3D EXTRUSION LAYER (NEW TECH) ---
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

                // Line Layer for definition
                map.addLayer({
                    'id': 'province-outlines',
                    'type': 'line',
                    'source': 'cambodia-3d-source',
                    'paint': {
                        'line-color': '#94a3b8',
                        'line-width': 1,
                        'line-opacity': 0.3
                    }
                });

                // Highlight Layer (Interaction)
                map.addLayer({
                    'id': 'province-highlight',
                    'type': 'fill-extrusion',
                    'source': 'cambodia-3d-source',
                    'paint': {
                        'fill-extrusion-color': '#fbbf24',
                        'fill-extrusion-height': [
                            '+', 
                            EXTRUSION_HEIGHT_EXPRESSION, 
                            5000 // Pop up slightly when hovered
                        ],
                        'fill-extrusion-opacity': [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            1,
                            0
                        ]
                    }
                });

                // Initialize Popup
                popupRef.current = new maplibregl.Popup({
                    closeButton: false,
                    closeOnClick: false,
                    className: 'custom-map-popup',
                    offset: 20
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

                        // HTML Popup
                        const { displayName, revenue, orders } = feature.properties;
                        popupRef.current
                            .setLngLat(e.lngLat)
                            .setHTML(`
                                <div class="px-4 py-3 text-gray-900 min-w-[160px]">
                                    <h4 class="font-black text-sm uppercase text-gray-800 border-b border-gray-200 pb-1 mb-1">${displayName}</h4>
                                    <div class="flex justify-between text-xs mb-1"><span class="text-gray-500 font-bold">Revenue:</span><span class="font-black text-blue-600">$${revenue.toLocaleString()}</span></div>
                                    <div class="flex justify-between text-xs"><span class="text-gray-500 font-bold">Orders:</span><span class="font-black text-gray-800">${orders}</span></div>
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
        } catch (e) {
            console.error("Layer Update Error:", e);
        }
    }, [isMapReady, rawGeoJson, statsMap]);

    if (geoError || mapError) {
        return (
            <div className="w-full h-[500px] flex items-center justify-center bg-gray-900/50 rounded-3xl border border-red-500/20 text-red-400">
                <p>Map Error: {geoError || mapError}</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[500px] lg:h-[600px] bg-[#020617] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden group">
            <div ref={mapContainerRef} className="w-full h-full" />
            
            {(!isMapReady || geoLoading) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617] z-20">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] animate-pulse">Initializing 3D Engine...</p>
                </div>
            )}

            <MapLegend />
            
            <style>{`
                .maplibregl-popup-content {
                    background: rgba(255, 255, 255, 0.95) !important;
                    backdrop-filter: blur(12px) !important;
                    border-radius: 16px !important;
                    padding: 0 !important;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4) !important;
                    border: 1px solid rgba(255,255,255,0.5) !important;
                    overflow: hidden !important;
                }
                .maplibregl-popup-tip { border-top-color: rgba(255, 255, 255, 0.95) !important; }
                .maplibregl-ctrl-group { background: rgba(15, 23, 42, 0.8) !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; backdrop-filter: blur(8px) !important; }
                .maplibregl-ctrl button { border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; }
                .maplibregl-ctrl-icon { filter: invert(1) !important; }
            `}</style>
        </div>
    );
};

export default ProvincialMap;
