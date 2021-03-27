const puppeteer = require("puppeteer");
const xlsx = require("xlsx");
const writeFileSync = require("fs").writeFileSync;
const nodemailer = require("nodemailer");
const fs = require('fs')
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail", 
    auth: {
      user: "thomas.coenen58@gmail.com",
      pass: process.env.PASSWORD
    }
  });

const sendEmail = async (msg, error=false) => {
    console.log(`Sending email ${error ? "error alert" : "alert"}...`);
    transporter.sendMail({
        to: "thomas.coenen58@gmail.com",
        from: "thomas.coenen58@gmail.com",
        subject: error ? "Scraper Error" : "Scraper Results",
        html: msg
      });
    console.log(`Alert sent successfully.`);
}

const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    "--disable-div-shm-usage",
    '--disable-gpu',
    "--profile-directory=Default",
];

const options = {
    args,
    headless: true, // default is true
};

async function writeToFiles (data) {
    if (data){
        const workbook = xlsx.utils.book_new()
        const worksheet = xlsx.utils.json_to_sheet(data) //jsonToSheet converts Arr of Objects to Sheet
        xlsx.utils.book_append_sheet(workbook, worksheet) //add worksheet to workbook
        xlsx.writeFile(workbook, "amps.xlsx") //create the file

        fs.writeFile('./amps.json', JSON.stringify(data, null, 2), err => {
            if (err) {
                console.log('Error writing file', err)
            } else {
                console.log('Successfully wrote file')
            }
        })
        sendEmail(
            `<ul style="list-style:none;">
                ${
                    data.map((product, i) => 
                        // `<li>${i + 1}: ${product.price} - <a href=${product.url}>${product.name}</a></li>`
                        `<li>${i + 1}: ${product.price}-<a href=${product.url} style="font-size:8px;>${product.url}</a></li>`
                )}
            </ul>`.replace(/\,/g, "")
        )
    }
}

function convertPrice(priceArr, re) {   //remove all non digits from price & decimals
    let convertedPrice=[];
    for (var k = 0; k < priceArr.length; k++) {
        let _newPrice = parseInt(priceArr[k].replace(re, ""));  
        convertedPrice.push(_newPrice)
    }
    return convertedPrice
}

// function sortPrice(resultArr) {   //remove all non digits from price & decimals
//     resultArr.sort(function(a, b) {
//         // if (a.price < b.price) return -1;
//         // if (a.price > b.price) return 1;
//         // return 0;
//         return a.price - b.price;
//     })
// }

async function getPageData () {
    let re = /[^0-9.-]+/g
    const reverbLinks = [
        "https://reverb.com/marketplace?query=mesa%20mark%20iii&sort=price%7Casc&product_type=amps", 
        "https://reverb.com/marketplace?query=mesa%20mark%20iv&product_type=amps&sort=price%7Casc",
        "https://reverb.com/marketplace?query=mesa%20mark%20v&product_type=amps&sort=price%7Casc"
    ];
    const craigslistLinks = [
        "https://cse.google.com/cse?cx=008732268318596706411:nhtd4cwl5xu&q=mesa%20mark%20iii&oq=mesa%20mark%20iii&gs_l=partner-generic.3...2515.4658.0.4907.13.13.0.0.0.0.154.1177.10j3.13.0.csems%2Cnrl%3D13...0.2129j508005j13...1.34.partner-generic..2.11.987.b_ZEU_5etk0",
        "https://cse.google.com/cse?cx=008732268318596706411:nhtd4cwl5xu&q=mesa%20boogie%20mark%20iv&oq=mesa%20boogie%20mark%20iv&gs_l=partner-generic.3...1991.4211.0.4527.19.19.0.0.0.0.195.2065.10j9.19.0.csems%2Cnrl%3D13...0.2233j326269j19...1.34.partner-generic..14.5.623.5YrTKHbXRCw",
        "https://cse.google.com/cse?cx=008732268318596706411:nhtd4cwl5xu&q=mesa%20boogie%20mark%20v&oq=mesa%20boogie%20mark%20v&gs_l=partner-generic.12...1645.4622.0.5891.18.18.0.0.0.0.175.1950.6j12.18.0.csems%2Cnrl%3D13...0.2982j1224844j18...1.34.partner-generic..13.5.632.qEXPd1CGG6k"
    ];
    const ebayLinks = [
        "https://www.ebay.com/sch/38072/i.html?_from=R40&_nkw=mesa+mark+iii&_sop=16",
        "https://www.ebay.com/sch/i.html?_from=R40&_nkw=mesa+mark+iv&_sacat=0&_sop=16",
        "https://www.ebay.com/sch/i.html?_from=R40&_nkw=mesa+mark+v&_sacat=0&_sop=16"
    ];
    const facebookLinks = [
        "https://www.facebook.com/marketplace/100247876684196/search?sortBy=price_descend&query=mesa%20mark&exact=false"
    ];
    var result = [];
    try{
        for(let link of reverbLinks){  //Loop thru each link to get individual data
            const browser = await puppeteer.launch(options);
            const page = await browser.newPage();

            // const secondToWait = (Math.floor(Math.random() * 5) + 1) * 1000  //wait between each iteration. Create random number (1-3)
            await page.waitForTimeout(500);  
            await page.goto(link, {waitUntil: 'networkidle2'});
            const name = await page.$$eval('.tiles.tiles--four-wide-max > li .grid-card__title', items => items.map(item=>item.innerHTML));
            const price = await page.$$eval('.tiles.tiles--four-wide-max > li .price-display', items => items.map(item=>item.innerHTML));
            const _url = await page.$$eval('.grid-card__inner', links => links.map(link=>link.href));

            let newPrice = convertPrice(price, re)  //remove all non digits from price
            // console.log("newPrice:",newPrice)

            for(var j=0; j<name.length; j++){   //combine both arrays in array of objects
            result.push({
                name: name[j], 
                price: newPrice[j],
                url: _url[j]
                });
            }
            await browser.close();
        }
        // result.push({price:'-----------------------------------------------------------CRAIGSLIST:------------------------------------------------------------------------'});
        // console.log("result1:",result)

        for(let link of craigslistLinks){  //Loop thru each link to get individual data
            const browser = await puppeteer.launch(options);
            const page = await browser.newPage();
            await page.waitForTimeout(500);  
            await page.goto(link, {waitUntil: 'networkidle2'});

            let individualLinks = await page.$$eval('.gsc-thumbnail-inside>div>a', links => links.map(link=>link.href));
            let filteredCLLinks = individualLinks.filter(Boolean)  //filter out null links

            for(let link of filteredCLLinks){
                let deletedPost
                let name2;
                let price2;
                let newPrice;

                await page.goto(link, {waitUntil: 'networkidle2'});

                try {
                    deletedPost = await page.$eval('.removed', text => text.textContent);
                    // console.log("deletedPost:",deletedPost)
                }catch(err){
                    console.error(err.message);
                    deletedPost=""
                }

                if (!deletedPost){
                    try {
                        name2 = await page.$eval('#titletextonly', item => item.innerHTML || "");
                    } catch (err) {
                        console.error(err.message);
                    }

                    try {
                        price2 = await page.$eval('.price', item => item.innerHTML || "");
                        newPrice = parseInt(price2.replace(re,""));  //remove all non digits from price
                        // console.log("newPrice:",newPrice)
                    
                    } catch (err) {
                        console.error(err.message);
                    }
                    result.push({name: name2, price: newPrice, url: link})
                }
                // result.push({name: name2, price: price2, url: link})
            }
            await browser.close();
        }
        // result.push({price:'------------------------------------------------------------EBAY:--------------------------------------------------------------------------------'});
        // console.log("result2:",result)

        for(let link of ebayLinks){  //Loop thru each link to get individual data
            const browser = await puppeteer.launch(options);
            const page = await browser.newPage();
            await page.goto(link, {waitUntil: 'networkidle2'});

            const numberItems = await page.$eval('.srp-controls__count-heading > span:nth-child(1)', item => item.innerHTML || "");
            console.log("numberItems:",numberItems)
            const name = await page.$$eval('.s-item__title', items => items.map(item=>item.innerHTML));
            const price = await page.$$eval('.s-item__price', items => items.map(item=>item.innerHTML));
            const _url = await page.$$eval('.s-item__link', links => links.map(link=>link.href));
            // console.log("name:",name)
            // console.log("price:",price)
            // console.log("_url:",_url)

            let newPrice = convertPrice(price, re)  //remove all non digits from price

            // var result = [];
            for(var j=0; j<numberItems; j++){   //combine both arrays in array of objects
                result.push({
                    name: name[j], 
                    price: newPrice[j],
                    url: _url[j]
                });
            }
            await browser.close();
        }
        // result.push({price:'------------------------------------------------------------FACEBOOK:--------------------------------------------------------------------------------'});
        // console.log("result3:",result)

        for(let link of facebookLinks){  //Loop thru each link to get individual data
            const browser = await puppeteer.launch(options);
            const page = await browser.newPage();
            await page.goto(link, {waitUntil: 'networkidle2'});

            //login
            await page.click('#seo_banner > div.gh1tjcio.j83agx80 > div.o3lre8g0 > div > span > div > div > span > div > span > span');
            await page.waitForTimeout(4000);  
            await page.type('#email', `${process.env.FBEm}`);
            await page.type('#pass', `${process.env.FBPw}`);
            await page.click('#loginbutton');
            await page.waitForTimeout(6000);  

            const name = await page.$$eval('.a8nywdso.e5nlhep0.rz4wbd8a.linoseic > span > span', names => names.map(name=>name.innerHTML));
            const price = await page.$$eval('.hlyrhctz .d2edcug0.hpfvmrgz.qv66sw1b.c1et5uql.oi732d6d.ik7dh3pa.ht8s03o8.a8c37x1j.keod5gw0.nxhoafnm.aigsh9s9.d9wwppkn.fe6kdd0r.mau55g9w.c8b282yb.iv3no6db.a5q79mjw.g1cxx5fr.lrazzd5p.oo9gr5id', items => items.map(item=>item.innerHTML));
            const _url = await page.$$eval('.kbiprv82 > a', links => links.map(link=>link.href));
            // console.log("name:",name)
            // console.log("price:",price)
            // console.log("_url:",_url)

            let newPrice = convertPrice(price, re)  //remove all non digits from price

            for(var j=0; j<name.length; j++){   //combine both arrays in array of objects
                result.push({
                    name: name[j], 
                    price: newPrice[j],
                    url: _url[j]
                });
            }
            await browser.close();
        }
        // result.sort(function (a, b) {
        //     return a.price - b.price;
        // });
        console.log("result4:",result)
        writeToFiles(result)
    }

    catch(err){
        console.log(err)
    }
};

async function main(){   
    try{
        const data = await getPageData()
    }
    catch(err){
        console.log(err)
        return {}
    }
}

main();