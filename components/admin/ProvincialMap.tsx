
import React, { useEffect, useState, useMemo, useRef } from 'react';

interface ProvinceStat {
    name: string;
    revenue: number;
    orders: number;
}

interface ProvincialMapProps {
    data: ProvinceStat[];
}

/**
 * ប្រើប្រាស់ GitHub Raw URL ត្រឹមត្រូវទៅកាន់ Master Branch
 */
const CAMBODIA_GEOJSON_URL = "https://raw.githubusercontent.com/seanghai/cambodia-geojson/master/provinces.json";

// Projection coordinates for Cambodia
const BOUNDS = {
    minLng: 102.3, maxLng: 107.6,
    minLat: 10.4, maxLat: 14.7
};

const COLOR_PALETTE = ['#1f2937', '#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];
const REVENUE_THRESHOLDS = [0, 500, 1000, 5000, 10000, 20000];

const ProvincialMap: React.FC<ProvincialMapProps> = ({ data }) => {
    const [geoJson, setGeoJson] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoveredProvince, setHoveredProvince] = useState<any>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const normalizeName = (name: string) => {
        if (!name) return "";
        return String(name).toLowerCase()
            .replace(/\s/g, '')
            .replace(/province|city|រាជធានី|ខេត្ត/g, '')
            .trim();
    };

    const statsMap = useMemo(() => {
        const stats: Record<string, ProvinceStat> = {};
        data.forEach(item => {
            const key = normalizeName(item.name);
            if (!key) return;
            if (!stats[key]) {
                stats[key] = { ...item };
            } else {
                stats[key].revenue += item.revenue;
                stats[key].orders += item.orders;
            }
        });
        return stats;
    }, [data]);

    const fetchGeoJson = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(CAMBODIA_GEOJSON_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const json = await response.json();
            setGeoJson(json);
            setLoading(false);
        } catch (err: any) {
            console.error("Map Fetch Error:", err);
            setError("មិនអាចទាញយកទិន្នន័យផែនទីបានទេ។ សូមពិនិត្យ Internet ឬទាក់ទងអ្នកគ្រប់គ្រង។");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGeoJson();
    }, []);

    const project = (lng: number, lat: number) => {
        const width = 1000, height = 1000;
        const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * width;
        const y = height - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * height;
        return [x, y];
    };

    const getColor = (revenue: number) => {
        if (revenue === 0) return COLOR_PALETTE[0];
        for (let i = REVENUE_THRESHOLDS.length - 1; i >= 0; i--) {
            if (revenue >= REVENUE_THRESHOLDS[i]) return COLOR_PALETTE[i];
        }
        return COLOR_PALETTE[0];
    };

    const mapElements = useMemo(() => {
        if (!geoJson) return null;
        return geoJson.features.map((feature: any, i: number) => {
            const props = feature.properties || {};
            const namesToTry = [props.name_kh, props.Name_KH, props.name_en, props.name, props.HRNAME_KH];
            let provinceStats = { revenue: 0, orders: 0 };
            let displayName = props.name_kh || props.name_en || "មិនស្គាល់";

            for (const n of namesToTry) {
                const key = normalizeName(String(n));
                if (n && statsMap[key]) {
                    provinceStats = statsMap[key];
                    break;
                }
            }

            const geometryType = feature.geometry.type;
            const coordinates = feature.geometry.coordinates;

            const drawRing = (ring: [number, number][]) => {
                return "M " + ring.map((coord: any) => {
                    const [x, y] = project(coord[0], coord[1]);
                    return `${x.toFixed(2)},${y.toFixed(2)}`;
                }).join(" L ") + " Z";
            };

            let d = "";
            if (geometryType === 'Polygon') {
                d = coordinates.map((ring: any) => drawRing(ring)).join(" ");
            } else if (geometryType === 'MultiPolygon') {
                d = coordinates.map((polygon: any) => polygon.map((ring: any) => drawRing(ring)).join(" ")).join(" ");
            }

            const color = getColor(provinceStats.revenue);
            const isHovered = hoveredProvince?.name === displayName;

            return (
                <path
                    key={i}
                    d={d}
                    fill={color}
                    stroke={isHovered ? "#ffffff" : "rgba(255,255,255,0.1)"}
                    strokeWidth={isHovered ? "2.5" : "0.5"}
                    onMouseEnter={(e) => {
                        setHoveredProvince({ ...provinceStats, name: displayName });
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseLeave={() => setHoveredProvince(null)}
                    className="cursor-pointer transition-all duration-200 outline-none hover:brightness-125"
                />
            );
        });
    }, [geoJson, statsMap, hoveredProvince]);

    return (
        <div ref={containerRef} className="relative w-full h-[500px] lg:h-[600px] bg-gray-950/20 rounded-3xl border border-gray-800 shadow-2xl overflow-hidden group">
            {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-sm z-10">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-xs font-bold text-gray-500 animate-pulse">កំពុងទាញយកផែនទី...</p>
                </div>
            ) : error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                    <p className="text-red-400 font-bold mb-4">{error}</p>
                    <button onClick={fetchGeoJson} className="btn btn-primary text-xs px-8">សាកល្បងម្ដងទៀត</button>
                </div>
            ) : (
                <svg viewBox="0 0 1000 1000" className="w-full h-full p-4 sm:p-12 drop-shadow-2xl" preserveAspectRatio="xMidYMid meet">
                    <g className="map-layer">{mapElements}</g>
                </svg>
            )}

            {hoveredProvince && (
                <div className="absolute pointer-events-none z-50 p-4 bg-gray-900/90 backdrop-blur-xl text-white rounded-2xl border border-gray-700/50 shadow-2xl min-w-[180px] animate-fade-in-scale"
                     style={{ left: `${Math.min(mousePos.x + 15, (containerRef.current?.clientWidth || 0) - 200)}px`, top: `${mousePos.y - 100}px` }}>
                    <p className="font-black text-xs uppercase tracking-widest text-blue-400 mb-2">{hoveredProvince.name}</p>
                    <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between"><span>ចំណូល:</span><span className="font-black text-white">${hoveredProvince.revenue.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>ការកុម្ម៉ង់:</span><span className="font-bold">{hoveredProvince.orders}</span></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProvincialMap;
