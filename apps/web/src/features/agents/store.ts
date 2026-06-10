import { create } from 'zustand';

interface AgentStudioState {
  selectedTab: 'config' | 'versions' | 'testCases';
  setSelectedTab: (tab: AgentStudioState['selectedTab']) => void;
}

export const useAgentStudioStore = create<AgentStudioState>((set) => ({
  selectedTab: 'config',
  setSelectedTab: (selectedTab) => set({ selectedTab })
}));
