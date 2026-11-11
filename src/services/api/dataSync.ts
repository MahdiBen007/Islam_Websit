type Listener = () => void;

const listeners = new Set<Listener>();
let dataVersion = 0;

export const appDataEvents = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  notify(): void {
    dataVersion += 1;
    listeners.forEach((listener) => listener());
  },
  getVersion(): number {
    return dataVersion;
  },
};
