import { getMySqlPool, ensureMySqlSchema } from "../../db/mysql.js";

function nextCustomerId() {
  return `cus_${Math.random().toString(36).slice(2, 10)}`;
}

export async function mysqlGetCustomerByPhone(phone) {
  await ensureMySqlSchema();
  const db = getMySqlPool();
  const [rows] = await db.query(
    "SELECT customer_id AS customerId, phone, name FROM customers WHERE phone = ? LIMIT 1",
    [phone]
  );
  return rows[0] || null;
}

export async function mysqlListCustomers() {
  await ensureMySqlSchema();
  const db = getMySqlPool();
  const [rows] = await db.query(
    "SELECT customer_id AS customerId, phone, name FROM customers ORDER BY created_at DESC"
  );
  return rows;
}

export async function mysqlCreateCustomerByPhone({ phone, name }) {
  await ensureMySqlSchema();
  const existing = await mysqlGetCustomerByPhone(phone);
  if (existing) {
    return null;
  }

  const customer = {
    customerId: nextCustomerId(),
    phone,
    name: String(name || "").trim()
  };

  const db = getMySqlPool();
  await db.query(
    "INSERT INTO customers (customer_id, phone, name) VALUES (?, ?, ?)",
    [customer.customerId, customer.phone, customer.name]
  );

  return customer;
}

export async function mysqlUpsertCustomerByPhone({ phone, name }) {
  await ensureMySqlSchema();
  const db = getMySqlPool();
  const customerId = nextCustomerId();
  const normalizedName = String(name || "").trim();

  await db.query(
    `
      INSERT INTO customers (customer_id, phone, name)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = CASE
          WHEN VALUES(name) <> '' THEN VALUES(name)
          ELSE name
        END
    `,
    [customerId, phone, normalizedName]
  );

  return mysqlGetCustomerByPhone(phone);
}