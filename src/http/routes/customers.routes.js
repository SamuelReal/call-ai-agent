import { Router } from "express";
import {
  createCustomerHandler,
  getCustomerByPhoneHandler,
  listCustomersHandler,
  updateCustomerNameHandler
} from "../controllers/customers.controller.js";

export const customersRouter = Router();

customersRouter.get("/", listCustomersHandler);
customersRouter.get("/lookup", getCustomerByPhoneHandler);
customersRouter.post("/", createCustomerHandler);
customersRouter.patch("/:phone", updateCustomerNameHandler);
