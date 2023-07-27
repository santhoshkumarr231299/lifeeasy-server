const { v4: uuidv4 } = require("uuid");

function isUndefined(value: any) {
  return typeof value == "undefined";
}

function getRandomUuid() {
  return uuidv4();
}

module.exports = {
  isUndefined,
  getRandomUuid,
};
