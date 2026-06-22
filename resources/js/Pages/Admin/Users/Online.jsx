import React, { useEffect } from "react";
import { router, usePage } from "@inertiajs/react";
import OnlineUsersComponent from "./Components/OnlineUsersComponent";

export default function Online({ users, totalOnline }) {
    const { auth } = usePage().props;

    useEffect(() => {
        // Auto refresh setiap 30 detik
        const interval = setInterval(() => {
            router.reload({
                only: ["users", "totalOnline"],
                preserveScroll: true,
            });
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6">
            <OnlineUsersComponent users={users} totalOnline={totalOnline} />
        </div>
    );
}
