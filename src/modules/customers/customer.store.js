const customersByPhone = new Map([
  ["+34111111111", { customerId: "cus_demo_1", phone: "+34111111111", name: "" }],
  ["+34123456789", { customerId: "cus_demo_2", phone: "+34123456789", name: "Carlos" }]
]);

function nextCustomerId() {
  return `cus_${Math.random().toString(36).slice(2, 10)}`;
}

export function getCustomerByPhone(phone) {
  if (!phone) {
    return null;
  }
  return customersByPhone.get(phone) || null;
}

export function listCustomers() {
  return Array.from(customersByPhone.values());
}

export function upsertCustomerByPhone({ phone, name }) {
  if (!phone) {
    return null;
  }

  const current = customersByPhone.get(phone);
  if (current) {
    const updated = { ...current, name: String(name || current.name || "").trim() };
    customersByPhone.set(phone, updated);
    return updated;
  }

  const created = {
    customerId: nextCustomerId(),
    phone,
    name: String(name || "").trim()
  };
  customersByPhone.set(phone, created);
  return created;
}

export function createCustomerByPhone({ phone, name }) {
  if (!phone) {
    return null;
  }

  if (customersByPhone.has(phone)) {
    return null;
  }

  const created = {
    customerId: nextCustomerId(),
    phone,
    name: String(name || "").trim()
  };
  customersByPhone.set(phone, created);
  return created;
}
