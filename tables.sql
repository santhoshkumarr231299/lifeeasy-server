CREATE TABLE delivery_men (username varchar(256), email varchar(256), mobile_number varchar(256), address varchar(256), aadhar_number varchar(256), added_by varchar(256), pharmacy_name varchar(256));

CREATE TABLE invoices (username  varchar(256), pharm_name  varchar(256), branch int, amount  varchar(15), quantity  varchar(20), invoice_date date);

CREATE TABLE managers ( username varchar(256), password varchar(256), email varchar(256), branch_id varchar(256), address varchar(256), pharmacy_name varchar(256));

CREATE TABLE medicines (username  varchar(256), mid  varchar(15), mname  varchar(256), mcompany  varchar(256), quantity  varchar(256) default 0, expiry_date date, med_mrp varchar(15), med_rate varchar(15), status varchar(10) default 0, med_added_date TIMESTAMP  default CURRENT_TIMESTAMP, added_by varchar(256));

CREATE TABLE pharmacists (username varchar(256), email varchar(256), mobile_number varchar(256), address varchar(256), aadhar_number varchar(256), added_by varchar(256));

CREATE TABLE reports (username varchar(256), role int, report_title varchar(256), report_subject varchar(256), report_desc varchar(256), reported_date date);

CREATE TABLE users (username varchar(256), password varchar(256), role int, role_desc varchar(256), last_accessed int default 1, email varchar(256), pharmacy_name varchar(256), branch_id int(10), mobile_number varchar(15), have_access_to varchar(256));

CREATE TABLE approved_items (mid varchar(256), username varchar(256), medname varchar(256), quantity varchar(256), price varchar(256), pharmacy_name varchar(256), delivery_men varchar(256) default 'NOT_ALLOCATED', is_delivered int default 0);

CREATE TABLE cartitems (mid varchar(256), username varchar(256), medname varchar(256), quantity int, price int, pharm_name varchar(256), is_ordered int default 0);

TRUNCATE approved_items;
TRUNCATE cartitems;
TRUNCATE delivery_men;
TRUNCATE invoices;
TRUNCATE managers;
TRUNCATE medicines;
TRUNCATE pharmacists;
TRUNCATE reports;
TRUNCATE users;
