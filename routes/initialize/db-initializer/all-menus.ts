const allMenus = [
      {
        id: 1,
        fieldId: "[1]",
        fieldName: "Dashboard",
      },
      {
        id: 2,
        fieldId: "[2]",
        fieldName: "Invoice",
      },
      {
        id: 3,
        fieldId: "[3]",
        fieldName: "Customer",
      },
      {
        id: 4,
        fieldId: "[4]",
        fieldName: "Medicine",
      },
      {
        id: 5,
        fieldId: "[5]",
        fieldName: "Pharmacist",
      },
      {
        id: 6,
        fieldId: "[6]",
        fieldName: "Delivery Man",
      },
      {
        id: 7,
        fieldId: "[7]",
        fieldName: "Sales Report",
      },
      {
        id: 8,
        fieldId: "[8]",
        fieldName: "Purchase",
      },
      {
        id: 9,
        fieldId: "[9]",
        fieldName: "Reports",
      },
      {
        id: 11,
        fieldId: "[11]",
        fieldName: "Orders Approval",
      },
      {
        id: 12,
        fieldId: "[12]",
        fieldName: "Orders Pickup",
      },
      {
        id: 13,
        fieldId: "[13]",
        fieldName: "Medicine Details",
      },
      {
        id: 14,
        fieldId: "[14]",
        fieldName: "Chat with Organization",
      },
]

function makeAllMenusEntry(connection : any) {
    console.log("Initiating to insert menu entries...");

    let menuInsertQuery = "insert into menus (id, field_id, field_name) values (?, ?, ?)";
    let dataCheckQuery = "select id from menus";

    connection.query(dataCheckQuery, (dataCheckErr : any, dataCheckResult : any, dataCheckFields : any) => {
        if(dataCheckErr) console.log("Error checking the menu data...", dataCheckErr)
        else if(dataCheckResult.length == 0) {
            allMenus.forEach((menu : any) => {
                connection.query(menuInsertQuery, [menu.id, menu.fieldId, menu.fieldName], (err : any, result : any, fields : any) => {
                    if(err) console.log("Error while initializing menu values : ", err);
                })
            })
            console.log("New Values inserted for menus...");
        }
    })
}

module.exports = {
    makeAllMenusEntry
}
