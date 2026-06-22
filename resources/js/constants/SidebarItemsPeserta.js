import {
    HomeIcon,
    ClipboardDocumentListIcon,
    ChartBarIcon,
} from "@heroicons/react/24/outline";

const sidebarItemsPeserta = [
    {
        id: "dashboard",
        label: "Dashboard",
        icon: HomeIcon,
        route: "peserta.dashboard",
    },
    {
        id: "tests",
        label: "Ujian Saya",
        icon: ClipboardDocumentListIcon,
        route: "peserta.tests.index",
    },
    {
        id: "results",
        label: "Hasil Ujian",
        icon: ChartBarIcon,
        route: "peserta.results",
    },
];

export default sidebarItemsPeserta;
