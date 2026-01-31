import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Context for managing select state
 */
interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(
  undefined
);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select');
  }
  return context;
}

/**
 * Select root component that manages state.
 */
interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  children,
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue);

  const value = controlledValue ?? internalValue;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (disabled) return;
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
      setOpen(false);
    },
    [controlledValue, disabled, onValueChange]
  );

  return (
    <SelectContext.Provider
      value={{ value, onValueChange: handleValueChange, open, setOpen }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

/**
 * Select trigger button that opens the dropdown.
 */
interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  placeholder?: string;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, placeholder, ...props }, ref) => {
    const { open, setOpen, value } = useSelectContext();

    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children || (value ? null : <span className="text-muted-foreground">{placeholder}</span>)}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

/**
 * Select value display component.
 */
interface SelectValueProps {
  placeholder?: string;
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const { value } = useSelectContext();
  return <span>{value || <span className="text-muted-foreground">{placeholder}</span>}</span>;
};

/**
 * Select content dropdown container.
 */
interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: 'item-aligned' | 'popper';
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, position = 'popper', ...props }, ref) => {
    const { open, setOpen } = useSelectContext();
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    React.useEffect(() => {
      if (!open) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (
          contentRef.current &&
          !contentRef.current.contains(event.target as Node)
        ) {
          setOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, setOpen]);

    if (!open) return null;

    return (
      <div
        ref={contentRef}
        className={cn(
          'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md',
          'animate-in fade-in-0 zoom-in-95',
          className
        )}
        {...props}
      >
        <div ref={ref} className="p-1">
          {children}
        </div>
      </div>
    );
  }
);
SelectContent.displayName = 'SelectContent';

/**
 * Select item option.
 */
interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, disabled = false, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useSelectContext();
    const isSelected = selectedValue === value;

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        data-disabled={disabled}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:bg-accent focus:text-accent-foreground',
          disabled && 'pointer-events-none opacity-50',
          isSelected && 'bg-accent text-accent-foreground',
          className
        )}
        onClick={() => !disabled && onValueChange(value)}
        {...props}
      >
        {isSelected && (
          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <Check className="h-4 w-4" />
          </span>
        )}
        {children}
      </div>
    );
  }
);
SelectItem.displayName = 'SelectItem';

/**
 * Select separator for dividing groups.
 */
const SelectSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
));
SelectSeparator.displayName = 'SelectSeparator';

/**
 * Select label for grouping items.
 */
const SelectLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}
    {...props}
  />
));
SelectLabel.displayName = 'SelectLabel';

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectLabel,
};
