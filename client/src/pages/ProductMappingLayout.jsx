import { NavLink, Outlet } from "react-router-dom";

export default function ProductMappingLayout() {
  return (
    <div>
      {/* Tabs */}
      <div className="mb-8 flex overflow-x-auto border-b border-slate-200">
        <NavLink
          to="/product-mapping"
          className={({ isActive }) =>
            `pb-3 text-sm font-semibold mr-5 ${
              isActive
                ? "text-[#1e6191] border-b-[3px] border-[#2B86C5]"
                : "text-slate-400 hover:text-slate-600"
            }`
          }
        >
          Pending Products Mapping
        </NavLink>

        <NavLink
          to="/fullsite-remapping"
          className={({ isActive }) =>
            `pb-3 text-sm font-semibold ${
              isActive
                ? "text-[#1e6191] border-b-[3px] border-[#2B86C5]"
                : "text-slate-400 hover:text-slate-600"
            }`
          }
        >
          Fullsite Re-Mapping
        </NavLink>
      </div>

      {/* Child page */}
      <Outlet />
    </div>
  );
}