import Navbar from "../components/Navbar";
import SideBar from "../components/SideBar";
import ProtectedRoute from "../components/ProtectedRoute";
import GlobalToast from "../components/Toast";

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
          paddingBottom: "50px",
          marginLeft: "290px",
          marginRight: "40px",
        }}
      >
        <GlobalToast />

        {children}
      </main>
    </ProtectedRoute>
  );
}
