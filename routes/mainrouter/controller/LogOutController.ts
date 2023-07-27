export function logoutUser(req: any, res: any) {
  try {
    let session = req.session;
    delete session[req.headers.authorization];
  } catch (err) {}
  res.status(200).send({
    message: "failed",
  });
}

module.exports = { logoutUser };
