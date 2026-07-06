import React from 'react';
import { LabelData } from './types';
import { SmartText, SmartQR } from './SmartElements';
import { MapPin, Phone, User, Box, Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface FlexiMinimalLabelProps {
  data: LabelData;
  qrValue: string;
  isDesignMode: boolean;
  printDensity?: number;
  watermarkIntensity?: number;
}

const FlexiMinimalLabel: React.FC<FlexiMinimalLabelProps> = ({ 
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
  
  const getLocationBaseSize = (text: string) => {
    const len = text.length;
    if (len <= 3) return 42; 
    if (len <= 5) return 32; 
    if (len <= 8) return 26; 
    if (len <= 11) return 22; 
    if (len <= 14) return 19; 
    if (len <= 18) return 16;
    if (len <= 24) return 14;
    return 12; 
  };

  const getAddressBaseSize = (text: string) => {
    const len = text.length;
    if (len > 130) return 6;   
    if (len > 100) return 7;   
    if (len > 75) return 8;    
    if (len > 50) return 9;    
    if (len > 35) return 10;   
    return 11;                 
  };

  const getShippingBaseSize = (text: string) => {
    const len = text.length;
    if (len <= 8) return 11;
    if (len <= 14) return 10;
    if (len <= 20) return 9;
    if (len <= 28) return 8.5;
    return 7;
  };

  const getCODBaseSize = (text: string) => {
    const len = text.length;
    if (len <= 5) return 16; 
    if (len <= 7) return 14; 
    if (len <= 9) return 12;
    return 10;
  };

  const getPriceBaseSize = (shippingLen: number, priceLen: number) => {
      let size = 20;
      if (shippingLen > 15) size = 17;
      if (shippingLen > 25) size = 15;
      if (priceLen > 7) size = Math.min(size, 14);
      else if (priceLen > 5) size = Math.min(size, 18);
      return size;
  };

  const getPageBaseSize = (text: string) => {
    const len = text.length;
    if (len > 30) return 4;
    if (len > 22) return 5;
    if (len > 15) return 6;
    return 7;
  };

  const codText = "(COD)";

  return (
    <div className="flex flex-col w-full h-full bg-white text-black font-sans relative box-border overflow-hidden select-none">
        {/* Background Watermark - Fainter in minimal design */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <span 
                className="text-[82pt] font-black uppercase rotate-[-45deg] text-black tracking-[0.2em]"
                style={{ opacity: bgOpacity * 0.5 }}
            >
                {isPaid ? 'PAID' : (isCOD ? 'C.O.D' : 'ORDER')}
            </span>
        </div>
        
        {/* 1. HEADER & STORE IDENTITY */}
        <div className="px-3 pt-1.5 pb-0 flex justify-between items-start shrink-0 z-10">
            <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-1.5 mb-0"> 
                    <div className="w-5 h-5 border border-black rounded-md flex items-center justify-center text-black shrink-0">
                        <Box size={10} strokeWidth={3} />
                    </div>
                    <SmartText storageKey="flexim_store" isDesignMode={isDesignMode} initialValue={data.store} baseSize={10} bold font="sans" className="uppercase tracking-tight leading-none" />
                </div>
                {/* ID & USER INFO ROW */}
                <div className="pl-1 -mt-[1px] flex items-center gap-1.5 overflow-hidden"> 
                     <SmartText storageKey="flexim_id" isDesignMode={isDesignMode} initialValue={data.id} baseSize={8} font="mono" className="text-black font-bold whitespace-nowrap shrink-0" />
                     
                     <span className="text-black/20 text-[8px] font-bold">|</span>
                     
                     <div className="flex items-center gap-1 min-w-0">
                        <SmartText storageKey="flexim_user" isDesignMode={isDesignMode} initialValue={data.user} baseSize={7} font="sans" bold className="text-black/60 uppercase whitespace-nowrap flex-shrink-0" />
                        {data.page && (
                            <>
                               <span className="text-black/20 text-[8px] font-bold">/</span>
                               <SmartText 
                                    storageKey="flexim_page"
                                    isDesignMode={isDesignMode} 
                                    initialValue={data.page} 
                                    baseSize={getPageBaseSize(data.page)} 
                                    font="sans" 
                                    bold 
                                    className="text-black/60 uppercase whitespace-nowrap truncate" 
                               />
                            </>
                        )}
                     </div>
                </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
                <span className="text-[5pt] font-bold text-black uppercase tracking-wider">Created</span>
                <SmartText storageKey="flexim_date" isDesignMode={isDesignMode} initialValue={data.date} baseSize={6.5} font="mono" bold className="text-black" />
            </div>
        </div>
        
        {/* 2. MAIN LOGISTICS CARD (LOCATION & ADDRESS) - Minimal High Contrast Border Style */}
        <div className="mx-2 mt-1 bg-white border-2 border-black rounded-2xl p-3 flex flex-col justify-center relative overflow-hidden group grow min-h-0 text-black z-10">
            <div className="absolute -right-2 -top-2 text-black/5 pointer-events-none">
                <MapPin size={48} strokeWidth={4} />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-center">
                <div className="mb-auto pt-0.5"> 
                    <SmartText 
                        storageKey="flexim_location"
                        isDesignMode={isDesignMode} 
                        initialValue={data.location} 
                        baseSize={getLocationBaseSize(data.location)} 
                        bold 
                        font="sans" 
                        className="uppercase leading-[0.85] tracking-tight text-black mb-0.5 whitespace-nowrap" 
                    />
                </div>
                
                {/* Address Section */}
                <div className="relative z-10 pt-1 border-t-2 border-black mt-0.5">
                    <div className="flex items-start gap-1">
                        <MapPin size={11} strokeWidth={2.5} className="text-black mt-[3px] shrink-0" />
                        <SmartText 
                            storageKey="flexim_address"
                            isDesignMode={isDesignMode} 
                            initialValue={data.address} 
                            baseSize={getAddressBaseSize(data.address)} 
                            font="sans" 
                            bold
                            block 
                            className="text-black leading-[1.15] line-clamp-2" 
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* 3. RECIPIENT INFO & COD INDICATOR */}
        <div className="px-3 py-1 flex justify-between items-center shrink-0 z-10">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                        <User size={8} className="text-black" />
                    </div>
                    <SmartText storageKey="flexim_name" isDesignMode={isDesignMode} initialValue={data.name} baseSize={10} bold font="sans" className="uppercase text-black" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                        <Phone size={8} className="text-black" />
                    </div>
                    <SmartText storageKey="flexim_phone" isDesignMode={isDesignMode} initialValue={data.phone} baseSize={11} bold font="sans" className="text-black" />
                </div>
                {data.user && (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                            <span className="text-[4.8pt] font-black text-black/60">USER</span>
                        </div>
                        <SmartText storageKey="flexim_user_by" isDesignMode={isDesignMode} initialValue={data.user} baseSize={8.5} bold font="sans" className="uppercase text-black" />
                    </div>
                )}
            </div>
            
            {/* LARGE COD SIGN */}
            {isCOD && (
                 <div className="flex items-center justify-center pr-1">
                    <SmartText 
                        storageKey="flexim_cod_label"
                        isDesignMode={isDesignMode} 
                        initialValue={codText} 
                        baseSize={getCODBaseSize(codText)} 
                        bold 
                        font="sans" 
                        className="font-black tracking-tighter text-black whitespace-nowrap"
                    />
                </div>
            )}
        </div>

        {/* 4. FOOTER GRID (QR & PAYMENT) */}
        <div className="mx-2 mb-2 mt-0.5 h-[28mm] grid grid-cols-[1fr_1.3fr] gap-2 shrink-0 z-10">
            
            {/* QR MODULE */}
            <div className="bg-white border border-black rounded-xl flex flex-col items-center justify-center relative overflow-hidden p-1.5">
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-black/20 rounded-tl-sm"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-black/20 rounded-tr-sm"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-black/20 rounded-bl-sm"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-black/20 rounded-tr-sm"></div>
                
                <div className="grow flex items-center justify-center">
                   <SmartQR storageKey="flexim_qr" value={qrValue} baseSize={76} isDesignMode={isDesignMode} />
                </div>
                <span className="text-[4.2pt] font-black uppercase tracking-[0.1em] text-black/40 mt-1 leading-none">(Driver Link)</span>
            </div>

            {/* PRICE & STATUS MODULE */}
            <div className="bg-white border border-black text-black rounded-xl flex flex-col relative overflow-hidden">
                {/* Method Header */}
                <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2 border-b border-dashed border-black/15 min-h-[32px]">
                    <Truck size={12} className="text-black shrink-0" />
                    <div className="flex-1 min-w-0">
                        <SmartText 
                            storageKey="flexim_shipping"
                            isDesignMode={isDesignMode} 
                            initialValue={data.shipping} 
                            baseSize={getShippingBaseSize(data.shipping)} 
                            bold 
                            font="sans" 
                            className="uppercase text-black leading-[1.1]" 
                            block
                            maxLines={2}
                        />
                    </div>
                </div>

                {/* Main Price Area */}
                <div className="flex-1 flex flex-col items-center justify-center pb-1">
                    <span className="text-[4.5pt] font-bold uppercase tracking-[0.2em] mb-0.5 text-black/60">
                        {isCOD ? 'Collect Amount' : 'Total Amount'}
                    </span>
                    
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-[10pt] font-bold text-black">$</span>
                        <SmartText 
                            storageKey="flexim_total"
                            isDesignMode={isDesignMode} 
                            initialValue={data.total} 
                            baseSize={getPriceBaseSize(data.shipping.length, data.total.length)} 
                            bold 
                            font="sans" 
                            className="tracking-tighter leading-none text-black font-black" 
                        />
                    </div>

                    {/* STATUS BADGE */}
                    <div className="mt-0.5 px-3 py-1 rounded-full flex items-center gap-1.5 border bg-white border-black text-black">
                        {isCOD ? <AlertTriangle size={12} fill="currentColor" className="text-black" /> : <CheckCircle2 size={12} className="text-black" />}
                        <span className="text-[9pt] font-black uppercase tracking-wider leading-none">
                            {isCOD ? 'UNPAID' : 'PAID'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default FlexiMinimalLabel;
