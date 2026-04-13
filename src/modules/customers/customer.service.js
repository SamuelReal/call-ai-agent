import { getCustomerByPhone, upsertCustomerByPhone } from "./customer.store.js";

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
