import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { RBACProvider } from "@/components/rbac-provider"
import { ColorThemeProvider } from "@/components/color-theme-provider"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <RBACProvider>
            <ColorThemeProvider>
                <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-zinc-900 transition-colors duration-300">
                    {/* Sidebar Desktop */}
                    <Sidebar className="hidden md:flex w-64 border-r dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-col shrink-0" />

                    <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                        {/* Header - Barra Superior */}
                        <Header />

                        {/* Conteúdo Principal */}
                        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20">
                            {children}
                        </main>
                    </div>
                </div>
            </ColorThemeProvider>
        </RBACProvider>
    )
}
