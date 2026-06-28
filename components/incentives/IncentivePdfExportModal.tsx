import React, { useState } from 'react';
import Modal from '../common/Modal';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Spinner from '../common/Spinner';
import { translations } from '../../translations';
import { FileText, X, Download, Terminal, Info, Activity } from 'lucide-react';

interface IncentiveResult {
    username: string;
    fullName: string;
    avatar?: string;
    role?: string;
    team?: string;
    performance: number;
    reward: number;
    isCustom: boolean;
    breakdown: { name: string; amount: number }[];
}

interface IncentivePdfExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: IncentiveResult[];
    projectName: string;
    selectedMonth: string;
    language: 'en' | 'km';
}

interface KhmerImg {
    dataUrl: string;
    ar: number;
}

const containsKhmer = (s: string) => /[\u1780-\u17FF]/.test(s);

/** Render short Khmer text into a transparent PNG for crisp PDF embedding */
const renderKhmerToImg = (
    text: string,
    sizePt: number,
    cssColor: string,
    bold = false,
): KhmerImg | null => {
    if (!text) return null;
    const SCALE   = 3;
    const fontPx  = Math.round(sizePt * 1.3333 * SCALE);
    const weight  = bold ? '700' : '400';
    const fontStr = `${weight} ${fontPx}px "Kantumruy Pro", "Noto Serif Khmer", sans-serif`;

    const measure = document.createElement('canvas');
    const mCtx    = measure.getContext('2d')!;
    mCtx.font     = fontStr;
    const textW   = Math.max(1, Math.ceil(mCtx.measureText(text).width));

    const canvas   = document.createElement('canvas');
    canvas.width   = textW + SCALE * 6;
    canvas.height  = Math.ceil(fontPx * 1.6);
    const ctx      = canvas.getContext('2d')!;
    ctx.font        = fontStr;
    ctx.fillStyle   = cssColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, SCALE * 3, canvas.height / 2);
    return { dataUrl: canvas.toDataURL('image/png'), ar: canvas.width / canvas.height };
};

/** Render multiline Khmer text with auto wordwrap into a transparent PNG */
const renderKhmerMultiline = (
    text: string,
    sizePt: number,
    cssColor: string,
    maxWidthMm: number,
    bold = false,
): KhmerImg | null => {
    if (!text) return null;
    const SCALE   = 3;
    const fontPx  = Math.round(sizePt * 1.3333 * SCALE);
    const weight  = bold ? '700' : '400';
    const fontStr = `${weight} ${fontPx}px "Kantumruy Pro", "Noto Serif Khmer", sans-serif`;
    const maxWPx  = Math.max(1, Math.round(maxWidthMm * 3.7795 * SCALE));

    const measure = document.createElement('canvas');
    const mCtx    = measure.getContext('2d')!;
    mCtx.font     = fontStr;

    const finalLines: string[] = [];
    for (const para of text.split('\n')) {
        if (!para.trim()) { finalLines.push(''); continue; }
        const words = para.split(/(\s+)/);
        let line = '';
        for (const w of words) {
            const test = line + w;
            if (!line.trim() || mCtx.measureText(test).width <= maxWPx) {
                line = test;
            } else {
                finalLines.push(line.trimEnd());
                line = w.trimStart();
            }
        }
        if (line.trim()) finalLines.push(line.trim());
    }
    if (!finalLines.length) return null;

    const lineH  = Math.ceil(fontPx * 1.6);
    const canW   = finalLines.reduce(
        (mx, l) => Math.max(mx, Math.ceil(mCtx.measureText(l).width)), 1,
    ) + SCALE * 6;
    const canH   = lineH * finalLines.length + SCALE * 4;

    const canvas  = document.createElement('canvas');
    canvas.width  = canW;
    canvas.height = canH;
    const ctx     = canvas.getContext('2d')!;
    ctx.font       = fontStr;
    ctx.fillStyle  = cssColor;
    ctx.textBaseline = 'middle';
    finalLines.forEach((ln, i) =>
        ctx.fillText(ln, SCALE * 3, SCALE * 2 + lineH * (i + 0.5)),
    );
    return { dataUrl: canvas.toDataURL('image/png'), ar: canvas.width / canvas.height };
};

/** Place a pre-rendered Khmer text PNG onto jsPDF coordinates */
const placeKhmerImg = (
    doc: any,
    img: KhmerImg,
    x: number,
    y: number,
    maxW: number,
    heightMm: number,
    align: 'left' | 'center' | 'right' = 'left',
) => {
    const h = Math.min(heightMm, maxW / img.ar);
    const w = Math.min(maxW, h * img.ar);
    let dx = x;
    if (align === 'center') dx = x + (maxW - w) / 2;
    else if (align === 'right') dx = x + maxW - w;
    doc.addImage(img.dataUrl, 'PNG', dx, y, w, h);
};

const IncentivePdfExportModal: React.FC<IncentivePdfExportModalProps> = ({ 
    isOpen, 
    onClose, 
    results, 
    projectName, 
    selectedMonth,
    language
}) => {
    const t = translations[language];
    const [isGenerating, setIsGenerating] = useState(false);

    const generatePDF = () => {
        if (isGenerating) return;
        setIsGenerating(true);
        
        setTimeout(() => {
            try {
                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                }) as any;

                const pageWidth = doc.internal.pageSize.width;
                
                // Helper to draw text supporting Khmer Unicode transparently
                const addDocText = (
                    text: string,
                    x: number, y: number,
                    sizePt: number,
                    rgb: [number, number, number],
                    align: 'left' | 'center' | 'right' = 'left',
                    bold = false,
                ) => {
                    if (!text) return;
                    if (containsKhmer(text)) {
                        const cssColor = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
                        const img = renderKhmerToImg(text, sizePt, cssColor, bold);
                        if (!img) return;
                        const hMm = sizePt * 0.35278 * 1.45;
                        const wMm = hMm * img.ar;
                        let dx = x;
                        if (align === 'center') dx = x - wMm / 2;
                        else if (align === 'right') dx = x - wMm;
                        doc.addImage(img.dataUrl, 'PNG', dx, y - hMm * 0.92, wMm, hMm);
                    } else {
                        doc.setFont('helvetica', bold ? 'bold' : 'normal');
                        doc.setFontSize(sizePt);
                        doc.setTextColor(...rgb);
                        doc.text(text, x, y, { align });
                    }
                };

                // --- Top Accent Bar ---
                doc.setFillColor(30, 41, 59); // slate-800
                doc.rect(0, 0, pageWidth, 4, 'F');

                // --- Header ---
                const reportTitle = language === 'km' ? "របាយការណ៍ប្រាក់លើកទឹកចិត្ត និងប្រាក់បន្ថែម" : "Incentive & Bonus Report";
                addDocText(reportTitle, pageWidth / 2, 22, 18, [30, 41, 59], 'center', true);
                addDocText(projectName, pageWidth / 2, 30, 13, [71, 85, 105], 'center', true);

                const periodLabel = language === 'km' ? `គ្រាគណនា: ${selectedMonth}` : `Period: ${selectedMonth}`;
                const genLabel = language === 'km' ? `កាលបរិច្ឆេទបង្កើត: ${new Date().toLocaleString()}` : `Generated on: ${new Date().toLocaleString()}`;
                addDocText(periodLabel, 14, 40, 10, [100, 116, 139]);
                addDocText(genLabel, pageWidth - 14, 40, 10, [100, 116, 139], 'right');

                // --- Summary Stats ---
                const totalPayout = results.reduce((sum, r) => sum + r.reward, 0);
                const totalPerf = results.reduce((sum, r) => sum + r.performance, 0);

                doc.setFillColor(245, 247, 250);
                doc.rect(14, 45, pageWidth - 28, 15, 'F');

                const perfText = language === 'km' 
                    ? `លទ្ធផលការងារសរុប: $${totalPerf.toLocaleString()}` 
                    : `Total Performance: $${totalPerf.toLocaleString()}`;
                const payoutText = language === 'km' 
                    ? `ប្រាក់រង្វាន់សរុប: $${totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
                    : `Total Payout: $${totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

                addDocText(perfText, 20, 54, 11, [30, 41, 59], 'left', true);
                addDocText(payoutText, pageWidth - 20, 54, 11, [16, 185, 129], 'right', true);

                // --- Table Khmer Headers Pre-rendering ---
                const headerTexts = language === 'km' 
                    ? ["ល.រ", "បុគ្គលិក", "ក្រុម / តួនាទី", "លទ្ធផលការងារ", "ប្រាក់រង្វាន់"]
                    : ["#", "Personnel", "Team / Role", "Performance", "Reward Amount"];

                const headerImgs = headerTexts.map(text => {
                    if (containsKhmer(text)) {
                        return renderKhmerToImg(text, 9.5, '#ffffff', true);
                    }
                    return null;
                });

                // --- Table Data Setup ---
                const tableHead = [headerTexts];
                const tableBody = results.map((r, idx) => [
                    idx + 1,
                    r.fullName,
                    `${r.team || '-'}\n${r.role || ''}`,
                    `$${r.performance.toLocaleString()}`,
                    `$${r.reward.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                ]);

                doc.autoTable({
                    startY: 65,
                    head: tableHead,
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5, minCellHeight: 10 },
                    styles: { fontSize: 9, cellPadding: 4, valign: 'middle' },
                    columnStyles: {
                        0: { cellWidth: 12, halign: 'center' },
                        3: { halign: 'right', fontStyle: 'bold' },
                        4: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }
                    },
                    willDrawCell: (data: any) => {
                        if (data.section === 'head') {
                            if (headerImgs[data.column.index]) {
                                data.cell.text = [''];
                            }
                        }
                        if (data.section === 'body') {
                            const r = results[data.row.index];
                            if (data.column.index === 1) {
                                if (containsKhmer(r.fullName)) {
                                    data.cell.text = [''];
                                }
                            }
                            if (data.column.index === 2) {
                                const teamRoleText = `${r.team || '-'}\n${r.role || ''}`;
                                if (containsKhmer(teamRoleText)) {
                                    const lines = teamRoleText.split('\n').filter(Boolean).length || 1;
                                    data.cell.text = Array(lines).fill('');
                                }
                            }
                        }
                    },
                    didDrawCell: (data: any) => {
                        const { cell, section, column, row } = data;
                        if (section === 'head') {
                            const img = headerImgs[column.index];
                            if (img) {
                                const maxH = Math.min(cell.height - 2, 5.5);
                                placeKhmerImg(doc, img, cell.x + 1, cell.y + (cell.height - maxH) / 2, cell.width - 2, maxH, 'center');
                            }
                        }
                        if (section === 'body') {
                            const r = results[row.index];
                            if (column.index === 1) {
                                if (containsKhmer(r.fullName)) {
                                    const img = renderKhmerToImg(r.fullName, 9, '#1E293B');
                                    if (img) {
                                        const maxH = Math.min(cell.height - 2, 5);
                                        placeKhmerImg(doc, img, cell.x + 2.5, cell.y + (cell.height - maxH) / 2, cell.width - 5, maxH);
                                    }
                                }
                            }
                            if (column.index === 2) {
                                const teamRoleText = `${r.team || '-'}\n${r.role || ''}`;
                                if (containsKhmer(teamRoleText)) {
                                    const padL = 2.5;
                                    const padT = 2.5;
                                    const maxW = cell.width - padL * 2;
                                    const img = renderKhmerMultiline(teamRoleText, 8.5, '#475569', maxW);
                                    if (img) {
                                        const drawH = Math.min(cell.height - padT * 2, maxW / img.ar);
                                        const drawW = Math.min(maxW, drawH * img.ar);
                                        doc.addImage(img.dataUrl, 'PNG', cell.x + padL, cell.y + padT, drawW, drawH);
                                    }
                                }
                            }
                        }
                    },
                });

                let finalY = doc.lastAutoTable.finalY + 30;

                // --- Signatures ---
                if (finalY > doc.internal.pageSize.height - 40) {
                    doc.addPage();
                    finalY = 30;
                }

                const prepLabel = language === 'km' ? "រៀបចំដោយ" : "Prepared By";
                const appLabel = language === 'km' ? "ពិនិត្យ និងអនុម័តដោយ" : "Approved By";

                addDocText(prepLabel, 30, finalY, 10, [100, 116, 139]);
                addDocText("__________________________", 20, finalY + 15, 10, [148, 163, 184]);
                
                addDocText(appLabel, pageWidth - 60, finalY, 10, [100, 116, 139]);
                addDocText("__________________________", pageWidth - 70, finalY + 15, 10, [148, 163, 184]);

                // --- Footer ---
                const pageCount = doc.internal.pages.length - 1;
                for(let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    const footerText = language === 'km' 
                        ? `ទំព័រទី ${i} នៃ ${pageCount}` 
                        : `Page ${i} of ${pageCount}`;
                    
                    addDocText(footerText, pageWidth / 2, doc.internal.pageSize.height - 10, 8.5, [148, 163, 184], 'center');
                }

                doc.save(`Incentive_Report_${projectName}_${selectedMonth}.pdf`);
                setIsGenerating(false);
                onClose();
            } catch (err) {
                console.error("PDF Generation Error:", err);
                alert("Failed to generate PDF.");
                setIsGenerating(false);
            }
        }, 100);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
            <div className="bg-[#121212] border border-[#1A1A1A] shadow-2xl rounded overflow-hidden text-[#EAECEF] font-sans">
                <div className="p-8 text-center space-y-8">
                    <div className="relative inline-block">
                        <div className="w-20 h-20 bg-[#050505] rounded border border-[#1A1A1A] flex items-center justify-center mx-auto shadow-inner">
                            <Terminal className="w-10 h-10 text-[#F0B90B]" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#0ECB81]/10 rounded-full flex items-center justify-center border border-[#0ECB81]/30">
                            <Activity className="w-4 h-4 text-[#0ECB81] animate-pulse" />
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-sm font-black text-[#EAECEF] uppercase tracking-[0.3em] mb-2">{t.export || 'Generate_Protocol_Report'}</h3>
                        <p className="text-[10px] text-[#707A8A] font-bold uppercase tracking-widest">Finalizing asset distribution records</p>
                    </div>

                    <div className="bg-[#080808] border border-[#1A1A1A] p-5 rounded space-y-4">
                        <div className="space-y-1.5">
                            <p className="text-[9px] text-[#707A8A] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                <Info className="w-3 h-3" /> Station_Identity
                            </p>
                            <p className="text-xs font-bold text-[#EAECEF] uppercase tracking-[0.1em]">{projectName}</p>
                        </div>
                        <div className="h-px bg-[#1A1A1A] w-1/2 mx-auto"></div>
                        <div className="space-y-1.5">
                            <p className="text-[9px] text-[#707A8A] font-black uppercase tracking-widest">Temporal_Period</p>
                            <p className="text-xs font-mono font-black text-[#F0B90B] uppercase">{selectedMonth}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <button 
                            onClick={generatePDF}
                            disabled={isGenerating}
                            className="w-full h-12 bg-[#F0B90B] hover:bg-[#D4A50A] text-black rounded font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale active:scale-[0.98]"
                        >
                            {isGenerating ? <Spinner size="sm" /> : <Download className="w-4 h-4 stroke-[3]" />}
                            {isGenerating ? 'Processing_Data...' : 'Download_PDF_Package'}
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full h-10 bg-[#050505] text-[#707A8A] hover:text-[#EAECEF] rounded font-black uppercase text-[9px] tracking-widest transition-all border border-[#1A1A1A] hover:border-[#2B3139]"
                        >
                            {t.cancel || 'Abort_Operation'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default IncentivePdfExportModal;
