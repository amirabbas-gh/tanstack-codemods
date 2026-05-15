import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

export const ready = typeof satori === "function" && typeof Resvg === "function";
