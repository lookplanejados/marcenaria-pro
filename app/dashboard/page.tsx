"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from '@/components/kanban';
import { useRBAC } from '@/components/rbac-provider';

export default function DashboardPage() {
    const { isSysadmin, loading } = useRBAC();
    const router = useRouter();

    useEffect(() => {
        if (!loading && isSysadmin) {
            router.replace("/dashboard/admin");
        }
    }, [isSysadmin, loading, router]);

    if (loading || isSysadmin) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[50vh]">
                <div className="animate-pulse text-slate-500">Preparando seu ambiente...</div>
            </div>
        );
    }

    return (
        <main>
            <KanbanBoard />
        </main>
    );
}
