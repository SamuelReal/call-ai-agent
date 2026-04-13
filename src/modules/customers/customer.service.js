import { createCustomerByPhone, getCustomerByPhone, listCustomers, upsertCustomerByPhone } from "./customer.store.js";

export function getCustomer(phone) {
  return getCustomerByPhone(phone);
}

export function getCustomers() {
  return listCustomers();
}

export function createCustomer(payload) {
  return createCustomerByPhone(payload);
}

export function ensureCustomerByPhone(phone) {
  const found = getCustomerByPhone(phone);
  if (found) {
    return found;
  }
  return upsertCustomerByPhone({ phone, name: "" });
}

export function setCustomerNameByPhone(phone, name) {
  return upsertCustomerByPhone({ phone, name });
}

export function updateCustomerName(phone, name) {
  const current = getCustomerByPhone(phone);
  if (!current) {
    return null;
  }
  return upsertCustomerByPhone({ phone, name });
}
