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
  { [apiScreens.AllAuthenticated] : [ "/update-last-accessed", "/get-user-details", "/update-user-details" ] },
  { [apiScreens.Dashboard] : ["/get-dashboard-details"] },
  { [apiScreens.Invoices] : ["/get-invoices", "/get-invoices"] },
  { [apiScreens.Managers] : ["/get-managers", "/post-new-manager"] },
  { [apiScreens.Medicines] : ["/get-medicines", "/post-medicine"] },
  { [apiScreens.Pharmacists] : ["/get-pharmacists-details" , "/post-pharmacist-details"] },
  { [apiScreens.DeliveryMen] : ["/get-delivery-men-details", "/post-delivery-man-details"] },
  { [apiScreens.SalesReport] : []},
  { [apiScreens.Ecommerce] : ["/get-cart-items", "/get-cart-items-count", "/update-cart-items", "/delete-cart-items", "/add-to-cart", "/make-order", "/payment/orders", "/payment/success"] },
  { [apiScreens.Reports] : ["/get-reports", "/post-report"] },
  { [apiScreens.AssignPreviliges] : ["/get-users", "/get-user-previleges", "/update-user-previleges"] },
  { [apiScreens.PharmacistApproval] : ["/approve-order", "/decline-orders", "/get-ordered-items-for-approval"] },
  { [apiScreens.OrderPickup] : ["/get-approved-items", "/pickup-order", "/get-delivery-orders"] },
  { [apiScreens.SearchMedicines] : ["/get-search-medicines"] },
  { [apiScreens.OrgChat] : [] }
];

let apiScreenCodesMap : Map<string, string> = new Map();

apiScreenCodes.forEach((obj : any) => {
  const screenKey : string = Object.keys(obj)[0].toString();
  obj[screenKey].forEach((url : string) => {
      apiScreenCodesMap.set(url, screenKey);
  })
});

function authorizeEndpoint(req : any) {
    const haveAccessTo = req.session[req.headers.authorization].haveAccessTo;
    if(apiScreenCodesMap.has(req.url) && haveAccessTo.includes(apiScreenCodesMap.get(req.url)?.toString())) {
      return true;
    } else {
        return false;
    }
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
    "/logout"
  ];
}
  
module.exports = {
  authorizeEndpoint,
  getAllowedUrls
};