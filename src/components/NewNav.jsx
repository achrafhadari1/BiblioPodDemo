"use client";
import React, { useState, useEffect } from "react";
import "./style/navbar.css";
import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  BarChart4,
  BookMarked,
  BookOpen,
  Bookmark,
  Clock,
  House,
  Coffee,
  Library,
  Menu,
  Settings,
  Trophy,
} from "lucide-react";
import { AuthProvider, useAuthContext } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";

export const NewNav = () => {
  const pathname = usePathname();
  const { user, getUser } = useAuthContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      getUser();
    }
  }, [user, getUser]);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-[72px] flex-col items-center border-r border-gray-100 py-5 fixed h-screen bg-white z-50">
        <div className="mb-10">
          <div className="w-10 h-10   flex items-center justify-center">
            <img src="/small-logo_1.png" alt="" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-7 flex-grow">
          <NavItem
            icon={<House size={20} />}
            to="/library"
            active={pathname === "/"}
          />
          <NavItem
            icon={<Library size={20} />}
            to="/collections"
            active={pathname === "/collections"}
          />
          <NavItem
            icon={<BarChart4 size={20} />}
            to="/stats"
            active={pathname === "/stats"}
          />

          <NavItem
            icon={<BookMarked size={20} />}
            to="/highlights"
            active={pathname === "/highlights"}
          />
          <NavItem
            icon={<Trophy size={20} />}
            to="/challenges"
            active={pathname === "/challenges"}
          />
          <NavItem
            icon={<Settings size={20} />}
            to="/settings"
            active={pathname === "/Settings"}
          />
        </div>

        <div className="mt-auto">
          <NavItem
            icon={<Coffee size={20} />}
            to="https://ko-fi.com/bibliopod"
          />{" "}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center py-2 px-4">
          <MobileNavItem
            icon={<House size={20} />}
            to="/library"
            active={pathname === "/" || pathname === "/library"}
            label="Library"
          />
          <MobileNavItem
            icon={<Library size={20} />}
            to="/collections"
            active={pathname === "/collections"}
            label="Collections"
          />
          <MobileNavItem
            icon={<BarChart4 size={20} />}
            to="/stats"
            active={pathname === "/stats"}
            label="Stats"
          />
          <MobileNavItem
            icon={<BookMarked size={20} />}
            to="/highlights"
            active={pathname === "/highlights"}
            label="Highlights"
          />
          <MobileNavItem
            icon={<Trophy size={20} />}
            to="/challenges"
            active={pathname === "/challenges"}
            label="Challenges"
          />
        </div>
      </div>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo-long.png" alt="BiblioPod" className="h-8" />
          </div>
          <Link
            href="/settings"
            className={`p-2 rounded-lg ${
              pathname === "/settings"
                ? "bg-amber-50 text-amber-500"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Settings size={20} />
          </Link>
        </div>
      </div>
    </>
  );
};

const NavItem = ({ icon, active, to }) => {
  const isExternal = to.startsWith("http");

  if (isExternal) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className={`p-2 rounded-lg ${
          active
            ? "bg-amber-50 text-amber-500"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        {icon}
      </a>
    );
  }

  return (
    <Link
      href={to}
      className={`p-2 rounded-lg ${
        active
          ? "bg-amber-50 text-amber-500"
          : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {icon}
    </Link>
  );
};

const MobileNavItem = ({ icon, active, to, label }) => {
  return (
    <Link
      href={to}
      className={`flex flex-col items-center gap-1 py-2  rounded-lg ${
        active ? "text-amber-500" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
};
