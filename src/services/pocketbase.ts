import { type TypedPocketBase } from "../../pocketbase-types"
import PocketBase from "pocketbase";

/**
 * use this for standard pocketbase
 */
const pb = new PocketBase(import.meta.env.VITE_PB_URL || "/") as TypedPocketBase;

pb.autoCancellation(false);

export { pb };
