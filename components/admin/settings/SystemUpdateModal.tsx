
import React from 'react';
import Modal from '../../common/Modal';
import Spinner from '../../common/Spinner';
import { APP_LOGO_URL } from '../../../constants';

interface SystemUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (message: string) => void;
    isProcessing: boolean;
}

const SystemUpdateModal: React.FC<SystemUpdateModalProps> = ({ isOpen, onClose, onConfirm, isProcessing }) => {
    const [message, setMessage] = React.useState('ប្រព័ន្ធត្រូវបានអាប់ដេតទៅកាន់ v1.1.1 ដោយបន្ថែមមុខងារ Audio Call, Video Call, Group Call និង Mini App (OTO Chat)។');

    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
            <div className="p-6 text-center">
                {/* Logo */}
                <div className="flex flex-col items-center gap-1 mb-4">
                    <img src={APP_LOGO_URL} alt="O-System" className="w-12 h-12 object-cover" />
                    <span className="text-[9px] font-semibold tracking-[0.18em] text-white/30 uppercase">O-System</span>
                </div>

                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20 animate-pulse">
                    <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}>System Update</h3>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                    សកម្មភាពនេះនឹងបង្ហាញដំណឹងរាប់ថយក្រោយ ៦០ វិនាទីទៅកាន់អ្នកប្រើប្រាស់ទាំងអស់ (ដើម្បីទុកពេលឱ្យពួកគេរក្សាទុក Draft) មុនពេលចាកចេញពីប្រព័ន្ធដោយស្វ័យប្រវត្ត។
                </p>

                <div className="mb-6 text-left">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Notification Message</label>
                    <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-none h-24"
                        placeholder="Enter notification message for users..."
                    />
                </div>

                <div className="flex gap-3 justify-center">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl bg-gray-800 text-gray-400 font-bold hover:bg-gray-700 transition-all border border-gray-700">បោះបង់</button>
                    <button 
                        onClick={() => onConfirm(message)} 
                        disabled={isProcessing}
                        className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all flex items-center gap-2 shadow-lg shadow-red-900/20 active:scale-95 disabled:opacity-50"
                    >
                        {isProcessing ? <Spinner size="sm" /> : 'Confirm Update'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default SystemUpdateModal;
