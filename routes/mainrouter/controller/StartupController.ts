const nodemailer = require("nodemailer");
const mysql = require("mysql");
const mysql2 = require("mysql2");
const cors = require("cors");
require("dotenv").config();

export function getConnection() {
  if (process.env.PRODUCTION === "false") {
    return mysql.createPool({
      connectionLimit: process.env.DB_LOCAL_CON_LIMMIT,
      port: process.env.DB_LOCAL_PORT,
      host: process.env.DB_LOCAL_HOST,
      user: process.env.DB_LOCAL_USER,
      password: process.env.DB_LOCAL_PASSWORD,
      database: process.env.DB_LOCAL_DBNAME,
    });
  } else {
    return mysql2.createPool(process.env.PLANETSCALE_DATABASE_URL);
  }
}

export function getTransporterData() {
  return nodemailer.createTransport({
    service: process.env.MAIL_SERVICE_NAME,
    auth: {
      user: process.env.MAIL_AUTH_USERNAME,
      pass: process.env.MAIL_AUTH_PASSWORD,
    },
  });
}

export function useCors() {
  return cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false,
    exposedHeaders: [
      process.env.AUTH_NAME,
      process.env.NEW_USER_AUTH_KEY,
      process.env.FORGOT_PASS_CHANGE_AUTH,
    ],
  });
}

export function getAllowedUrls() {
  return [
    "/new-user",
    "/logged-in",
    "/forgot-pass-change",
    "/login",
    "/security/verify-email",
    "/security/generate-email",
    "/check-username",
  ];
}

module.exports = {
  getConnection,
  getTransporterData,
  useCors,
  getAllowedUrls,
};
