//https://crontab.guru/#49_3_*_*_*
const spawn = require("child_process").spawn;  
const schedule = require("node-schedule");

console.log(process.cwd())

// const someDate = new Date('2021')

schedule.scheduleJob("* * * * *", () => {   //3:30
    console.log("Launching standings scraper.\n");
    spawn("node", ["index.js"]);
  });