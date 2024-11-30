'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Layout,
  Users,
  Briefcase,
  BarChart,
  Settings,
} from 'lucide-react';
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

interface NavLink {
  label: string;
  icon: React.ReactNode;
  href: string;
}

const navLinks: NavLink[] = [
  { label: 'Dashboard', icon: <Layout size={20} />, href: '/dashboard' },
  { label: 'Entry', icon: <Users size={20} />, href: '/entry' },
  { label: 'Product List', icon: <BarChart size={20} />, href: '/productlist' },
  { label: 'Add Product', icon: <Briefcase size={20} />, href: '/product' },
  { label: 'Service Sell', icon: <Settings size={20} />, href: '/servicesselllist' },
  // Add more nav links as needed
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const pathname = usePathname();

  
  return (
    <aside
      className={`bg-[#0a1963] text-white w-64 min-h-screen transition-transform duration-300 transform overflow-y-auto ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed md:relative z-50`}
    >
      <div className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">AQSA TRAVELS</h1>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
          aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <Layout className="h-6 w-6" />
        </Button>
      </div>
      <nav className="mt-8">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.label}
              href={link.href}
              className={`block py-2.5 px-4 rounded transition duration-200 flex items-center ${
                isActive
                  ? 'bg-[#0c1e7a] text-white'
                  : 'hover:bg-[#0c1e7a] hover:text-white'
              }`}
            >
              {link.icon}
              <span className="ml-2">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
