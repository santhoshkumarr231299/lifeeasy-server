const apiScreens = require("../../util/authorizeUtil.ts").apiScreens;

const getAdminAccess = () : string => {
    return apiScreens.Dashboard + apiScreens.Invoices + apiScreens.Managers + apiScreens.Medicines + apiScreens.Pharmacists + apiScreens.DeliveryMen 
    + apiScreens.SalesReport + apiScreens.Reports + apiScreens.AssignPreviliges + apiScreens.OrgChat;
}

const getManagerAccess = () : string => {
    return apiScreens.Dashboard + apiScreens.Invoices + apiScreens.Medicines + apiScreens.Pharmacists + apiScreens.DeliveryMen + apiScreens.SalesReport
    + apiScreens.Reports + apiScreens.OrgChat;
}

const getPharmacistAccess = () : string => {
    return apiScreens.PharmacistApproval + apiScreens.OrgChat;
}

const getDelveryManAccess = () : string => {
    return apiScreens.OrderPickup + apiScreens.OrgChat;
}

const getEcommerceAccess = () : string => {
    return apiScreens.Ecommerce + apiScreens.SearchMedicines;
}

const UserRoleAndAccessilibity = {
    admin : { roleId : 1, access : getAdminAccess() },
    manager : { roleId : 2, access : getManagerAccess() },
    pharmacist : { roleId : 3, access : getPharmacistAccess() },
    deliveryMan : { roleId : 4, access : getDelveryManAccess() },
    ecommerce : { roleId : 4, access : getEcommerceAccess() },
}

module.exports = {
    UserRoleAndAccessilibity
}