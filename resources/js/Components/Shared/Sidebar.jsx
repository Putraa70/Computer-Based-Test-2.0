import React, { useState, useEffect } from "react";
import { Link, usePage } from "@inertiajs/react";
import { ClipboardCheck, LogOut, ChevronDown } from "lucide-react";
import { SideBarItems } from "@/constants/sideBarItems";
import { sideBarPalettes } from "@/Components/customStyles/sideBarStyles";

export default function Sidebar({
  isVisible,
  onToggle,
  theme = "luxuryNature",
}) {
  const { url } = usePage();
  const [expandedItems, setExpandedItems] = useState({});
  const currentPalette = sideBarPalettes[theme] || sideBarPalettes.luxuryNature;

  useEffect(() => {
    const activeParents = {};
    SideBarItems.forEach((item) => {
      const subMenus = item.subMenus || item.submenus;
      if (
        subMenus &&
        url.includes(item.route.replace(".index", "").replace(/\./g, "/"))
      ) {
        activeParents[item.name] = true;
      }
    });
    setExpandedItems(activeParents);
  }, [url]);

  const toggleExpand = (name) => {
    setExpandedItems((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <>
      {isVisible && (
        <div className="fixed inset-0 z-[40] lg:hidden" onClick={onToggle} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-[50] w-64 h-screen overflow-hidden transition-transform duration-300 ease-in-out flex flex-col scrollbar-stable shrink-0 ${
          isVisible ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          background: currentPalette.sidebar,
          scrollbarGutter: "stable",
        }}>
        {/* Header - shrink-0 agar area logo tidak terkompresi */}
        <div className="p-6 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: currentPalette.activeItem }}>
              <ClipboardCheck
                className="w-6 h-6"
                style={{ color: currentPalette.sidebarText }}
              />
            </div>
            <div>
              <h1
                className="text-xl font-bold leading-none"
                style={{ color: currentPalette.sidebarText }}>
                CBT-FKUnila
              </h1>
              <p
                className="text-[10px] mt-1 uppercase tracking-[0.2em]"
                style={{ color: currentPalette.sidebarText, opacity: 0.7 }}>
                Halaman Admin
              </p>
            </div>
          </div>
          <div
            className="h-[1px] w-full mt-4"
            style={{
              background: `linear-gradient(to right, ${currentPalette.activeText}50, transparent)`,
            }}
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          {SideBarItems.map((item) => {
            const hasRoute = (name) => {
              try {
                return name ? route().has(name) : false;
              } catch (e) {
                return false;
              }
            };

            const isActive = hasRoute(item.route)
              ? route().current(item.route + "*")
              : false;

            const isExpanded = expandedItems[item.name] || false;
            const subMenus = item.subMenus || item.submenus;
            const hasSubMenus = subMenus && subMenus.length > 0;
            const Icon = item.icon;

            return (
              <React.Fragment key={item.name}>
                {hasSubMenus ? (
                  <button
                    onClick={() => toggleExpand(item.name)}
                    className="flex items-center justify-between w-full gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{
                      backgroundColor: isActive
                        ? currentPalette.activeItem
                        : "transparent",
                      color: isActive
                        ? currentPalette.activeText
                        : currentPalette.sidebarText,
                    }}>
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span className="text-sm md:text-base font-medium">
                        {item.name}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                ) : (
                  <Link
                    href={hasRoute(item.route) ? route(item.route) : "#"}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{
                      backgroundColor: isActive
                        ? currentPalette.activeItem
                        : "transparent",
                      color: isActive
                        ? currentPalette.activeText
                        : currentPalette.sidebarText,
                    }}>
                    <Icon className="w-5 h-5" />
                    <span className="text-sm md:text-base font-medium">
                      {item.name}
                    </span>
                  </Link>
                )}

                {hasSubMenus && (
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isExpanded
                        ? "max-h-[500px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}>
                    <div
                      className="ml-9 mt-1 mb-2 space-y-1 pl-4 border-l-2"
                      style={{ borderColor: `${currentPalette.activeItem}50` }}>
                      {subMenus.map((submenu) => {
                        const subRouteExists = hasRoute(submenu.route);
                        const isSubActive =
                          subRouteExists &&
                          (submenu.params
                            ? route().current(submenu.route, submenu.params)
                            : route().current(submenu.route));

                        return (
                          <Link
                            key={submenu.id || submenu.name}
                            href={
                              subRouteExists
                                ? route(submenu.route, submenu.params || {})
                                : "#"
                            }
                            className="block py-2 text-sm transition-colors"
                            preserveState
                            preserveScroll
                            style={{
                              color: isSubActive
                                ? currentPalette.activeText
                                : currentPalette.sidebarText + "cc",
                              fontWeight: isSubActive ? "600" : "400",
                            }}>
                            {submenu.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Logout Section tetap di dalam nav agar ikut ter-scroll jika layar sangat pendek */}
          <div
            className="pt-4 pb-8 mt-4"
            style={{ borderTop: `1px solid ${currentPalette.activeItem}30` }}>
            <Link
              href={route("logout")}
              method="post"
              as="button"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-all w-full text-left group"
              style={{ color: currentPalette.sidebarText + "99" }}>
              <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              <span className="text-sm md:text-base">Exit System</span>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
