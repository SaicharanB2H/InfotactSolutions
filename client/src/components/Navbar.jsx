import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user } = useAuth();

  const userName = user?.name || "User";
  const initial = userName.charAt(0).toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Dashboard
        </h2>
      </div>

      {/* User */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">
            {userName}
          </p>

          <p className="text-xs text-gray-500">
            User
          </p>
        </div>

        <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
          {initial}
        </div>
      </div>

    </header>
  );
};

export default Navbar;
