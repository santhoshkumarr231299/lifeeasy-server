const allThemes = [
    {
        id: 1,
        name: "Light Theme",
        background: "white",
        fontColor: "black",
        others: "purple"
    },
    {
        id: 2,
        name: "Dark Theme",
        background: "black",
        fontColor: "white",
        others: "purple"
    }
]

function makeAllThemesEntry(connection : any) {
  console.log("Initiating to insert themes...");

  let themeInsertQuery = "insert into app_themes (id, name, background, font_color, others) values (?, ?, ?, ?, ?)";
  let dataCheckQuery = "select id from app_themes";

  connection.query(dataCheckQuery, (dataCheckErr : any, dataCheckResult : any, dataCheckFields : any) => {
      if(dataCheckErr) console.log("Error checking the theme data...", dataCheckErr)
      else if(dataCheckResult.length == 0) {
          allThemes.forEach((theme : any) => {
              connection.query(themeInsertQuery, [theme.id, theme.name, theme.background, theme.fontColor, theme.others], (err : any, result : any, fields : any) => {
                  if(err) console.log("Error while initializing themes : ", err);
              });
          });
          console.log("New Values inserted for Themes...");
      }
  })
}

module.exports = {
  makeAllThemesEntry
}
