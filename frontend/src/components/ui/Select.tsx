/**
 * Select Component - Dropdown select with search
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

interface SelectProps {
    options: SelectOption[];
    value?: string | string[];
    onChange: (value: string | string[]) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    multiple?: boolean;
    searchable?: boolean;
    disabled?: boolean;
    className?: string;
}

export function Select({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    label,
    error,
    multiple = false,
    searchable = false,
    disabled = false,
    className = '',
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search on open
    useEffect(() => {
        if (isOpen && searchable) {
            searchInputRef.current?.focus();
        }
    }, [isOpen, searchable]);

    const filteredOptions = searchable
        ? options.filter((opt) =>
            opt.label.toLowerCase().includes(search.toLowerCase())
        )
        : options;

    const selectedOptions = multiple
        ? options.filter((opt) => (value as string[])?.includes(opt.value))
        : options.find((opt) => opt.value === value);

    const displayValue = multiple
        ? selectedOptions.length > 0
            ? `${selectedOptions.length} selected`
            : placeholder
        : (selectedOptions as SelectOption)?.label || placeholder;

    const handleSelect = (optionValue: string) => {
        if (multiple) {
            const currentValues = (value as string[]) || [];
            const newValues = currentValues.includes(optionValue)
                ? currentValues.filter((v) => v !== optionValue)
                : [...currentValues, optionValue];
            onChange(newValues);
        } else {
            onChange(optionValue);
            setIsOpen(false);
        }
        setSearch('');
    };

    const isSelected = (optionValue: string) => {
        if (multiple) {
            return (value as string[])?.includes(optionValue);
        }
        return value === optionValue;
    };

    return (
        <div className={`w-full ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-theme-text mb-1.5">
                    {label}
                </label>
            )}

            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`
            w-full flex items-center justify-between
            px-4 py-3 text-left
            bg-theme-surface text-theme-text
            border rounded-xl
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:border-gold focus:ring-gold/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : 'border-theme-border'}
            ${isOpen ? 'ring-2 ring-gold/20 border-gold' : ''}
          `}
                >
                    <span className={!value?.length ? 'text-theme-muted' : ''}>
                        {displayValue}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-theme-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-50 w-full mt-2 bg-theme-surface border border-theme-border rounded-xl shadow-xl overflow-hidden"
                        >
                            {searchable && (
                                <div className="p-2 border-b border-theme-border">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search..."
                                            className="w-full pl-9 pr-8 py-2 bg-theme-elevated text-theme-text rounded-lg text-sm focus:outline-none"
                                        />
                                        {search && (
                                            <button
                                                onClick={() => setSearch('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="max-h-60 overflow-y-auto py-1">
                                {filteredOptions.length === 0 ? (
                                    <div className="px-4 py-3 text-center text-theme-muted text-sm">
                                        No options found
                                    </div>
                                ) : (
                                    filteredOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => handleSelect(option.value)}
                                            disabled={option.disabled}
                                            className={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-left
                        transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${isSelected(option.value)
                                                    ? 'bg-gold/10 text-gold'
                                                    : 'text-theme-text hover:bg-theme-elevated'
                                                }
                      `}
                                        >
                                            {option.icon}
                                            <span className="flex-1">{option.label}</span>
                                            {isSelected(option.value) && (
                                                <Check className="w-4 h-4" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {error && (
                <p className="mt-1.5 text-sm text-red-500">{error}</p>
            )}
        </div>
    );
}

export default Select;
