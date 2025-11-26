import Navbar from "../components/Navbar";
import SideBar from "../components/SideBar";
import ProtectedRoute from "../components/ProtectedRoute";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <Navbar />
      <SideBar />
      <main
        style={{
          paddingTop: "100px",
          marginLeft: "325px",
          marginRight: "40px",
        }}
      >
        {children}
      </main>
    </ProtectedRoute>
  );
}
