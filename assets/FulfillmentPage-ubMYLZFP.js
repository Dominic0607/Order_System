import{r as o,A as d,j as t}from"./index-4BZQL-s2.js";import{F as m,b as x,D as f,I as b,c as v}from"./InventoryManagement-Dhg5ID6I.js";import"./jspdf.plugin.autotable-DhGMBXsF.js";import"./useBarcodeScanner-BMOdxkAx.js";import"./user-My0dOGQM.js";import"./zap-D6NvzUWa.js";import"./clock-dN5k1Eae.js";import"./PrintLabelPage-BdjrnIWG.js";import"./list-C2XLJaeH.js";import"./BankSelector-DpIkvYA4.js";import"./DateRangeFilter-Begy4x4f.js";const g={"--t-bg":"#0B0E11","--t-surface":"#1E2329","--t-surface-alt":"#2B3139","--t-border":"#2B3139","--t-text":"#EAECEF","--t-muted":"#848E9C","--t-accent":"#FCD535","--t-success":"#0ECB81","--t-danger":"#F6465D","--t-radius":"2px"},I=()=>{const{orders:r,isOrdersLoading:i,appData:n,setAppState:l}=o.useContext(d),[e,c]=o.useState(()=>localStorage.getItem("activeFulfillmentTab")||"pack"),[p,s]=o.useState(!1);return o.useEffect(()=>{localStorage.setItem("activeFulfillmentTab",e)},[e]),t.jsxs("div",{className:"terminal-root flex flex-col h-full overflow-hidden",style:g,children:[t.jsx("style",{children:`
                @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700;800&display=swap');

                .terminal-root {
                    font-family: 'Inter', sans-serif;
                    background: var(--t-bg);
                    color: var(--t-text);
                }

                .t-nav-strip {
                    height: 40px;
                    background: var(--t-surface);
                    border-bottom: 1px solid var(--t-border);
                    display: flex;
                    padding: 0 12px;
                    gap: 4px;
                }

                .t-nav-btn {
                    height: 100%;
                    padding: 0 16px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--t-muted);
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    transition: all 0.15s;
                    border-bottom: 2px solid transparent;
                }

                .t-nav-btn:hover {
                    color: var(--t-text);
                    background: rgba(255,255,255,0.02);
                }

                .t-nav-btn.active {
                    color: var(--t-accent);
                    border-bottom-color: var(--t-accent);
                }

                .t-sys-info {
                    margin-left: auto;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding-right: 8px;
                }

                .t-pill {
                    font-family: 'Roboto Mono', monospace;
                    font-size: 10px;
                    color: var(--t-muted);
                }

                main {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                }

                .t-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
                .t-scroll::-webkit-scrollbar-track { background: var(--t-bg); }
                .t-scroll::-webkit-scrollbar-thumb { background: var(--t-surface-alt); }
            `}),t.jsxs("div",{className:"t-nav-strip",children:[[{id:"pack",label:"Packaging"},{id:"hub",label:"Operations Hub"},{id:"ship",label:"Outbound"},{id:"stock",label:"Inventory"}].map(a=>t.jsx("div",{className:`t-nav-btn ${e===a.id?"active":""}`,onClick:()=>c(a.id),children:a.label},a.id)),t.jsxs("div",{className:"t-sys-info hidden sm:flex",children:[t.jsxs("div",{className:"t-pill flex items-center gap-2",children:[t.jsx("div",{className:"w-1.5 h-1.5 rounded-full bg-[#0ECB81]"}),"CORE_READY"]}),t.jsxs("div",{className:"t-pill font-bold text-[#FCD535]",children:["REF: ",new Date().toLocaleTimeString("km-KH",{hour12:!1})]})]})]}),t.jsxs("main",{className:"flex-1 overflow-hidden flex flex-col",children:[e==="hub"&&t.jsx(m,{orders:r,isLoading:i,onOpenDeliveryList:()=>s(!0),onExit:()=>l("role_selection")}),e==="pack"&&t.jsx(x,{orders:r,onExit:()=>l("role_selection")}),e==="ship"&&t.jsx(f,{onOpenDeliveryList:()=>s(!0)}),e==="stock"&&t.jsx(b,{})]}),t.jsx(v,{isOpen:p,onClose:()=>s(!1),orders:r,appData:n})]})};export{I as default};
