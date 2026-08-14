import Sidebar from "./Sidebar";

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Sidebar />

      <main className="ml-72 min-h-screen bg-slate-100 p-8 scrollbar-none">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;