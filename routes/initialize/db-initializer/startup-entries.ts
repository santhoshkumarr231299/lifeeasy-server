const TableInitializer = require("./initialize-tables.ts");
const MenuInitializer = require("./all-menus.ts");
const ThemeInitializer = require("./all-themes.ts");
const StartupController = require("../../mainrouter/controller/StartupController.ts");

async function initializeStartupEntries(connection : any) {
    try {
        console.log("Initiating Startup Entries...");
        await createDbIfNotExists();
        await TableInitializer.intiliazeAllTables(connection);
        ThemeInitializer.makeAllThemesEntry(connection);
        MenuInitializer.makeAllMenusEntry(connection);
    } catch(err) {
        throw err;
    }
}

const createDbIfNotExists = async () => {
    return new Promise((resolve, reject) => {
        console.log("Checking the database...");
        StartupController.getConnectionForDbCreation().query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_LOCAL_DBNAME}\``, (err : any) => {
            if(err) {
                console.log("Error checking database...");
                console.log(err);
                reject();
            } else {
                resolve(0);
            }
        });
    });
    
}


module.exports = {
    initializeStartupEntries
}