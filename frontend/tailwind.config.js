/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Paper & Ink System
                paper: "hsl(var(--paper))",
                ink: {
                    DEFAULT: "hsl(var(--ink))",
                    light: "hsl(var(--ink-light))",
                    lighter: "hsl(var(--ink-lighter))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    hover: "hsl(var(--accent-hover))",
                },
                surface: {
                    DEFAULT: "hsl(var(--surface))",
                    raised: "hsl(var(--surface-raised))",
                },
                // Legacy compatibility
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
            },
            fontSize: {
                'display': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
                'h1': ['32px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
                'h2': ['24px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
                'h3': ['20px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],
                'body-lg': ['17px', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
                'body': ['15px', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
                'body-sm': ['14px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
                'label': ['13px', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '500' }],
                'caption': ['12px', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '400' }],
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
            },
            keyframes: {
                // Calm page transitions
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-out': {
                    '0%': { opacity: '1', transform: 'translateY(0)' },
                    '100%': { opacity: '0', transform: 'translateY(-8px)' },
                },
                // Calm pulse for AI processing
                'pulse-calm': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
                // Subtle shimmer for loading states
                'shimmer-calm': {
                    '0%': { backgroundPosition: '-200% center' },
                    '100%': { backgroundPosition: '200% center' },
                },
                // Progress indicator
                'progress': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
            },
            animation: {
                'fade-in': 'fade-in 300ms cubic-bezier(0.33, 1, 0.68, 1)',
                'fade-out': 'fade-out 300ms cubic-bezier(0.33, 1, 0.68, 1)',
                'pulse-calm': 'pulse-calm 2s ease-in-out infinite',
                'shimmer-calm': 'shimmer-calm 2s ease-in-out infinite',
                'progress': 'progress 1.5s ease-in-out infinite',
            },
            transitionTimingFunction: {
                'calm': 'cubic-bezier(0.33, 1, 0.68, 1)',
                'calm-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
            },
            transitionDuration: {
                'instant': '100ms',
                'fast': '150ms',
                'normal': '200ms',
                'slow': '300ms',
            },
        },
    },
    plugins: [],
};
