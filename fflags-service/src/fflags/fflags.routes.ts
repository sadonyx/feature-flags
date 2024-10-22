import fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import {
  createFFlagHandler,
  deleteFFlagHandler,
  getAllFFlagsForCachingHandler,
  getFFlagByIdHandler,
  updateFFlagHandler,
} from "./fflags.controller.js";

// security
const corsConfig = {
  origin: (origin, cb) => {
    const hostname = new URL(origin).hostname;
    if (hostname === "localhost") {
      //  Request from localhost will pass
      cb(null, true);
      return;
    }
    // Generate an error on other origins, disabling access
    cb(new Error("Not allowed"), false);
  },
};

// map http methods to the path and the handlers which are implemented in the controller
export const getFFlagsRoutes = async (
  server: FastifyInstance
): Promise<FastifyInstance> => {
  await server.register(cors, corsConfig);
  server.post("/", createFFlagHandler); // create new flag, including its environment and respective user groups
  server.put("/:fflagId", updateFFlagHandler); // update entire flag (do we need a patch method?)
  server.delete("/:fflagId", deleteFFlagHandler); // physically remove entire flag
  server.get("/:fflagId", getFFlagByIdHandler); // return flag by its id
  server.get("/caching/:environmentName", getAllFFlagsForCachingHandler); // used by REST loader; return flags in structure we are using to cache them in memory
  return server;
};
