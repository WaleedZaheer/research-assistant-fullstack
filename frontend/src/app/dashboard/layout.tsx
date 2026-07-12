import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div style={{ display: "flex" }}>
        <Sidebar />
        <main style={{ marginLeft: "220px", flex: 1, padding: "32px" }}>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}