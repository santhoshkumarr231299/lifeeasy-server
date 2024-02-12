const TableInitializer = require("./initialize-tables.ts");
const MenuInitializer = require("./all-menus.ts");

function initializeStartupEntries(connection : any) {
    if(process.env.PRODUCTION == "false") {
        console.log("Initiating Startup Entries...");
        TableInitializer.intiliazeAllTables(connection);
        MenuInitializer.makeAllMenusEntry(connection);
    }
}


module.exports = {
    initializeStartupEntries
}