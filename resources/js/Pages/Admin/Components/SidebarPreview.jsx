import React, { useState } from 'react';

export default function SidebarPreview({ isVisible, onNavigate, activePageId }) {
    // State untuk mengontrol accordion menu yang memiliki sub-menu
    const [openMenus, setOpenMenus] = useState({
        users: true,
        modules: true
    });

    const toggleMenu = (menuId) => {
        setOpenMenus(prev => ({
            ...prev,
            [menuId]: !prev[menuId]
        }));
    };

    const menuItems = [
        { 
            name: 'Dashboard', 
            icon: 'dashboard', 
            id: 'Dashboard' 
        },
        {
            name: 'User Management',
            icon: 'people',
            id: 'users_group',
            subMenus: [
                { name: 'Index Overview', id: 'Index' },
                { name: 'Management', id: 'Management' },
                { name: 'Groups plotting', id: 'Groups' },
                { name: 'User Selection', id: 'Selection' },
                { name: 'Online Monitor', id: 'Online' },
                { name: 'Import Users', id: 'Import' },
                { name: 'User Results', id: 'Results' },
            ]
        },
        {
            name: 'Academic Modules',
            icon: 'inventory_2',
            id: 'modules_group',
            subMenus: [
                { name: 'Class / Blocks', id: 'Modules_Class' },
                { name: 'Subjects (Topics)', id: 'Modules_Subjects' },
                { name: 'Question Bank', id: 'Modules_Questions' },
                { name: 'Import Soal', id: 'Modules_Import' },
                { name: 'Module Analytics', id: 'Modules_Results' },
            ]
        },
        {
            name: 'CBT Flow Preview',
            icon: 'account_tree',
            id: 'flow_preview',
            subMenus: [
                { name: 'Result Detail View', id: 'Modules_Results_Detail' },
                { name: 'Class Detail View', id: 'Modules_Class_Index' },
            ]
        }
    ];

    return (
        <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#00a65a] text-white transition-transform duration-300 shadow-xl overflow-y-auto ${isVisible ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
            {/* Header Section */}
            <div className="p-6 sticky top-0 bg-[#00a65a] z-10">
                <div className="flex items-center gap-2 mb-2">
                    <span className="material-icons text-yellow-400">verified</span>
                    <h1 className="text-2xl font-black italic tracking-tighter">CBT FK UNILA</h1>
                </div>
                <div className="bg-white/10 rounded-lg p-2 border border-white/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-center text-white/80">UI System Navigator</p>
                </div>
            </div>

            {/* Navigation Section */}
            <nav className="mt-2 px-3 pb-10 space-y-2">
                {menuItems.map((item) => (
                    <div key={item.id} className="space-y-1">
                        {/* Parent Menu Item */}
                        <button 
                            onClick={() => item.subMenus ? toggleMenu(item.id === 'users_group' ? 'users' : item.id === 'modules_group' ? 'modules' : item.id) : onNavigate(item.id)}
                            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-200 group
                                ${activePageId === item.id || (item.subMenus && item.subMenus.some(sub => sub.id === activePageId))
                                    ? 'bg-white/20 font-bold shadow-inner' 
                                    : 'hover:bg-white/10'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`material-icons text-xl ${activePageId === item.id ? 'text-yellow-400' : 'text-green-200 group-hover:text-white'}`}>
                                    {item.icon}
                                </span>
                                <span className="text-sm tracking-tight">{item.name}</span>
                            </div>
                            
                            {item.subMenus && (
                                <span className={`material-icons text-sm transition-transform duration-300 
                                    ${(item.id === 'users_group' && openMenus.users) || (item.id === 'modules_group' && openMenus.modules) || (item.id === 'flow_preview' && openMenus.flow_preview) ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            )}
                        </button>

                        {/* Sub-menu (Accordion) */}
                        {item.subMenus && (
                            <div className={`overflow-hidden transition-all duration-300 px-2 space-y-1 
                                ${(item.id === 'users_group' && openMenus.users) || (item.id === 'modules_group' && openMenus.modules) || (item.id === 'flow_preview' && openMenus.flow_preview) 
                                    ? 'max-h-[500px] opacity-100 mt-1 mb-2' 
                                    : 'max-h-0 opacity-0'}`}>
                                <div className="ml-4 border-l-2 border-green-400/30">
                                    {item.subMenus.map((sub) => (
                                        <button 
                                            key={sub.id} 
                                            onClick={() => onNavigate(sub.id)} 
                                            className={`block w-full text-left pl-6 py-2.5 text-xs rounded-r-lg transition-all relative
                                                ${activePageId === sub.id 
                                                    ? 'text-yellow-300 font-bold bg-white/10' 
                                                    : 'text-green-50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {/* Active Indicator dot */}
                                            {activePageId === sub.id && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-yellow-300 rounded-full -ml-[4px]"></div>
                                            )}
                                            {sub.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Status Indicator (Footer Sidebar) */}
                <div className="pt-6 mt-6 border-t border-green-400/30 px-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-green-100 uppercase tracking-widest">Mock API Ready</span>
                    </div>
                    <p className="text-[9px] text-green-200 leading-tight">
                        Navigator ini mensimulasikan routing backend sebelum integrasi API final dilakukan.
                    </p>
                </div>
            </nav>
        </aside>
    );
}