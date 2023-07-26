const { v4: uuidv4 } = require("uuid");

export function isUndefined(value : any) {
    return typeof value == "undefined";
  }

  export function getRandomUuid() {
    return uuidv4();
  }