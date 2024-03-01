const LicenseDetails = require("../mainrouter/controller/LicenseController.ts");
const url = require("url");

enum apiScreens {
    AllAuthenticated = "",
    Dashboard = "[1]",
    Invoices = "[2]",
    Managers = "[3]",
    Medicines = "[4]",
    Pharmacists = "[5]",
    DeliveryMen = "[6]",
    SalesReport = "[7]",
    Ecommerce = "[8]",
    Reports = "[9]",
    AssignPreviliges = "[10]",
    PharmacistApproval = "[11]",
    OrderPickup = "[12]",
    SearchMedicines = "[13]",
    OrgChat = "[14]"
}

const apiScreenCodes : any[] = [
  { [apiScreens.AllAuthenticated] : [ "/update-last-accessed", "/get-user-details", "/update-user-details", "/update-pass", "/payment/subscription", "/payment/subscription/success", "/activate-free-trial" ], prefix : "" },
  { [apiScreens.Dashboard] : ["/get-dashboard-details"], prefix : "" },
  { [apiScreens.Invoices] : ["/get-invoices", "/get-invoices"], prefix : "" },
  { [apiScreens.Managers] : ["/get-managers", "/post-new-manager"], prefix : "" },
  { [apiScreens.Medicines] : ["/get-medicines", "/post-medicine", "/medicine/upload"], prefix : "" },
  { [apiScreens.Pharmacists] : ["/get-pharmacists-details" , "/post-pharmacist-details"], prefix : "" },
  { [apiScreens.DeliveryMen] : ["/get-delivery-men-details", "/post-delivery-man-details"], prefix : "" },
  { [apiScreens.SalesReport] : [], prefix : ""},
  { [apiScreens.Ecommerce] : ["/get-cart-items", "/get-cart-items-count", "/update-cart-items", "/delete-cart-items", "/add-to-cart", "/payment/orders", "/payment/success", "/get-search-medicines"], prefix : "" },
  { [apiScreens.Reports] : ["/get-reports", "/post-report"], prefix : "" },
  { [apiScreens.AssignPreviliges] : ["/get-users", "/get-user-previleges", "/update-user-previleges"], prefix : "" },
  { [apiScreens.PharmacistApproval] : ["/approve-order", "/decline-orders", "/get-ordered-items-for-approval"], prefix : "" },
  { [apiScreens.OrderPickup] : ["/get-approved-items", "/pickup-order", "/get-delivery-orders"], prefix : "" },
  { [apiScreens.SearchMedicines] : [], prefix : "" },
  { [apiScreens.OrgChat] : [], prefix : "" }
];

let apiScreenCodesMap : Map<string, string> = new Map();


console.log("Updating authorization Enpoints...");
apiScreenCodes.forEach((obj : any) => {
  const screenKey : string = Object.keys(obj)[0];
  const prefixUrl : string = obj.prefix;
  obj[screenKey].forEach((url : string) => {
      apiScreenCodesMap.set(prefixUrl + url, screenKey);
  })
});

async function authorizeEndpoint(req : any) {
    return new Promise(async (resolve : any, reject : any) => {
      try {
        const parsedUrl = url.parse(req.url);
        const pathName = parsedUrl.pathname;
        const haveAccessTo = req.session[req.headers.authorization].haveAccessTo;
        const licenseDetails = await LicenseDetails.getLicenseDetails(req);
        const dateOfSubscription = licenseDetails.dateOfSubscription;
        const subscriptionPack = licenseDetails.subscriptionPack;
        if(apiScreenCodesMap.has(pathName) && haveAccessTo.includes(apiScreenCodesMap.get(pathName))) {
          if(apiScreenCodesMap.get(pathName) != apiScreens.Ecommerce && apiScreenCodesMap.get(pathName) != apiScreens.AllAuthenticated) {
            let today : any = new Date();
            let DateOfSubscription : any = new Date(dateOfSubscription);
            if(subscriptionPack == "monthly" && (today - DateOfSubscription) / (1000 * 60 * 60 * 24) <= 30) {
              resolve(true);
            } else if (subscriptionPack == "yearly" && (today - DateOfSubscription) / (1000 * 60 * 60 * 24) <= 365) {
              resolve(true);
            } else {
              resolve(false);
            }
          } else {
            resolve(true);
          }
        } else {
          resolve(false);
        }
      } catch(e) {
        console.log(e);
        resolve(false);
      }
    })
}

function getApiScreenByValue(screenCode: string): boolean {
  for (const value of Object.values(apiScreens)) {
      if (value === screenCode) {
          return true;
      }
  }
  return false;
}

function isScreenCodeSupported(screenCode : number) : boolean {
  return getApiScreenByValue("[" + screenCode + "]");
}

function getAllowedUrls() {
  return [
    "/new-user",
    "/logged-in",
    "/forgot-pass-change",
    "/login",
    "/security/verify-email",
    "/security/generate-email",
    "/check-username",
    "/security/verify-email",
    "/security/generate-email",
    "/forgot-pass-change",
    "/medicine-image",
    "/logout"
  ];
}
  
module.exports = {
  authorizeEndpoint,
  isScreenCodeSupported,
  getAllowedUrls
};