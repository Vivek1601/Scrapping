// node cricinfoExtracter.js --dataFolder=data --excel=Worldcup.csv --source="https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results"
let minimist = require("minimist");
let fs = require("fs");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let path = require("path");

let args = minimist(process.argv);

let responseKaPromise = axios.get(args.source);
responseKaPromise.then(function (response) {
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let matches = [];
    let matchdivs = document.querySelectorAll("div.match-score-block");
    for (let i = 0; i < matchdivs.length; i++) {
        let matchdiv = matchdivs[i];
        let match = {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: ""
        };
        let teamsparas = matchdiv.querySelectorAll("div.name-detail > p.name");
        match.t1 = teamsparas[0].textContent;
        match.t2 = teamsparas[1].textContent;

        let scoreSpans = matchdiv.querySelectorAll("div.score-detail > span.score");
        if (scoreSpans.length == 2) {
            match.t1s = scoreSpans[0].textContent;
            match.t2s = scoreSpans[1].textContent;
        } else if (scoreSpans.length == 1) {
            match.t1s = scoreSpans[0].textContent;
            match.t2s = "";
        } else {
            match.t1s = "";
            match.t2s = "";
        }

        let resultSpan = matchdiv.querySelector("div.status-text > span");
        match.result = resultSpan.textContent;

        matches.push(match);
    }
    // console.log(matches);
    let matchesJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesJSON, "utf-8");

    let teams = [];
    for (let i = 0; i < matches.length; i++) {
        putTeamInTeamsArrayIfMissing(teams, matches[i]);
    }
    for (let i = 0; i < matches.length; i++) {
        putMatchInAppropriateTeam(teams, matches[i]);
    }
    //  console.log(teams);
    let teamsJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsJSON, "utf-8");

    createExcelFile(teams);
    createFolders(teams);
})

function putTeamInTeamsArrayIfMissing(teams, match) {
    // let t1idx = teams.findIndex(function(team){
    //     if(team.name==match.t1){
    //         return true;
    //     }else{
    //         return false;
    //     }
    // });
    // if(t1idx==-1){
    //     let team = {
    //         name: match.t1,
    //         matches: []

    //     };
    //     teams.push(team);
    // }

    // let t2idx = teams.findIndex(function(team){
    //     if(team.name==match.t2){
    //         return true;
    //     }else{
    //         return false;
    //     }
    // })
    // if(t2idx==-1){
    //     let team = {
    //         name: match.t2,
    //         matches: []

    //     };
    //     teams.push(team);
    // } 

    // OR

    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }
    if (t1idx == -1) {
        //    let team = {
        //        name: match.t1,
        //        matches: []
        //    };
        //    teams.push(team);

        //  OR 
        teams.push({
            name: match.t1,
            matches: []
        });
    }

    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }
    if (t2idx == -1) {
        //    let team = {
        //        name: match.t2,
        //        matches: []
        //    };
        //    teams.push(team);

        //  OR 
        teams.push({
            name: match.t2,
            matches: []
        });
    }
}

function putMatchInAppropriateTeam(teams, match) {
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }
    let team1 = teams[t1idx];
    team1.matches.push({
        vs: match.t2,
        selfScore: match.t1s,
        oppScore: match.t2s,
        result: match.result
    });

    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }
    let team2 = teams[t2idx];
    team2.matches.push({
        vs: match.t1,
        selfScore: match.t2s,
        oppScore: match.t1s,
        result: match.result
    });
}

function createExcelFile(teams) {
    let wb = new excel.Workbook();
    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name);
        sheet.cell(1, 1).string("VS");
        sheet.cell(1, 2).string("Self Score");
        sheet.cell(1, 3).string("Opp Score");
        sheet.cell(1, 4).string("Result");

        for (let j = 0; j < teams[i].matches.length; j++) {

            sheet.cell(2 + j, 1).string(teams[i].matches[j].vs);
            sheet.cell(2 + j, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(2 + j, 3).string(teams[i].matches[j].oppScore);
            sheet.cell(2 + j, 4).string(teams[i].matches[j].result);


        }
    }
    wb.write(args.excel);
}
function createFolders(teams) {
    //  making folder 
    if (fs.existsSync(args.dataFolder) == true) {
        fs.rmdirSync(args.dataFolder, { recursive: true });
    }
    fs.mkdirSync(args.dataFolder);
    for (let i = 0; i < teams.length; i++) {
        let teamsFN = path.join(args.dataFolder, teams[i].name);
        fs.mkdirSync(teamsFN);

        // making file
        for (let j = 0; j < teams[i].matches.length; j++) {
            let matchFileName = path.join(teamsFN, teams[i].matches[j].vs);
            // fs.writeFileSync(matchFileName,"","utf8");

            createScoreCard(teams[i].name, teams[i].matches[j], matchFileName);
        }
    }
}

function createScoreCard(teamName, match, matchFileName) {
    //    console.log(teamName);
    //    console.log(match.vs);
    //    console.log(match.result);
    //    console.log(matchFileName);
    //    console.log("---------------------");

    let t1 = teamName;
    let t2 = match.vs;
    let t1s = match.selfScore;
    let t2s = match.oppScore;
    let result = match.result;

    let originalBytes = fs.readFileSync("template.pdf");
    let promiseToLoadBytes = pdf.PDFDocument.load(originalBytes);
    promiseToLoadBytes.then(function (pdfdoc) {
        let page = pdfdoc.getPage(0);
        //   page.drawText("Hello World");
        page.drawText(t1, {
            x: 320,
            y: 680,
            size: 8
        });
        page.drawText(t2, {
            x: 320,
            y: 665,
            size: 8
        });
        page.drawText(t1s, {
            x: 320,
            y: 650,
            size: 8
        });
        page.drawText(t2s, {
            x: 320,
            y: 635,
            size: 8
        });
        page.drawText(result, {
            x: 320,
            y: 620,
            size: 8
        });
        let promiseToSave = pdfdoc.save();
        promiseToSave.then(function (changedBytes) {
            if (fs.existsSync(matchFileName + ".pdf")) {
                fs.writeFileSync(matchFileName + "1.pdf", changedBytes);
            } else {
                fs.writeFileSync(matchFileName + ".pdf", changedBytes);
            }
        })
    })
}








