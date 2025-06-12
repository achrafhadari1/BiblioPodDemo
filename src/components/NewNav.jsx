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

  useEffect(() => {
    if (!user) {
      getUser();
    }
  }, [user, getUser]);

  return (
    <div className="w-[72px] flex flex-col items-center border-r border-gray-100 py-5 fixed h-screen bg-white z-50">
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
        <Menu size={20} className="text-gray-400" />
      </div>
    </div>
  );
};

const NavItem = ({ icon, active, to }) => {
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
