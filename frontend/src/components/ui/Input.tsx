
import React from 'react';
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, ...props }, ref) => {
        return (
            <div className="w-full space-y-2">
                {label && (
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                        {label}
                    </label>
                )}
                <motion.div
                    whileFocus={{ scale: 1.01 }}
                    className="relative"
                >
                    <input
                        type={type}
                        className={cn(
                            "flex h-14 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm",
                            error && "border-destructive focus-visible:ring-destructive",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </motion.div>
                {error && (
                    <p className="text-[10px] font-medium text-destructive ml-1">{error}</p>
                )}
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
