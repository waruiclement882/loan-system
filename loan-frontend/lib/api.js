const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

const getToken = () => localStorage.getItem("token");

const headers = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${getToken()}`
});

export const login = async (email, password) => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return res.json();
};

export const getCustomers = async () => {
  const res = await fetch(`${API_URL}/api/customers`, { headers: headers() });
  return res.json();
};

export const createCustomer = async (data) => {
  const res = await fetch(`${API_URL}/api/customers`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data)
  });
  return res.json();
};

export const getLoans = async () => {
  const res = await fetch(`${API_URL}/api/loans`, { headers: headers() });
  return res.json();
};

export const createLoan = async (data) => {
  const res = await fetch(`${API_URL}/api/loans`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data)
  });
  return res.json();
};

export const getPayments = async () => {
  const res = await fetch(`${API_URL}/api/payments`, { headers: headers() });
  return res.json();
};

export const createPayment = async (data) => {
  const res = await fetch(`${API_URL}/api/payments`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data)
  });
  return res.json();
};

export const getPricingRules = async () => {
  const res = await fetch(`${API_URL}/api/pricing`, { headers: headers() });
  return res.json();
};