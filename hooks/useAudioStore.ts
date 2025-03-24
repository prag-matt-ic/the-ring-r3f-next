import { create } from "zustand";

type Store = {
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
};

const useAudioStore = create<Store>((set) => ({
  isPlaying: false,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
}));

export default useAudioStore;
