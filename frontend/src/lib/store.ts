"use client";

import { create } from 'zustand';

interface StudioState {
    shouldReset: number;
    triggerReset: () => void;
}

export const useStudioStore = create<StudioState>((set) => ({
    shouldReset: 0,
    triggerReset: () => set((state: StudioState) => ({ shouldReset: state.shouldReset + 1 })),
}));
