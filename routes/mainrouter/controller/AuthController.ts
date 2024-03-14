function getMenus(req : any, res : any) {
    let connection = req.db;
    let session = req.session;
    connection.query("select id as screen_id, field_name as screen_name from menus order by id asc", (err : any, result : any, fields : any) => {
        if(err) {
            console.log(err);
            res.send({
                status : "failed",
                message : "Something went wrong"
            })
        } else {
            if(result) {
                let dataList : any[] = [];
                result.forEach((data : any) => {
                    dataList.push({
                        menuId : data.screen_id,
                        menuName : data.screen_name
                    });
                })
                dataList = dataList.filter(data => session[req.headers.authorization].haveAccessTo.includes("[" + data.menuId + "]"));
                res.send({
                    status : "success",
                    data : dataList
                });
            }
        }
    })
}

module.exports = {
    getMenus
}