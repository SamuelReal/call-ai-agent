import { Router } from "express";
import {
  createCustomerHandler,
  getCustomerByPhoneHandler,
  listCustomersHandler,
  updateCustomerNameHandler
} from "../controllers/customers.controller.js";
import { requireInternalApiKey } from "../middlewares/internal-auth.middleware.js";

export const customersRouter = Router();

customersRouter.use(requireInternalApiKey);

customersRouter.get("/", listCustomersHandler);
customersRouter.get("/lookup", getCustomerByPhoneHandler);
customersRouter.post("/", createCustomerHandler);
customersRouter.patch("/:phone", updateCustomerNameHandler);
