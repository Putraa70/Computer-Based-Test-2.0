import React from "react";
import { CheckSquare, Users, Trash2 } from "lucide-react";
import Button from "@/Components/UI/Button";

export default function SelectionHeader({
    totalUsers,
    selectedCount,
    onAssignClick,
    onDeleteClick,
}) {
    return (
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-2.5">
                        <CheckSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Pilih & Atur Pengguna
                        </h1>
                        <p className="text-[11px] text-gray-500 font-semibold">
                            {selectedCount > 0 ? (
                                <span className="font-bold">
                                    {selectedCount} Pengguna Dipilih
                                </span>
                            ) : (
                                `${totalUsers} pengguna tersedia`
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {selectedCount > 0 && (
                        <>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 flex items-center gap-2 shadow-sm transition-all animate-in fade-in slide-in-from-right-4 duration-300"
                                onClick={onDeleteClick}
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Hapus Terpilih</span>
                            </Button>
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 flex items-center gap-2 shadow-sm transition-all animate-in fade-in slide-in-from-right-4 duration-300"
                                onClick={onAssignClick}
                            >
                                <Users className="w-4 h-4" />
                                <span>Pindahkan ke Grup...</span>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
