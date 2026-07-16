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

const formatMonthKhmer = (monthStr: string, lang: 'en' | 'km') => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthsKh = [
        "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
        "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
    ];
    const monthsEn = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const mIndex = parseInt(month, 10) - 1;
    if (lang === 'km') {
        const yearKh = year.split('').map(char => {
            const digits: Record<string, string> = {
                '0': '០', '1': '១', '2': '២', '3': '៣', '4': '៤',
                '5': '៥', '6': '៦', '7': '៧', '8': '៨', '9': '៩'
            };
            return digits[char] || char;
        }).join('');
        return `${monthsKh[mIndex]} ${yearKh}`;
    }
    return `${monthsEn[mIndex]} ${year}`;
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

                const periodLabel = language === 'km' 
                    ? `គ្រាគណនា: ${formatMonthKhmer(selectedMonth, 'km')}` 
                    : `Period: ${formatMonthKhmer(selectedMonth, 'en')}`;
                
                const formattedDate = language === 'km' 
                    ? new Date().toLocaleDateString('km-KH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                    : new Date().toLocaleString();
                const genLabel = language === 'km' ? `កាលបរិច្ឆេទបង្កើត: ${formattedDate}` : `Generated on: ${new Date().toLocaleString()}`;
                
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
            <div className="incentive-surface text-slate-800 dark:text-[#EAECEF] font-sans">
                <div className="p-8 text-center space-y-6">
                    {/* Glowing Icon Socket */}
                    <div className="relative inline-block">
                        <div className="export-icon-socket w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                            <Terminal className="w-7 h-7 text-amber-500 dark:text-[#F0B90B]" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
                            <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                        </div>
                    </div>
                    
                    {/* Header Text */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-wide">
                            {language === 'km' ? 'ទាញយកទិន្នន័យ' : 'Download Data'}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                            {language === 'km' ? 'កំពុងបញ្ចប់ការរៀបចំឯកសារចែកចាយទ្រព្យសកម្ម' : 'Finalizing asset distribution records'}
                        </p>
                    </div>

                    {/* Details Box */}
                    <div className="export-details-card p-5 rounded-2xl space-y-4">
                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                                <Info className="w-3.5 h-3.5 shrink-0" /> {language === 'km' ? 'អត្តសញ្ញាណស្ថានីយ' : 'Station Identity'}
                            </p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{projectName}</p>
                        </div>
                        <div className="h-px bg-slate-200 dark:bg-white/10 w-1/3 mx-auto"></div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                {language === 'km' ? 'វដ្តទូទាត់' : 'Temporal Period'}
                            </p>
                            <p className="text-sm font-mono font-bold text-amber-600 dark:text-[#F0B90B] uppercase">{formatMonthKhmer(selectedMonth, language)}</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2.5 pt-2">
                        <button 
                            onClick={generatePDF}
                            disabled={isGenerating}
                            className="w-full h-11 bg-[#F0B90B] hover:bg-[#d9a308] disabled:opacity-30 text-slate-900 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-[0.98]"
                        >
                            {isGenerating ? <Spinner size="sm" /> : <Download className="w-4 h-4 stroke-[2.5]" />}
                            {isGenerating ? (language === 'km' ? 'កំពុងដំណើរការ...' : 'Generating PDF...') : (language === 'km' ? 'ទាញយកឯកសារ PDF' : 'Download PDF Package')}
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full h-10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all border border-slate-200/50 dark:border-white/5"
                        >
                            {language === 'km' ? 'បោះបង់' : 'Cancel'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default IncentivePdfExportModal;
