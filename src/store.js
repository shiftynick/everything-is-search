import { create } from 'zustand'

// Shared state between the DOM overlay and the r3f scene.
// The scene reads/writes non-reactively via getState()/setState() inside useFrame,
// so it never triggers React re-renders; only the overlay subscribes reactively.
export const useStore = create((set) => ({
  t: 0, // timeline position 0..1 (fraction of the BFS fill revealed)
  playing: true, // auto-advance the timeline
  mode: 0, // 0 = open-ended (blooms), 1 = optimization (converges)
  reveal: false, // highlight the possible-but-never-reached cells
  speed: 1,

  setT: (t) => set({ t, playing: false }),
  setMode: (mode) => set({ mode }),
  setSpeed: (speed) => set({ speed }),
  toggleReveal: () => set((s) => ({ reveal: !s.reveal })),
  togglePlay: () => set((s) => ({ playing: !s.playing, t: s.t >= 1 ? 0 : s.t })),
  replay: () => set({ t: 0, playing: true }),
}))
