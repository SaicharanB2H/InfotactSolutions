import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
    },
    {
      name: "Upload Files",
      path: "/upload",
    },
    {
      name: "Settings",
      path: "/settings",
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 p-5">
      
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-600">
          StreamWeaver
        </h1>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`block rounded-lg px-4 py-3 font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="mt-10 border-t pt-5">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg px-4 py-3 text-left
                     font-medium text-red-600 hover:bg-red-50"
        >
          Logout
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;
