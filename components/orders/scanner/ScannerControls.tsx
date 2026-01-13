
import React from 'react';

interface ScannerControlsProps {
    zoom: number;
    zoomCapabilities: { min: number; max: number; step: number } | null;
    handleZoomChange: (zoom: number) => void;
    scanMode: 'single' | 'increment';
    setScanMode: (mode: 'single' | 'increment') => void;
    onOpenHistory: () => void;
}

const ScannerControls: React.FC<ScannerControlsProps> = ({
    zoom,
    zoomCapabilities,
    handleZoomChange,
    scanMode,
    setScanMode,
    onOpenHistory
}) => {
    return (
        <div className="absolute bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col gap-6 pointer-events-none"
             style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            
            {/* Zoom Slider */}
            {zoomCapabilities && (
                <div className="flex items-center gap-3 px-2 pointer-events-auto">
                    <span className="text-[9px] font-black text-gray-500 w-6 text-center">1x</span>
                    <input 
                        type="range" 
                        min={zoomCapabilities.min} 
                        max={zoomCapabilities.max} 
                        step={zoomCapabilities.step} 
                        value={zoom} 
                        onChange={(e) => handleZoomChange(parseFloat(e.target.value))} 
                        className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-[9px] font-black text-gray-500 w-6 text-center">{zoomCapabilities.max}x</span>
                </div>
            )}

            <div className="flex justify-between items-center gap-3 pointer-events-auto">
                <div className="flex bg-gray-800 p-1.5 rounded-2xl border border-white/10 shadow-lg flex-grow max-w-[200px] mx-auto">
                    <button 
                        onClick={() => setScanMode('single')} 
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${scanMode === 'single' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Single
                    </button>
                    <button 
                        onClick={() => setScanMode('increment')} 
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${scanMode === 'increment' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Multi
                    </button>
                </div>
            </div>

            <div 
                className="w-full flex justify-center pb-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity pointer-events-auto"
                onClick={onOpenHistory}
            >
                <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Swipe for History</span>
                </div>
            </div>
        </div>
    );
};

export default ScannerControls;
