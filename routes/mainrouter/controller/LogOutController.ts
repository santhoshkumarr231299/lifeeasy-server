const AuthUtil = require("./../../util/AuthUtil.ts");

export function logoutUser(req: any, res: any) {
  AuthUtil.deleteProvidedSession(req.headers.authorization, req.session);
  res.status(200).send({
    message: "failed",
  });
}

module.exports = { logoutUser };
