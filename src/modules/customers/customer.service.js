import { env } from "../../config/env.js";
import { createCustomerByPhone, getCustomerByPhone, listCustomers, upsertCustomerByPhone } from "./customer.store.js";
import {
  mysqlCreateCustomerByPhone,
  mysqlGetCustomerByPhone,
  mysqlListCustomers,
  mysqlUpsertCustomerByPhone
} from "./customer.mysql.js";

function useMysql() {
  return env.STORAGE_PROVIDER === "mysql";
}

export async function getCustomer(phone) {
  if (useMysql()) {
    return mysqlGetCustomerByPhone(phone);
  }
  return getCustomerByPhone(phone);
}

export async function getCustomers() {
  if (useMysql()) {
    return mysqlListCustomers();
  }
  return listCustomers();
}

export async function createCustomer(payload) {
  if (useMysql()) {
    return mysqlCreateCustomerByPhone(payload);
  }
  return createCustomerByPhone(payload);
}

export async function ensureCustomerByPhone(phone) {
  const found = await getCustomer(phone);
  if (found) {
    return found;
  }
  if (useMysql()) {
    return mysqlUpsertCustomerByPhone({ phone, name: "" });
  }
  return upsertCustomerByPhone({ phone, name: "" });
}

export async function setCustomerNameByPhone(phone, name) {
  if (useMysql()) {
    return mysqlUpsertCustomerByPhone({ phone, name });
  }
  return upsertCustomerByPhone({ phone, name });
}

export async function updateCustomerName(phone, name) {
  const current = await getCustomer(phone);
  if (!current) {
    return null;
  }
  return setCustomerNameByPhone(phone, name);
}
