import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";
import { LogOut, User, Wifi } from "lucide-react";

export default function OnlineUsersComponent({ users, totalOnline }) {
    const { auth } = usePage().props;
    const [isForcing, setIsForcing] = useState(null);

    const handleForceLogout = async (userId, userName) => {
        const result = await Swal.fire({
            title: "Force Logout",
            text: `Yakin ingin logout paksa ${userName}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            confirmButtonText: "Ya, Logout!",
            cancelButtonText: "Batal",
        });

        if (result.isConfirmed) {
            setIsForcing(userId);

            try {
                const response = await fetch(
                    route("admin.users.force-logout", { userId: userId }),
                    {
                        method: "POST",
                        headers: {
                            "X-CSRF-TOKEN":
                                document.querySelector(
                                    'meta[name="csrf-token"]',
                                )?.content || "",
                            Accept: "application/json",
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({}),
                    },
                );

                const contentType = response.headers.get("content-type") || "";
                const data = contentType.includes("application/json")
                    ? await response.json()
                    : {
                          error: "Respons tidak valid. Silakan refresh halaman dan coba lagi.",
                      };

                if (response.ok) {
                    Swal.fire({
                        icon: "success",
                        title: "Berhasil",
                        text: data.message,
                        timer: 2000,
                        showConfirmButton: false,
                    });

                    // Refresh halaman untuk update status online
                    setTimeout(() => {
                        router.reload({ only: ["users", "totalOnline"] });
                    }, 500);
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Gagal",
                        text: data.error || "Gagal logout user",
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Terjadi kesalahan: " + error.message,
                });
            } finally {
                setIsForcing(null);
            }
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Pengguna Online
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Kelola pengguna yang sedang login dan force logout
                            jika diperlukan.
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-bold text-green-600">
                            {totalOnline}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Pengguna Online
                        </p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-6 py-3 text-left font-bold text-gray-700 w-16">
                                    No
                                </th>
                                <th className="px-6 py-3 text-left font-bold text-gray-700">
                                    Nama
                                </th>
                                <th className="px-6 py-3 text-left font-bold text-gray-700">
                                    NPM
                                </th>
                                <th className="px-6 py-3 text-left font-bold text-gray-700">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left font-bold text-gray-700">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-center font-bold text-gray-700">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data && users.data.length > 0 ? (
                                users.data.map((user, index) => (
                                    <tr
                                        key={user.id}
                                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                    >
                                        {/* No */}
                                        <td className="px-6 py-4 text-gray-600">
                                            {index + 1}
                                        </td>

                                        {/* Nama */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                                    {user.name
                                                        ?.charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900">
                                                    {user.name}
                                                </span>
                                            </div>
                                        </td>

                                        {/* NPM */}
                                        <td className="px-6 py-4 text-gray-600">
                                            {user.npm || "-"}
                                        </td>

                                        {/* Role */}
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                    user.role === "admin"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : "bg-green-100 text-green-700"
                                                }`}
                                            >
                                                {user.role === "admin"
                                                    ? "Admin"
                                                    : "Peserta"}
                                            </span>
                                        </td>

                                        {/* Status Online/Offline */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`w-3 h-3 rounded-full ${
                                                        user.is_online
                                                            ? "bg-green-500 animate-pulse"
                                                            : "bg-gray-300"
                                                    }`}
                                                />
                                                <span
                                                    className={`text-xs font-bold ${
                                                        user.is_online
                                                            ? "text-green-600"
                                                            : "text-gray-500"
                                                    }`}
                                                >
                                                    {user.is_online
                                                        ? "Online"
                                                        : "Offline"}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Aksi */}
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                {user.is_online &&
                                                user.id !== auth.user.id ? (
                                                    <button
                                                        onClick={() =>
                                                            handleForceLogout(
                                                                user.id,
                                                                user.name,
                                                            )
                                                        }
                                                        disabled={
                                                            isForcing ===
                                                            user.id
                                                        }
                                                        className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-semibold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isForcing ===
                                                        user.id ? (
                                                            <>
                                                                <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                                                Logout...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <LogOut className="w-4 h-4" />
                                                                Logout Paksa
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400">
                                                        -
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan="6"
                                        className="px-6 py-8 text-center text-gray-500"
                                    >
                                        Tidak ada data pengguna
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {users.links && users.links.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {users.links.map((link, index) => (
                        <a
                            key={index}
                            href={link.url || "#"}
                            disabled={!link.url}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                link.active
                                    ? "bg-blue-600 text-white"
                                    : link.url
                                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
