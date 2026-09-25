import { useRef, useEffect, ReactNode } from 'react';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals?: number;
  onChange: (value: number) => void;
  icon?: ReactNode;
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  decimals = 2,
  onChange,
  icon,
}: SliderControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const clampVal = (v: number) => Math.min(Math.max(v, min), max);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(clampVal(parseFloat(e.target.value)));
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) onChange(clampVal(v));
  };

  const inc = () => onChange(clampVal(value + step));
  const dec = () => onChange(clampVal(value - step));

  return (
    <div className="control-row">
      <div className="control-label">
        {icon && <span className="control-icon">{icon}</span>}
        <span>{label}</span>
        <span className="control-value">
          {value.toFixed(decimals)}{unit}
        </span>
      </div>
      <div className="control-inputs">
        <button className="btn-step" onClick={dec} tabIndex={-1}>−</button>
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSlider}
          className="slider"
        />
        <button className="btn-step" onClick={inc} tabIndex={-1}>+</button>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInput}
          className="num-input"
        />
      </div>
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: ReactNode;
}

export function Toggle({ label, checked, onChange, icon }: ToggleProps) {
  return (
    <div className="toggle-row" onClick={() => onChange(!checked)}>
      {icon && <span className="control-icon">{icon}</span>}
      <span className="toggle-label">{label}</span>
      <div className={`toggle-switch ${checked ? 'on' : ''}`}>
        <div className="toggle-knob" />
      </div>
    </div>
  );
}

interface CollapsibleProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function Collapsible({ title, icon, children, defaultOpen = true }: CollapsibleProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (defaultOpen) ref.current.classList.add('open');
  }, [defaultOpen]);

  const toggle = () => {
    if (!ref.current) return;
    ref.current.classList.toggle('open');
  };

  return (
    <div className="collapsible" ref={ref}>
      <div className="collapsible-header" onClick={toggle}>
        {icon && <span className="control-icon">{icon}</span>}
        <span>{title}</span>
        <span className="chevron">▾</span>
      </div>
      <div className="collapsible-content">
        <div className="collapsible-inner">{children}</div>
      </div>
    </div>
  );
}
