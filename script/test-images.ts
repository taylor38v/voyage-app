// Test rapide de la recherche de photos : npx tsx script/test-images.ts
import { imageLieu } from "../server/images";

const cas: Array<[string, string, number, number]> = [
  ["Mosteiro dos Jerónimos", "Lisbonne", 38.6979, -9.2068],
  ["Museu Nacional do Azulejo", "Lisbonne", 38.7247, -9.1136],
  ["Miradouro da Senhora do Monte", "Lisbonne", 38.7194, -9.1327],
  ["Time Out Market Lisboa", "Lisbonne", 38.7071, -9.1459],
  ["Fushimi Inari-taisha", "Kyoto", 34.9671, 135.7727],
  ["Kinkaku-ji", "Kyoto", 35.0394, 135.7292],
  ["Solar dos Presuntos", "Lisbonne", 38.7177, -9.1417],
];
for (const [nom, ville, lat, lon] of cas) {
  const url = await imageLieu(nom, ville, { latitude: lat, longitude: lon });
  console.log(`${url ? "photo" : "  -  "}  ${nom}${url ? "  " + decodeURIComponent(url.split("/").pop() || "").slice(0, 60) : ""}`);
}
