import { r2rClient } from "r2r-js";
import config from "./default";

const r2r = new r2rClient(config.r2rBaseUrl);
r2r.setApiKey(config.r2rApiKey as string);

export default r2r;
