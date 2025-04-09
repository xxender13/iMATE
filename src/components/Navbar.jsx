import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  const hideNavbarOnPaths = ["/student-dashboard", "/admin-dashboard"];
  const shouldHide = hideNavbarOnPaths.includes(location.pathname);

  if (shouldHide) return null;

  return (
    <nav className="bg-black text-white px-8 py-4 shadow-lg fixed w-full top-0 z-50 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold tracking-wide">
        iMATE
      </Link>
      <ul className="flex gap-6 items-center text-sm font-medium">
        <li>
          <Link to="/" className="hover:text-blue-400 transition">
            Home
          </Link>
        </li>
        <li>
          <Link to="/about" className="hover:text-blue-400 transition">
            About
          </Link>
        </li>
        <li>
          <Link to="/login">
            <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-white shadow">
              Login
            </button>
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
