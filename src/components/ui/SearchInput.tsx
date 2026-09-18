"use client";

import { Search, X } from "lucide-react";
import React from "react";
import { Input } from "./input";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = "Buscar por produtos...",
  className,
}: SearchInputProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSearch?.(value);
    }
  };

  const handleClear = () => {
    onChange("");
    onSearch?.("");
  };

  return (
    <div className={`relative ${className}`}>
      <Input
        placeholder={placeholder}
        className="pl-10 pr-10 text-primary/80 border-primary/60 focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-primary/60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search className="h-5 w-5 text-primary/60" />
      </div>
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary/60 hover:text-primary/80"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
