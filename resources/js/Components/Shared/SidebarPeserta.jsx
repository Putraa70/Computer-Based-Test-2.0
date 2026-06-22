import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, FileText, CheckCircle, BarChart2, X, GraduationCap } from 'lucide-react';

export default function SidebarPeserta({ isOpen, setIsOpen, theme }) {
    const { url } = usePage();

    const menuItems = [
        { label: 'Dashboard', icon: LayoutDashboard, route: '/peserta/dashboard', activeStr: 'dashboard' },
        { label: 'Ujian', icon: FileText, route: '/peserta/tests', activeStr: 'tests' },
        { label: 'Hasil', icon: CheckCircle, route: '/peserta/results', activeStr: 'results' },
        // { label: 'Analitik', icon: BarChart2, route: '/peserta/analytics', activeStr: 'analytics' },
    ];

    const isActive = (str) => url.startsWith(`/peserta/${str}`);

    return (
        <aside 
            className={`
                fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 shadow-2xl
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            style={{ background: theme.sidebar }}
        >
            {/* Header */}
            <div className="flex items-center justify-between h-20 px-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-wide">CBT System</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="md:hidden text-white/70 hover:text-white">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Menu */}
            <div className="px-4 py-6 space-y-2">
                {menuItems.map((item, index) => {
                    const active = isActive(item.activeStr);
                    return (
                        <Link
                            key={index}
                            href={item.route}
                            className={`
                                group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium
                                ${active ? 'shadow-lg ring-1 ring-white/20' : 'hover:bg-white/5'}
                            `}
                            style={{
                                backgroundColor: active ? theme.activeItem : 'transparent',
                                color: active ? theme.activeText : theme.sidebarText,
                                borderLeft: active ? `4px solid ${theme.activeBorder}` : '4px solid transparent'
                            }}
                        >
                            <item.icon 
                                className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-emerald-200 group-hover:text-white'}`} 
                            />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Footer Illustration (Optional decoration) */}
            <div className="absolute bottom-0 left-0 w-full p-6">
                <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 rounded-2xl p-4 border border-white/10">
                    <p className="text-xs text-emerald-200 mb-2">Butuh bantuan?</p>
                    <p className="text-xs text-white font-medium">Hubungi Team IT CBT</p>
                </div>
            </div>
        </aside>
    );
}