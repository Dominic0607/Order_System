import React from 'react';
import { IncentiveCalculator } from '../../../types';
import { Info, Rocket, MousePointer2, GitBranch, Terminal, Activity } from 'lucide-react';

interface Step5SimulationProps {
    calcData: Partial<IncentiveCalculator>;
    previewInput: number;
    setPreviewInput: (val: number) => void;
    updateField: (field: keyof IncentiveCalculator, value: any) => void;
}

const Step5Simulation: React.FC<Step5SimulationProps> = ({ calcData, previewInput, setPreviewInput, updateField }) => {
    let result = 0;
    if (calcData.type === 'Achievement') {
        const tiers = [...(calcData.achievementTiers || [])].sort((a, b) => a.target - b.target);
        const achieved = tiers.filter(t => previewInput >= t.target).pop();
        if (achieved) {
            result = achieved.rewardType === 'Percentage' ? previewInput * (achieved.rewardAmount/100) : achieved.rewardAmount;
        }
    } else {
        if (calcData.commissionCondition === 'Above Target') {
            const diff = Math.max(0, previewInput - (calcData.targetAmount || 0));
            result = (calcData.commissionMethod === 'Percentage') ? diff * ((calcData.commissionRate || 0)/100) : (diff > 0 ? (calcData.commissionRate || 0) : 0);
        } else {
            result = (calcData.commissionMethod === 'Percentage') ? previewInput * ((calcData.commissionRate || 0)/100) : (calcData.commissionRate || 0);
        }
    }

    return (
        <div className="space-y-10">
            <div className="flex items-center gap-4 border-b border-[#1A1A1A] pb-6">
                <div className="sim-header-socket w-10 h-10 flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-amber-500 dark:text-[#F0B90B]" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-[#EAECEF] uppercase tracking-[0.2em]">Protocol Simulation Lab</h3>
                    <p className="text-[9px] font-mono text-slate-400 dark:text-[#707A8A] uppercase tracking-widest mt-0.5">Validate logic output and define distribution topology</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Terminal className="w-3.5 h-3.5 text-slate-400 dark:text-[#707A8A]" />
                        <label className="text-[10px] font-bold text-slate-400 dark:text-[#707A8A] uppercase tracking-[0.2em]">Input Stress Test</label>
                    </div>
                    <div className="sim-card p-8 text-center relative overflow-hidden group">
                         <div className="absolute top-0 left-0 w-1 h-full bg-[#F0B90B]/20"></div>
                         <div className="text-[10px] font-bold text-slate-400 dark:text-[#707A8A] uppercase tracking-[0.2em] mb-6">Simulated KPI Metric</div>
                          <div className="flex items-center justify-center gap-3 mb-8">
                             {(calcData.metricUnit === 'USD' || !calcData.metricUnit) && (
                                 <span className="text-xl font-black text-slate-300 dark:text-[#1A1A1A] font-mono group-hover:text-[#F0B90B]/20 transition-colors">$</span>
                             )}
                             <div className="relative flex items-center justify-center">
                                 <input 
                                     type="number" value={previewInput} 
                                     onChange={e => setPreviewInput(Number(e.target.value))} 
                                     className="sim-input h-14 text-3xl font-mono font-black text-center w-48 outline-none" 
                                 />
                                 {calcData.metricUnit === '%' && (
                                     <span className="absolute -right-8 text-xl font-black text-amber-500 dark:text-[#F0B90B]/80 font-mono">%</span>
                                 )}
                                 {calcData.metricUnit === 'Count' && (
                                     <span className="absolute -right-12 text-sm font-black text-amber-500 dark:text-[#F0B90B]/60 font-sans uppercase tracking-widest">Qty</span>
                                 )}
                             </div>
                          </div>
                         <div className="pt-6 border-t border-[#1A1A1A]">
                            <div className="text-[10px] font-bold text-[#0ECB81] uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-2">
                                <Activity className="w-3 h-3" /> Projected Yield Output
                            </div>
                            <div className="text-4xl font-mono font-black text-[#0ECB81] tracking-tighter drop-shadow-[0_0_15px_rgba(14,203,129,0.2)]">
                                <span className="text-lg text-slate-400 dark:text-[#707A8A] mr-2 opacity-30">$</span>
                                {result.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                         </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {calcData.calculationLevel === 'Team' ? (
                        <>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <GitBranch className="w-3.5 h-3.5 text-slate-400 dark:text-[#707A8A]" />
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-[#707A8A] uppercase tracking-[0.2em]">Distribution_Protocol</label>
                                </div>
                                <div className="segment-container flex-col w-full !gap-1.5 !p-1.5">
                                    {['Equal Split', 'Percentage Allocation'].map(m => (
                                        <button key={m} onClick={() => updateField('distributionRule', { ...calcData.distributionRule, method: m as any })} className={`segment-btn !w-full !justify-between !px-4 ${calcData.distributionRule?.method === m ? 'active-segment' : ''}`}>
                                            <span className="text-[11px] font-black">{m.replace(' ', '_')}</span>
                                            {calcData.distributionRule?.method === m && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-[#F0B90B] shadow-[0_0_8px_#F0B90B]" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="sim-info-card p-5 relative group overflow-hidden">
                                <div className="flex items-center gap-3 mb-3">
                                    <Info className="w-4 h-4 text-amber-500 dark:text-[#F0B90B]" />
                                    <h4 className="text-[10px] font-black text-slate-800 dark:text-[#EAECEF] uppercase tracking-[0.2em]">Topo_Guideline</h4>
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-[#707A8A] font-bold leading-relaxed uppercase tracking-widest">
                                    Define how earned yield assets are distributed among identified entity nodes in the target group.
                                </div>
                                <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                    <GitBranch className="w-20 h-20 rotate-45" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="sim-info-card p-6 relative group overflow-hidden space-y-4">
                            <div className="flex items-center gap-3">
                                <Info className="w-4 h-4 text-[#0ECB81]" />
                                <h4 className="text-[10px] font-black text-slate-800 dark:text-[#EAECEF] uppercase tracking-[0.2em]">Individual Payout Active</h4>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-[#707A8A] font-bold leading-relaxed uppercase tracking-widest">
                                This protocol calculates rewards individually for each eligible employee based on their personal performance. No team-level splits or distributions are required.
                            </div>
                            <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                <GitBranch className="w-20 h-20 rotate-45 text-[#0ECB81]" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Step5Simulation;