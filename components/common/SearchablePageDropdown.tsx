
import React, { useState, useRef, useEffect, useMemo, useContext } from 'react';
import { TeamPage } from '../../types';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import { AppContext } from '../../context/AppContext';

interface SearchablePageDropdownProps {
    pages: TeamPage[];
    selectedPageName: string;
    onSelect: (page: TeamPage) => void;
    placeholder?: string;
}

const SearchablePageDropdown: React.FC<SearchablePageDropdownProps> = ({ pages, selectedPageName, onSelect, placeholder = "ជ្រើសរើស Page..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { advancedSettings } = useContext(AppContext);
    const isLightMode = advancedSettings?.themeMode === 'light';

    useEffect(() => {
        const selected = pages.find(p => p.PageName === selectedPageName);
        if (selected) setSearchTerm(selected.PageName);
    }, [selectedPageName, pages]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                const selected = pages.find(p => p.PageName === selectedPageName);
                setSearchTerm(selected ? selected.PageName : '');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedPageName, pages]);

    const filteredPages = useMemo(() => {
        if (!searchTerm.trim()) return pages;
        const q = searchTerm.toLowerCase();
        return pages.filter(p => (p.PageName || '').toLowerCase().includes(q));
    }, [pages, searchTerm]);

    const selectedPage = pages.find(p => p.PageName === selectedPageName);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div className="relative group">
                <input
                    type="text"
                    className={`form-input !pl-14 !pr-10 !py-3.5 !border-2 transition-all !rounded-none font-bold outline-none ${
                        isLightMode 
                            ? '!bg-slate-50 !border-slate-200 !text-slate-800 !placeholder-slate-400 focus:!bg-white focus:!border-blue-500' 
                            : '!bg-[#0B0E11] !border-[#2B3139] !text-[#EAECEF] !placeholder-[#474D57] focus:!border-[#FCD535]'
                    }`}
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                />
                <div className="absolute left-0 top-0 bottom-0 pl-3.5 flex items-center pointer-events-none">
                    <div className={`w-8 h-8 rounded-none overflow-hidden border flex items-center justify-center ${
                        isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-[#1E2329] border-[#2B3139]'
                    }`}>
                        {selectedPage ? (
                            <img 
                                src={convertGoogleDriveUrl(selectedPage.PageLogoURL)} 
                                className="w-full h-full object-cover" 
                                alt="" 
                            />
                        ) : (
                            <svg className={`w-4 h-4 ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.07 18.28c.43-.9 1.91-1.61 3.46-1.61s3.03.72 3.46 1.61C12.79 19.11 11.41 19.5 10 19.5s-2.79-.39-3.93-1.22zM15.6 17.03c-.78-1.13-2.56-1.86-4.6-1.86s-3.82.73-4.6 1.86c-.52-.51-.95-1.09-1.27-1.74.88-1.19 2.72-2.12 4.87-2.12s3.99.93 4.87 2.12c-.32.65-.75 1.23-1.27 1.74zM10 12.3c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
                        )}
                    </div>
                </div>
                <div className={`absolute right-0 top-0 bottom-0 pr-3.5 flex items-center transition-colors pointer-events-none ${
                    isLightMode 
                        ? 'text-slate-400 group-focus-within:text-blue-500' 
                        : 'text-[#848E9C] group-focus-within:text-[#FCD535]'
                }`}>
                    <svg className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
            </div>

            {isOpen && (
                <div className={`absolute z-[100] w-full mt-1 border rounded-none overflow-hidden animate-fade-in-down ${
                    isLightMode 
                        ? 'bg-white border-blue-500 shadow-lg shadow-blue-500/5' 
                        : 'bg-[#1E2329] border-[#FCD535] shadow-[0_15px_45px_rgba(0,0,0,0.6)]'
                }`}>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                        {filteredPages.length > 0 ? filteredPages.map((page) => (
                            <button
                                key={page.PageName}
                                type="button"
                                onClick={() => {
                                    onSelect(page);
                                    setSearchTerm(page.PageName);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3.5 p-2 rounded-none transition-all border-b last:border-0 ${
                                    selectedPageName === page.PageName 
                                        ? (isLightMode ? 'bg-blue-600 text-white border-transparent' : 'bg-[#FCD535] text-[#181A20] border-transparent') 
                                        : (isLightMode ? 'text-slate-700 hover:bg-blue-50 border-slate-100' : 'text-[#EAECEF] hover:bg-[#FCD535]/10 border-[#2B3139]/50')
                                }`}
                            >
                                <img 
                                    src={convertGoogleDriveUrl(page.PageLogoURL)} 
                                    className={`w-11 h-11 rounded-none object-cover border-2 flex-shrink-0 transition-all ${
                                        selectedPageName === page.PageName 
                                            ? (isLightMode ? 'border-white' : 'border-[#181A20]') 
                                            : (isLightMode ? 'border-slate-200' : 'border-[#2B3139]')
                                    }`} 
                                    alt="" 
                                />
                                <div className="text-left min-w-0">
                                    <p className="font-black text-[14px] truncate leading-tight uppercase tracking-tight">{page.PageName}</p>
                                    <p className={`text-[9px] uppercase tracking-widest font-black mt-1 ${
                                        selectedPageName === page.PageName 
                                            ? (isLightMode ? 'text-white/70' : 'text-[#181A20]/70') 
                                            : (isLightMode ? 'text-slate-400' : 'text-[#848E9C]')
                                    }`}>{page.Team}</p>
                                </div>
                            </button>
                        )) : (
                            <div className={`p-6 text-center text-[10px] font-black uppercase tracking-widest italic ${
                                isLightMode ? 'text-slate-400' : 'text-[#848E9C]'
                            }`}>រកមិនឃើញ Page ទេ</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchablePageDropdown;
