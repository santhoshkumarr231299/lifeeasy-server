const createTables = [
    {
        tableName : "delivery_men",
        query : "CREATE TABLE delivery_men (username varchar(256) primary key, email varchar(256), mobile_number varchar(20), address varchar(256), aadhar_number varchar(256), added_by varchar(256), pharmacy_name varchar(256))"
    },
    {
        tableName : "invoices",
        query : "CREATE TABLE invoices (id int primary key, username  varchar(256), pharm_name  varchar(256), branch int, amount  varchar(15), quantity  varchar(20), invoice_date date)",
    },
    {
        tableName : "managers",
        query : "CREATE TABLE managers ( username varchar(256) primary key, email varchar(256), branch_id int, address varchar(256), pharmacy_name varchar(256))",
    },
    {
        tableName : "medicines",
        query : "CREATE TABLE medicines (username  varchar(256), mid  varchar(15) primary key, mname  varchar(256), mcompany  varchar(256), quantity  int default 0, expiry_date date, med_mrp varchar(15), med_rate varchar(15), status int default 0, med_added_date TIMESTAMP  default CURRENT_TIMESTAMP, added_by varchar(256))",
    }, 
    {
        tableName : "pharmacists",
        query :  "CREATE TABLE pharmacists (username varchar(256) primary key, email varchar(256), mobile_number varchar(256), pharmacy_name varchar(256),address varchar(256), aadhar_number varchar(256), added_by varchar(256))",
    },
    {
        tableName : "reports",
        query : "CREATE TABLE reports (id int primary key, username varchar(256), pharmacy_name varchar(256), report_title varchar(256), report_subject varchar(256), report_desc varchar(256), reported_date date)",
    },
    {
        tableName : "users",
        query :  "CREATE TABLE users (username varchar(256) primary key, password varchar(256), status int default 1, role int, role_desc varchar(256), last_accessed int default 1, email varchar(256), pharmacy_name varchar(256), branch_id int, mobile_number varchar(20), have_access_to varchar(256), subscription_pack varchar(256) default 'none', date_of_subscription date)",
    },
    {
        tableName : "approved_items",
        query : "CREATE TABLE approved_items (mid varchar(256), username varchar(256), medname varchar(256), quantity int, price varchar(256), pharmacy_name varchar(256), delivery_man varchar(256) default 'NOT_ALLOCATED', is_delivered int default 0)",
    },
    {
        tableName : "cartitems",
        query : "CREATE TABLE cartitems (mid varchar(256), username varchar(256), medname varchar(256), quantity int, price int, pharm_name varchar(256), is_ordered int default 0)",
    },
    {
        tableName : "menus",
        query : "CREATE TABLE menus (id int primary key, field_id varchar(256), field_name varchar(256))"
    },
    {
        tableName : "user_auth",
        query : "CREATE TABLE user_auth (username varchar(256) primary key, two_fa_enabled int(1), multi_fa_enabled int(1), last_otp_sent datetime)"
    },
    {
        tableName : "user_props",
        query : "CREATE TABLE user_props (username varchar(256) primary key, theme_background varchar(256), theme_font_color varchar(256), theme_others varchar(256))"
    },
    {
        tableName : "app_themes",
        query : "CREATE TABLE app_themes (id int primary key, name varchar(256), background varchar(256), font_color varchar(256), others varchar(256))"
    }
];


function intiliazeAllTables(connection : any) {
    console.log("Table Intialization started...");
    const isTableExistQuery = "SELECT * FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1";

    createTables.forEach((table : any) => {
        connection.query(isTableExistQuery, [process.env.DB_LOCAL_DBNAME, table.tableName], (tableExistError : any, tableExistResult : any, tableExistFields : any) => {
            if(tableExistError) console.log("Error checking table exists...", tableExistError)
            else if(tableExistResult.length == 0) { 
                connection.query(table.query, (err : any, result : any, fields : any) => {
                    if(err) {
                        console.log("Error creating table...");
                        console.log(err);
                    }
                });
            }

        })
    })
}

module.exports = {
    intiliazeAllTables
}