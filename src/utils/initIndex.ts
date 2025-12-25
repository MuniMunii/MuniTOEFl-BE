// utils/initIndexes.ts
import clientPromise from "../config/mongo_client.js";
import { indexRegistry } from "./indexRegistry.js";

export async function initIndexes() {
  const db = (await clientPromise).db("muniquizNew");
  for (const { collection, indexes } of indexRegistry) {
    const col = db.collection(collection);
    for (const index of indexes) {
      await col.createIndex(index.keys, index.options);
    }
  }
}
