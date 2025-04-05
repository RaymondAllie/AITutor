import { ReactNode } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/student-sidebar";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <StudentSidebar />
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </SidebarProvider>
  )
}
