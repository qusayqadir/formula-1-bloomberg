import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronRight,
  File as FileIcon,
  Folder,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

/** AI-Elements-style FileTree, tuned for the F1 Terminal rail: quiet rows,
 *  hairline indent guides, selection = soft ink wash + accent tick. */

type TreeContextValue = {
  selectedPath?: string;
  onSelect?: (path: string) => void;
  defaultExpanded: Set<string>;
};
const TreeContext = createContext<TreeContextValue>({ defaultExpanded: new Set() });
const DepthContext = createContext(0);

export function FileTree(props: {
  children: ReactNode;
  selectedPath?: string;
  onSelect?: (path: string) => void;
  defaultExpanded?: Set<string>;
  className?: string;
}) {
  return (
    <TreeContext.Provider
      value={{
        selectedPath: props.selectedPath,
        onSelect: props.onSelect,
        defaultExpanded: props.defaultExpanded ?? new Set(),
      }}
    >
      <ul role="tree" className={`space-y-[3px] ${props.className ?? ""}`}>
        {props.children}
      </ul>
    </TreeContext.Provider>
  );
}

function rowClass(selected: boolean) {
  return `group relative flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[13px] tracking-[-0.01em] transition-colors duration-150 ${
    selected
      ? "bg-ink/[0.07] font-medium text-ink"
      : "text-sub hover:bg-ink/[0.04] hover:text-ink"
  }`;
}

export function FileTreeFolder(props: {
  name: string;
  path: string;
  children: ReactNode;
  icon?: LucideIcon;
}) {
  const tree = useContext(TreeContext);
  const depth = useContext(DepthContext);
  const [open, setOpen] = useState(() => tree.defaultExpanded.has(props.path));
  const Icon = props.icon ?? (open ? FolderOpen : Folder);

  return (
    <li role="treeitem" aria-expanded={open}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`group relative flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[13px] tracking-[-0.01em] transition-colors duration-150 ${
          depth === 0 ? "font-medium text-accent hover:bg-accent/[0.08]" : "text-sub hover:bg-ink/[0.04] hover:text-ink"
        }`}
      >
        <ChevronRight
          size={13}
          strokeWidth={2}
          className={`flex-none transition-transform duration-200 ${depth === 0 ? "text-accent/70" : "text-mut"} ${open ? "rotate-90" : ""}`}
        />
        <Icon size={15} strokeWidth={1.7} className={`flex-none ${depth === 0 ? "text-accent" : "text-mut"}`} />
        <span className="truncate">{props.name}</span>
      </button>
      {open && (
        <DepthContext.Provider value={depth + 1}>
          <ul role="group" className="ml-[18px] mt-[3px] space-y-[3px] border-l border-stroke pl-2">
            {props.children}
          </ul>
        </DepthContext.Provider>
      )}
    </li>
  );
}

export function FileTreeFile(props: {
  name: string;
  path: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  trailing?: ReactNode;
}) {
  const tree = useContext(TreeContext);
  const selected = tree.selectedPath === props.path;
  const Icon = props.icon ?? FileIcon;

  return (
    <li role="treeitem" aria-selected={selected}>
      <button
        type="button"
        onClick={() => tree.onSelect?.(props.path)}
        className={rowClass(selected)}
      >
        {selected && (
          <span aria-hidden className="absolute left-0 h-4 w-0.5 rounded-r bg-accent" />
        )}
        <Icon size={15} strokeWidth={1.7} className="ml-1.5 flex-none" />
        <span className="truncate">{props.name}</span>
        {props.badge && <span className="ml-auto flex-none">{props.badge}</span>}
        {props.trailing && !props.badge && (
          <span className="ml-auto flex-none opacity-0 transition-opacity group-hover:opacity-100">
            {props.trailing}
          </span>
        )}
      </button>
    </li>
  );
}
