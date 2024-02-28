const LicenseDetails = require("../../mainrouter/controller/LicenseController.ts");

async function authorizeEndpoint(req : any) {
    return new Promise(async (resolve : any, reject : any) => {
      try {
        const licenseDetails = await LicenseDetails.getLicenseDetails(req);
        const dateOfSubscription = licenseDetails.dateOfSubscription;
        const subscriptionPack = licenseDetails.subscriptionPack;
        let today : any = new Date();
        let DateOfSubscription : any = new Date(dateOfSubscription);
        if(subscriptionPack == "monthly" && (today - DateOfSubscription) / (1000 * 60 * 60 * 24) <= 30) {
            resolve(true);
        } else if (subscriptionPack == "yearly" && (today - DateOfSubscription) / (1000 * 60 * 60 * 24) <= 365) {
            resolve(true);
        } else {
            resolve(false);
        }
      } catch(e) {
        console.log(e);
        resolve(false);
      }
    })
}

function getAllowedUrls() {
  return [];
}
  
module.exports = {
  authorizeEndpoint,
  getAllowedUrls
};