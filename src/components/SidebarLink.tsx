import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../utils/cn';

interface SidebarLinkProps {
  to: string;
  icon: ComponentType<{ size?: number }>;
  label: string;
  collapsed: boolean;
  className?: string;
}

export function SidebarLink({
  to,
  icon: Icon,
  label,
  collapsed,
  className = '',
}: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'sidebar-item',
          isActive ? 'active bg-white/10' : 'text-gray-300 hover:text-white',
          className
        )
      }
      title={collapsed ? label : ''}
    >
      <Icon size={20} />
      {!collapsed && <span className="fade-in">{label}</span>}
    </NavLink>
  );
}
