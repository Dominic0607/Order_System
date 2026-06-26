import re

files_hub = [
    'components/admin/packaging/DesktopPackagingHub.tsx',
    'components/admin/packaging/MobilePackagingHub.tsx',
    'components/admin/packaging/TabletPackagingHub.tsx'
]

def patch_file(path, replacements):
    with open(path, 'r') as f:
        content = f.read()
    
    for target, repl in replacements:
        content = re.sub(target, repl, content)
            
    with open(path, 'w') as f:
        f.write(content)

hub_replacements = [
    (
        r'<div className="flex-grow flex items-center justify-center[^>]*>\s*<Check size=\{12\}[^>]*>\s*<span[^>]*>Photo Sent to Driver ✓</span>\s*</div>',
        '''<button disabled className="flex-grow flex items-center justify-center gap-2 py-1.5 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-sm text-[10px] font-black text-[#0ECB81] uppercase tracking-wider cursor-default">
                                                            <Check size={12} />
                                                            បញ្ជូនរួចរាល់
                                                        </button>'''
    ),
    (
        r'<div className="flex-grow flex items-center justify-center[^>]*>\s*<Check size=\{14\}[^>]*>\s*<span[^>]*>Photo Sent to Driver ✓</span>\s*</div>',
        '''<button disabled className="flex-grow flex items-center justify-center gap-2 py-2 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-lg text-[11px] font-black text-[#0ECB81] uppercase tracking-wider cursor-default">
                                                            <Check size={14} />
                                                            បញ្ជូនរួចរាល់
                                                        </button>'''
    )
]

for f in files_hub:
    patch_file(f, hub_replacements)

print("Patching complete!")
