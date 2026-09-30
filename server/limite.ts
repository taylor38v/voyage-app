// Limiteur de concurrence minimal (remplace p-limit, paquet ESM-only mal importé par le bundle CommonJS).
export function limiteur(max: number) {
  let actifs = 0;
  const file: Array<() => void> = [];
  const suivant = () => {
    if (actifs >= max || file.length === 0) return;
    actifs++;
    file.shift()!();
  };
  return function <T>(tache: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      file.push(() => {
        tache()
          .then(resolve, reject)
          .finally(() => {
            actifs--;
            suivant();
          });
      });
      suivant();
    });
  };
}
