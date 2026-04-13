import { z } from "zod";
import { createCustomer, getCustomer, getCustomers, updateCustomerName } from "../../modules/customers/customer.service.js";

const createSchema = z.object({
  phone: z.string().min(6),
  name: z.string().optional().default("")
});

const updateSchema = z.object({
  name: z.string().min(2)
});

export function listCustomersHandler(_req, res) {
  return res.status(200).json({ customers: getCustomers() });
}

export function getCustomerByPhoneHandler(req, res) {
  const phone = String(req.query.phone || "").trim();
  if (!phone) {
    return res.status(400).json({ error: "validation_error", message: "phone query param is required" });
  }

  const customer = getCustomer(phone);
  if (!customer) {
    return res.status(404).json({ error: "not_found", message: "customer not found" });
  }

  return res.status(200).json(customer);
}

export function createCustomerHandler(req, res) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
  }

  const created = createCustomer(parsed.data);
  if (!created) {
    return res.status(409).json({ error: "already_exists", message: "customer with phone already exists" });
  }

  return res.status(201).json(created);
}

export function updateCustomerNameHandler(req, res) {
  const phone = String(req.params.phone || "").trim();
  if (!phone) {
    return res.status(400).json({ error: "validation_error", message: "phone param is required" });
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
  }

  const updated = updateCustomerName(phone, parsed.data.name);
  if (!updated) {
    return res.status(404).json({ error: "not_found", message: "customer not found" });
  }

  return res.status(200).json(updated);
}
