const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

function isUndefined(value: any) {
  return typeof value == "undefined";
}

function getRandomUuid() {
  return uuidv4();
}

function generateJWTToken(data  : any) {
  let jwtSecretKey = process.env.JWT_SECRET_KEY;
  const token = jwt.sign(data, jwtSecretKey);
  return token;
}

module.exports = {
  isUndefined,
  getRandomUuid,
  generateJWTToken
};
