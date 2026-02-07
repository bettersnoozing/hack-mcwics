interface Tab {
  key: string;
  label: string;
}

interface TabsSegmentedProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function TabsSegmented({ tabs, active, onChange, className = '' }: TabsSegmentedProps) {
  return (
    <div className={`inline-flex rounded-xl bg-warmGray-100 p-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
            active === tab.key
              ? 'bg-white text-warmGray-800 shadow-sm'
              : 'text-warmGray-500 hover:text-warmGray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
