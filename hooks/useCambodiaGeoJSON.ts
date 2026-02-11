
import { useState, useEffect } from 'react';
import { GEOJSON_URLS } from '../utils/mapUtils';

export const useCambodiaGeoJSON = () => {
    const [geoJson, setGeoJson] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchGeoJSON = async () => {
            // Try fetching from multiple sources until one succeeds
            for (const url of GEOJSON_URLS) {
                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        // Validate that the data is actually a GeoJSON feature collection AND has features
                        if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
                            if (isMounted) {
                                setGeoJson(data);
                                setLoading(false);
                            }
                            return;
                        } else {
                            console.warn(`Fetched data from ${url} is not valid GeoJSON`);
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to load ${url}`, e);
                }
            }

            if (isMounted) {
                setError("មិនអាចទាញយកទិន្នន័យផែនទីបានទេ");
                setLoading(false);
            }
        };

        // Catch any sync errors in the async function setup
        fetchGeoJSON().catch(err => {
            console.error("GeoJSON Fetch Fatal Error:", err);
            if (isMounted) {
                setError("Error loading map data");
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
        };
    }, []);

    return { geoJson, loading, error };
};
