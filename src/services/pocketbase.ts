import { type Schema } from "./database.d";
import { TypedPocketBase } from "typed-pocketbase";
import PocketBase, { RecordService } from "pocketbase";

interface PB extends PocketBase {
  collection(idOrName: string): RecordService<Schema[keyof Schema]["response"]>;
}

/**
 * use this for standard pocketbase
 */
const pb = new PocketBase(import.meta.env.VITE_PB_URL || "/") as PB;

/**
 * use this for typesafety
 */
const db = new TypedPocketBase<Schema>(import.meta.env.VITE_PB_URL || "/");

export { pb, db };
