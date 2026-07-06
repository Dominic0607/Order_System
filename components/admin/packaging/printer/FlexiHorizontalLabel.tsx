import React from 'react';
import { LabelData } from './types';
import { SmartText, SmartQR } from './SmartElements';
import { MapPin, Phone, User, Box, Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface FlexiHorizontalLabelProps {
  data: LabelData;
  qrValue: string;
  isDesignMode: boolean;
  printDensity?: number;
  watermarkIntensity?: number;
}

const FlexiHorizontalLabel: React.FC<FlexiHorizontalLabelProps> = ({ 
  data, 
  qrValue, 
  isDesignMode, 
  watermarkIntensity = 20 
}) => {
  const totalAmount = parseFloat(data.total);
  const paymentLower = (data.payment || '').toLowerCase();
  
  const isPaid = paymentLower.includes('paid') && !paymentLower.includes('unpaid');
  const isCOD = !isPaid && totalAmount > 0;

  const bgOpacity = watermarkIntensity / 100;
  
  // Scaling calculations tailored for horizontal constraints
  const getLocationBaseSize = (text: string) => {
    const len = text.length;
    if (len <= 3) return 30; 
    if (len <= 5) return 24; 
    if (len <= 8) return 20; 
    if (len <= 11) return 17; 
    if (len <= 14) return 14; 
    return 12; 
  };

  const getAddressBaseSize = (text: string) => {
    const len = text.length;
    if (len > 120) return 6;   
    if (len > 90) return 7;   
    if (len > 70) return 8;    
    if (len > 45) return 9;    
    return 10;                 
  };

  const getShippingBaseSize = (text: string) => {
    const len = text.length;
    if (len <= 8) return 8.5;
    if (len <= 14) return 7.5;
    return 6.5;
  };

  const getPriceBaseSize = (shippingLen: number, priceLen: number) => {
      let size = 16;
      if (shippingLen > 15) size = 14;
      if (priceLen > 7) size = Math.min(size, 11);
      else if (priceLen > 5) size = Math.min(size, 13);
      return size;
  };

  const getPageBaseSize = (text: string) => {
    const len = text.length;
    if (len > 20) return 5;
    if (len > 12) return 6;
    return 6.5;
  };

  return (
    <div className="flex flex-col w-full h-full bg-white text-black font-sans relative box-border overflow-hidden p-1 select-none">
        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <span 
                className="text-[64pt] font-black uppercase rotate-[-15deg] text-black tracking-[0.15em]"
                style={{ opacity: bgOpacity }}
            >
                {isPaid ? 'PAID' : (isCOD ? 'C.O.D' : 'ORDER')}
            </span>
        </div>
        
        <div className="relative z-10 flex flex-col h-full justify-between">
            {/* 1. HEADER ROW */}
            <div className="flex justify-between items-start shrink-0 px-2 pt-1 pb-1 border-b border-black/10">
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 bg-black rounded-md flex items-center justify-center text-white shrink-0">
                            <Box size={8} strokeWidth={3} />
                        </div>
                        <SmartText storageKey="flexih_store" isDesignMode={isDesignMode} initialValue={data.store} baseSize={9.5} bold font="sans" className="uppercase tracking-tight leading-none" />
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 overflow-hidden pl-0.5">
                         <SmartText storageKey="flexih_id" isDesignMode={isDesignMode} initialValue={data.id} baseSize={8} font="mono" className="text-black font-bold whitespace-nowrap shrink-0" />
                         <span className="text-black/20 text-[7px] font-bold">|</span>
                         <SmartText storageKey="flexih_user" isDesignMode={isDesignMode} initialValue={data.user} baseSize={6.5} font="sans" bold className="text-black/60 uppercase whitespace-nowrap shrink-0" />
                         {data.page && (
                             <>
                                 <span className="text-black/20 text-[7px] font-bold">/</span>
                                 <SmartText storageKey="flexih_page" isDesignMode={isDesignMode} initialValue={data.page} baseSize={getPageBaseSize(data.page)} font="sans" bold className="text-black/60 uppercase whitespace-nowrap truncate" />
                             </>
                         )}
                    </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                    <span className="text-[4.5pt] font-bold text-black uppercase tracking-wider leading-none">Created</span>
                    <SmartText storageKey="flexih_date" isDesignMode={isDesignMode} initialValue={data.date} baseSize={6} font="mono" bold className="text-black" />
                </div>
            </div>

            {/* 2. BODY COLUMNS */}
            <div className="flex-1 flex min-h-0 py-1 gap-2">
                {/* Left Column: Customer and Logistics */}
                <div className="flex-1 flex flex-col justify-between min-w-0 pl-1">
                    {/* Recipient Details */}
                    <div className="flex flex-col gap-0.5 py-1">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3.5 h-3.5 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                                <User size={7} className="text-black" />
                            </div>
                            <SmartText storageKey="flexih_name" isDesignMode={isDesignMode} initialValue={data.name} baseSize={9.5} bold font="sans" className="uppercase text-black truncate" />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3.5 h-3.5 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                                <Phone size={7} className="text-black" />
                            </div>
                            <SmartText storageKey="flexih_phone" isDesignMode={isDesignMode} initialValue={data.phone} baseSize={10} bold font="sans" className="text-black" />
                        </div>
                        {data.user && (
                            <div className="flex items-center gap-1.5">
                                <div className="w-3.5 h-3.5 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                                    <span className="text-[4.5pt] font-black text-black/60">USER</span>
                                </div>
                                <SmartText storageKey="flexih_user_by" isDesignMode={isDesignMode} initialValue={data.user} baseSize={8} bold font="sans" className="uppercase text-black" />
                            </div>
                        )}
                    </div>

                    {/* Logistics Card (Location & Address) - Flexi Black Style */}
                    <div className="bg-black rounded-xl p-2 flex flex-col justify-center relative overflow-hidden text-white flex-1 min-h-[22mm] mb-0.5">
                        <div className="absolute -right-2 -top-2 text-white/10 pointer-events-none">
                            <MapPin size={36} strokeWidth={4} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="pt-0.5">
                                <SmartText 
                                    storageKey="flexih_location"
                                    isDesignMode={isDesignMode} 
                                    initialValue={data.location} 
                                    baseSize={getLocationBaseSize(data.location)} 
                                    bold 
                                    font="sans" 
                                    className="uppercase leading-[0.9] tracking-tight text-white mb-0.5 whitespace-nowrap" 
                                />
                            </div>
                            <div className="pt-0.5 border-t border-white/20">
                                <div className="flex items-start gap-1">
                                    <MapPin size={9} strokeWidth={2.5} className="text-white mt-[2px] shrink-0" />
                                    <SmartText 
                                        storageKey="flexih_address"
                                        isDesignMode={isDesignMode} 
                                        initialValue={data.address} 
                                        baseSize={getAddressBaseSize(data.address)} 
                                        font="sans" 
                                        bold
                                        block 
                                        className="text-white/90 leading-[1.1] line-clamp-2" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: QR and Pricing */}
                <div className="w-[26mm] flex flex-col justify-between shrink-0 border-l border-black/10 pl-2 pr-1">
                    {/* QR Area */}
                    <div className="bg-white border border-black rounded-lg flex flex-col items-center justify-center p-1 shrink-0 relative">
                        <SmartQR storageKey="flexih_qr" value={qrValue} baseSize={48} isDesignMode={isDesignMode} />
                        {isCOD && (
                             <span className="absolute -top-1 -right-1 bg-black text-white text-[4.5pt] font-black px-1 rounded-sm uppercase scale-90">COD</span>
                        )}
                    </div>

                    {/* Price and Status Box */}
                    <div className="flex-grow flex flex-col justify-end mt-1">
                        {/* Shipping */}
                        <div className="mb-0.5 border-t border-dashed border-black/10 pt-0.5">
                            <SmartText 
                                storageKey="flexih_shipping"
                                isDesignMode={isDesignMode} 
                                initialValue={data.shipping} 
                                baseSize={getShippingBaseSize(data.shipping)} 
                                bold 
                                font="sans" 
                                className="uppercase text-black leading-none truncate text-center block" 
                            />
                        </div>
                        
                        {/* Total Price */}
                        <div className="flex flex-col items-center mb-1">
                            <div className="flex items-baseline gap-0.5 leading-none">
                                <span className="text-[6.5pt] font-bold text-black">$</span>
                                <SmartText 
                                    storageKey="flexih_total"
                                    isDesignMode={isDesignMode} 
                                    initialValue={data.total} 
                                    baseSize={getPriceBaseSize(data.shipping.length, data.total.length)} 
                                    bold 
                                    font="sans" 
                                    className="tracking-tighter leading-none text-black font-black" 
                                />
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="px-1 py-0.5 rounded-full flex items-center justify-center gap-1 border bg-white border-black text-black">
                            {isPaid ? <CheckCircle2 size={7} className="text-black" /> : <AlertTriangle size={7} fill="currentColor" className="text-black shrink-0" />}
                            <span className="text-[6pt] font-black uppercase tracking-wider leading-none">
                                {isPaid ? 'PAID' : 'UNPAID'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default FlexiHorizontalLabel;
