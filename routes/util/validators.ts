function validateUsername(field : string) {
    if(!field || field.length === 0) {
        return "Username should not be empty";
    }
    else if(field.includes(" ")) {
        return "Enter a Valid Username (Spaces are not allowed)";
    }
    else if(field.length < 6)
    {
        return "Username should have more than 5 letters";
    }
    else if(field.toLowerCase() !== field) {
        return "Password should only contain Lower Case letters";
    } 
    else {
       return "";
    }
}

function validatePassword(field : string) {
    if(!field || field.length === 0) {
        return "Password should not be empty";
    }
    else if(field.length < 6)
    {
        return "Password should have more than 5 letters";
    }
    else {
        var lowerCaseLetters = /[a-z]/g;
        if(!field.match(lowerCaseLetters)) {  
            return "Password should contain a Lower Case, (Upper Case and a number)";
        }
        
        var upperCaseLetters = /[A-Z]/g;
        if(!field.match(upperCaseLetters)) {  
            return "Password should contain a Upper Case, (Lower Case and a number)";
        }

        var numbers = /[0-9]/g;
        if(!field.match(numbers)) {  
            return "Password should contain a number, (Lower Case and Upper Case)";
        }
        return "";
    }
}

function validateAddress(field : string) {
    if(!field || field.length === 0) {
        return "Address should not be empty";
    }
    else if(field.length < 6)
    {
        return "Address should have more than 8 letters";
    }
    else {
        return "";
    }
}

function validatePhoneNumber(field : string) {
    if(!field || field.length === 0) {
        return "Phone Number should not be empty";
    }
    else if(field.length < 8 || 15 < field.length)
    {
        return "Enter a valid phone number";
    }
    else {
        return "";
    }
}

function validateEmail(field : string) {
    var mailPattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if(!field || field.length === 0) {
        return "Email should not be empty";
    }
    else if(!field.match(mailPattern)) {
        return "Enter a valid Email";
    }
    else {
        return "";
    }
}

function validatePharmacyName(field : string) {
    if(!field || field.length === 0) {
        return "Pharmacy Name should not be empty";
    }
    else if(field !== field.toLowerCase()) {
        return "Pharmacy Name should only contain Lower Case Letters";
    }
    else {
        return "";
    }
}

function validateMedCompanyName(field : string) {
    if(!field || field.length === 0) {
        return "Medicine Company Name should not be empty";
    }
    else if(field !== field.toLowerCase()) {
        return "Medicine Company Name should only contain Lower Case Letters";
    }
    else {
        return "";
    }
}

function validateQuantity(field : number, maxField : number, minField : number) {
    if(!field || field === 0) {
        return "Quantity should not be Empty";
    }
    else if(field < minField) 
    {
        return "Quantity should be more than " + minField;
    }
    else if(field > maxField)
    {
        return "Quantity should be less than " + maxField;
    }
    return "";
}

function validateAadhar(field : string) {
    field = field.toString();
    if(!field || field.length === 0) 
    {
        return "Aadhar Number should be empty";
    }
    else if(field.length <= 8) {
        return "Aadhar Number should be more than 8 number";
    }
    return "";
}

function validateReports(fieldName : string, field : string, minField : number, maxField : number) {
    if(!field || field.length === 0) 
    {
        return fieldName.trim() +" should not be Empty";
    }
    else if(field.trim().length < minField) {
        return fieldName.trim() +" should have atleast "+minField+" letters";
    }
    else if(field.trim().length > maxField) {
        return fieldName.trim() +" should be less than "+maxField+" letters";
    }
    return "";
}

function validateBranchId(field : string) {
    if(!field || field.length === 0) 
    {
        return  "Branch ID should not be Empty";
    }
    else {
        return "";
    }
}

function validateMedicineName(field : string) {
    if(!field || field.length === 0) 
    {
        return "Medicine Name should not be Empty";
    }
    else if(field !== field.toLowerCase()) {
        return "Medicine Name should only contain Lower Case Letters";
    }
    else if(field.length < 6)
    {
        return "Medicine Name should have more than 5 letters";
    }
    else {
        return "";
    }
}

module.exports = {
    validateUsername,
    validatePassword,
    validateAddress,
    validatePhoneNumber,
    validateEmail,
    validatePharmacyName,
    validateMedCompanyName,
    validateQuantity,
    validateAadhar,
    validateReports,
    validateBranchId,
    validateMedicineName
}


