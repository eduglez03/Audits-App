import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { ClipboardList, BarChart3, Settings, Bell, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

export default function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-[#faf9f6]">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-[#e8e4dc] bg-[#f5f3ee]">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#e8e4dc]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-coral-500 rounded-md flex items-center justify-center flex-shrink-0">
              <ClipboardList size={15} className="text-white" />
            </div>
            <span className="font-serif text-lg text-sand-900 leading-none">Audits</span>
          </div>
          <p className="text-[11px] text-sand-500 mt-1 ml-9 font-sans">Gestión de auditorías</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sand-400 px-2 mb-2">
            Principal
          </p>
          <NavItem to="/audits" icon={<ClipboardList size={16} />} label="Auditorías" />
          <NavItem to="/dashboard" icon={<BarChart3 size={16} />} label="Dashboard" disabled />
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 space-y-0.5 border-t border-[#e8e4dc] pt-3">
          <NavItem to="/settings" icon={<Settings size={16} />} label="Configuración" disabled />
          <div className="flex items-center gap-3 px-2 py-2 mt-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-coral-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-semibold text-coral-700">AL</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-sand-800 truncate">Ana López</p>
              <p className="text-[10px] text-sand-400 truncate">Administradora</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-[#e8e4dc] bg-white/80 backdrop-blur-sm flex-shrink-0">
          <Breadcrumb pathname={location.pathname} />
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-sand-100 text-sand-500 hover:text-sand-700 transition-colors focus-ring">
              <Bell size={16} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NavItem({
  to, icon, label, disabled,
}: {
  to: string; icon: React.ReactNode; label: string; disabled?: boolean
}) {
  if (disabled) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sand-400 cursor-not-allowed select-none">
        <span className="text-sand-300">{icon}</span>
        <span className="text-sm">{label}</span>
        <span className="ml-auto text-[10px] bg-sand-200 text-sand-400 px-1.5 py-0.5 rounded font-medium">Pronto</span>
      </div>
    )
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all group',
          isActive
            ? 'bg-white shadow-soft text-sand-900 font-medium'
            : 'text-sand-600 hover:text-sand-900 hover:bg-sand-100'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={clsx(isActive ? 'text-coral-500' : 'text-sand-400 group-hover:text-sand-600')}>
            {icon}
          </span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const parts = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    audits: 'Auditorías',
    new: 'Nueva auditoría',
  }

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1
        const label = labels[part] ?? (part.startsWith('aud_') ? 'Detalle' : part)
        return (
          <span key={part} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={13} className="text-sand-300" />}
            <span className={clsx(isLast ? 'text-sand-800 font-medium' : 'text-sand-400')}>
              {label}
            </span>
          </span>
        )
      })}
    </nav>
  )
}
