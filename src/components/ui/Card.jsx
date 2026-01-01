import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const Card = ({ className, children }) => {
    return (
        <div className={cn("bg-white rounded-xl shadow-sm border border-slate-200", className)}>
            {children}
        </div>
    );
};

export const CardHeader = ({ className, children }) => {
    return <div className={cn("px-6 py-4 border-b border-slate-100", className)}>{children}</div>;
};

export const CardTitle = ({ className, children }) => {
    return <h3 className={cn("text-lg font-semibold text-slate-800", className)}>{children}</h3>;
};

export const CardContent = ({ className, children }) => {
    return <div className={cn("p-6", className)}>{children}</div>;
};
