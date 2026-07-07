import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, Upload, AlertCircle, Check, X } from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor';
import { fileToDataUrl } from '../../utils/fileUtils';

interface CameraCaptureProps {
    onCapture: (base64Data: string) => void;
    onCancel: () => void;
    orderId?: string;
    customerName?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
    onCapture,
    onCancel,
    orderId,
    customerName
}) => {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string>('');
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
    const [mode, setMode] = useState<'camera' | 'file'>('camera');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Enumerate video devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                // Request initial temporary permission to unlock labels
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                tempStream.getTracks().forEach(track => track.stop());

                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
                setDevices(videoDevices);
                
                if (videoDevices.length > 0) {
                    // Look for environment / back / rear camera as preferred default
                    const backCamera = videoDevices.find(d => 
                        d.label.toLowerCase().includes('back') || 
                        d.label.toLowerCase().includes('environment') ||
                        d.label.toLowerCase().includes('rear')
                    );
                    setSelectedDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
                }
            } catch (err: any) {
                console.warn("Could not access camera devices:", err);
                setMode('file');
                setError("មិនអាចបើកកាមេរ៉ាបានទេ ឬមិនមានការអនុញ្ញាត (Camera access denied or unsupported)");
            }
        };

        if (mode === 'camera') {
            getDevices();
        }

        return () => {
            stopCamera();
        };
    }, [mode]);

    // Start or switch camera stream
    useEffect(() => {
        if (mode === 'camera' && selectedDeviceId) {
            startCamera();
        }
        return () => {
            stopCamera();
        };
    }, [selectedDeviceId, mode]);

    const startCamera = async () => {
        stopCamera();
        setError('');
        try {
            const constraints: MediaStreamConstraints = {
                video: {
                    deviceId: { exact: selectedDeviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setIsCameraActive(true);
        } catch (err: any) {
            console.error("Error starting camera:", err);
            setError("មិនអាចបើកដំណើរការកាមេរ៉ានេះបានទេ (Could not start selected camera)");
            
            // Fallback: try default camera without deviceId constraints
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
                setStream(fallbackStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream;
                }
                setIsCameraActive(true);
                setError('');
            } catch (e) {
                setMode('file');
            }
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/webp', 0.85);
        setCapturedPhoto(dataUrl);
        stopCamera();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            const compressed = await compressImage(file, 'balanced');
            const dataUrl = await fileToDataUrl(compressed);
            setCapturedPhoto(dataUrl);
        } catch (err: any) {
            console.error("Compression failed:", err);
            setError("ការបង្ហាប់រូបភាពបរាជ័យ (Image compression failed)");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (capturedPhoto) {
            onCapture(capturedPhoto);
        }
    };

    const handleRetake = () => {
        setCapturedPhoto(null);
        if (mode === 'camera') {
            startCamera();
        }
    };

    return (
        <div className="space-y-4">
            {/* Mode Tabs */}
            <div className="flex bg-[#0B0E11] p-1 rounded-xl border border-[#2B3139]">
                <button
                    type="button"
                    onClick={() => { setMode('camera'); setCapturedPhoto(null); setError(''); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${mode === 'camera' ? 'bg-[#2B3139] text-[#EAECEF]' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Camera size={14} />
                    ប្រើប្រាស់ Camera (Webcam)
                </button>
                <button
                    type="button"
                    onClick={() => { setMode('file'); setCapturedPhoto(null); stopCamera(); setError(''); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${mode === 'file' ? 'bg-[#2B3139] text-[#EAECEF]' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Upload size={14} />
                    Upload File រូបភាព
                </button>
            </div>

            {/* Video Stream / Capture Area */}
            <div className="relative aspect-[4/3] sm:aspect-video bg-black rounded-xl overflow-hidden border-2 border-[#2B3139] shadow-inner flex items-center justify-center">
                {capturedPhoto ? (
                    <div className="relative w-full h-full animate-in zoom-in-95 duration-200">
                        <img src={capturedPhoto} className="w-full h-full object-cover" alt="Captured return package" />
                    </div>
                ) : mode === 'camera' ? (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        {/* Viewfinder Corners overlay */}
                        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#FCD535]/50 rounded-tl-sm pointer-events-none"></div>
                        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#FCD535]/50 rounded-tr-sm pointer-events-none"></div>
                        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#FCD535]/50 rounded-bl-sm pointer-events-none"></div>
                        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#FCD535]/50 rounded-br-sm pointer-events-none"></div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-4 text-center px-4 py-8">
                        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative group">
                            <Upload className="w-8 h-8 text-gray-500 group-hover:text-[#FCD535] transition-colors" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-[#EAECEF] uppercase tracking-widest">ជ្រើសរើសឯកសាររូបភាព</p>
                            <p className="text-[10px] text-gray-500 mt-1">ចុចទីនេះ ឬទាញឯកសារទម្លាក់ចូលទីនេះ</p>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                    </div>
                )}

                {/* Loading state overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-xs z-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FCD535]"></div>
                    </div>
                )}

                {/* Error Banner */}
                {error && !capturedPhoto && (
                    <div className="absolute inset-x-0 bottom-0 bg-[#F6465D]/90 text-white p-3 text-center text-xs font-bold flex items-center justify-center gap-2">
                        <AlertCircle size={14} />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Device selection (only if camera mode, inactive photo) */}
            {mode === 'camera' && !capturedPhoto && devices.length > 1 && (
                <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">
                        ជ្រើសរើស Camera:
                    </label>
                    <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="flex-1 bg-[#0B0E11] border border-[#2B3139] text-[#EAECEF] rounded-lg p-2 text-xs font-bold outline-none focus:border-[#FCD535]/50"
                    >
                        {devices.map((device, index) => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `Camera ${index + 1}`}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={startCamera}
                        title="Restart Camera"
                        className="bg-[#2B3139] hover:bg-[#3B424A] text-gray-400 hover:text-white p-2 rounded-lg transition-colors border border-[#3B424A]"
                    >
                        <RefreshCw size={14} className={isCameraActive ? '' : 'animate-spin'} />
                    </button>
                </div>
            )}

            {/* Hidden canvas for taking snapshots */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Actions Footer */}
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-3 bg-[#2B3139] hover:bg-[#3B424A] text-[#848E9C] hover:text-[#EAECEF] font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                    បោះបង់ (Cancel)
                </button>
                
                {capturedPhoto ? (
                    <>
                        <button
                            type="button"
                            onClick={handleRetake}
                            className="flex-1 py-3 bg-[#F6465D]/10 hover:bg-[#F6465D]/20 text-[#F6465D] font-black text-xs uppercase tracking-wider rounded-xl transition-all border border-[#F6465D]/20"
                        >
                            ថតឡើងវិញ (Retake)
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="flex-[2] py-3 bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-[#0B0E11] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#0ECB81]/10 flex items-center justify-center gap-2"
                        >
                            <Check size={16} strokeWidth={3} />
                            យល់ព្រម (Confirm)
                        </button>
                    </>
                ) : (
                    mode === 'camera' && (
                        <button
                            type="button"
                            onClick={capturePhoto}
                            disabled={!isCameraActive}
                            className="flex-[2] py-3 bg-[#FCD535] hover:bg-[#FCD535]/90 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#FCD535]/10"
                        >
                            <Camera size={16} strokeWidth={2.5} />
                            ថតរូបភាព (Capture)
                        </button>
                    )
                )}
            </div>
        </div>
    );
};
