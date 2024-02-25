const AuthData = require("./../data/auth-data.ts");
const AuthorizationUtil = require("../../util/authorizeUtil.ts");
const StartupController = require("./../controller/StartupController.ts");
const url = require("url");

async function checkAuth(req : any, res : any, next : any) {
  try {
    res.removeHeader("X-Powered-By");
    const parsedUrl = url.parse(req.url);
        const pathName = parsedUrl.pathname;
    if (AuthorizationUtil.getAllowedUrls().filter((url : string) => url == pathName).length > 0) {
        req.session = AuthData.getSessionData();
        req.db = StartupController.getConnection();
        req.otpRecords = AuthData.getOtpRecords();
        next();
    } else if (
        req.headers.authorization &&
        AuthData.getSessionData()[req.headers.authorization] &&
        AuthData.getSessionData()[req.headers.authorization].username
    ) {
        req.session = AuthData.getSessionData();
        req.db = StartupController.getConnection();
        req.otpRecords = AuthData.getOtpRecords();
        if(!(await AuthorizationUtil.authorizeEndpoint(req))) {
        res.status(403).send({
            status: "failed",
            message: "Unauthorized Content",
        });
        return;
        }
        next();
    } else {
        res.status(403).send({
        status: "failed",
        message: "Unauthorized Content",
        });
    }
  } catch(e) {
    console.log(e);
    res.status(500).send("Something went wrong");
  }
}

module.exports = {
    checkAuth
}