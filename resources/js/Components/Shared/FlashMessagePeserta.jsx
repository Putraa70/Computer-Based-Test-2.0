import { usePage } from "@inertiajs/react";

export default function FlashMessagePeserta() {
    const { flash } = usePage().props;

    if (!flash?.success && !flash?.error) return null;

    return (
        <div className="mb-4">
            {flash.success && (
                <div className="bg-emerald-100 text-emerald-700 px-4 py-3 rounded">
                    {flash.success}
                </div>
            )}

            {flash.error && (
                <div className="bg-red-100 text-red-700 px-4 py-3 rounded">
                    {flash.error}
                </div>
            )}
        </div>
    );
}
