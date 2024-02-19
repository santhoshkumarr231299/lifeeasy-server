
const StartupController = require("../controller/StartupController.ts");
const AuthData = require("../data/auth-data.ts");

function getLicenseDetails(req : any) {
    return new Promise((resolve : any, reject : any) => {
        let session = AuthData.getSessionData();
        let connection = StartupController.getConnection();
        connection.query(
            "select subscription_pack, date_of_subscription from users where username = ?  and status = 1", 
            [session[req.headers.authorization].username, session[req.headers.authorization].pharmacy], 
            (err: any, result: any, fields: any) => {
            if (result && result.length === 1) {
                resolve(
                    {
                        subscriptionPack: result[0].subscription_pack,
                        dateOfSubscription: result[0].date_of_subscription,
                    }
                        ) ;
            } else {
                reject({});
            }
            }
        );
    })
}

module.exports = {
    getLicenseDetails
}