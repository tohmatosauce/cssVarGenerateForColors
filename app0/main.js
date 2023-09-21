function hexdec(a) {
    const arrA = a.match(/[0-9]+/gi);
    let newA = '';
    for (let i = 0; i < arrA.length; i++) {
        newA += parseInt(arrA[i]).toString(16);
    }
    return newA;
}

function replacetxt(data, reg, cssv, type, rooty, sort = false) {
    let list = [...data.matchAll(reg)],
        root = '';
    rooty += '/*' + type + ' variables */\r\n';
    for (let i = 0, pushed = 0; i < list.length; i++) {
        if (type == 'rgb') {
            let ws = list[i][0].match(/[0-9]+/g);
            ws.forEach(e => {
                e = e.replace(/^0+(?=0)/gi, "")
            });
            ws.join(', ')
        } else if (type == 'hex') {
            let dupl = '';
            if (list[i][0].length == 4) {
                dupl = cssv.indexOf(list[i][0] + list[i][0].substring(1));
            } else if (list[i][0].length == 7) {
                dupl = cssv.indexOf(list[i][0].substring(0, 4));
            }
            if (dupl > -1) {
                pushed++;
                let valdupl = cssv[dupl];
                cssv[dupl] = [valdupl, list[i][0]];
            }
        } else if (type == 'hsl') {
            pushed++;
            let hslArray = list[i][0].match(/[0-9]+/gi);
            let find = cssv[0][0] == undefined ? cssv[0].map(e => e.hsl).indexOf(list[i][0]) : -1;
            if (find == -1) {
                cssv[0].push({
                    hsl: list[i][0],
                    hue: hslArray[0],
                    sat: hslArray[1],
                    lig: hslArray[2]
                })
            }
            for (let j = 1; j < cssv.length; j++) {
                if (cssv[j].indexOf(hslArray[j - 1]) == -1) {
                    cssv[j].push(hslArray[j - 1]);
                }
            }
        }

        if ((pushed == 0) && (cssv.indexOf(list[i][0]) == -1)) {
            cssv.push(list[i][0]);
        }
    }
    if (sort == true) {
        if (type == "hsl") {
            cssv[0].sort(function(a, b) {
                if (hexdec(a.hsl) < hexdec(b.hsl)) {
                    return -1
                } else {
                    return 0
                }
            })
            for (let j = 1; j < cssv.length; j++) {
                cssv[j].sort(function(a, b) {
                    return a - b;
                })
            }
        } else if (type == "rgb") {
            cssv.sort(function(a, b) {
                if (hexdec(a) < hexdec(b)) {
                    return -1;
                } else {
                    return 0;
                }
            })
        } else {
            cssv.sort()
        }
    }
    let result = data;

    for (let i = 0; i < cssv.length; i++) {
        if (type == "hsl") {
            for (let j = 0; j < cssv[i].length; j++) {
                if (i == 0) {
                    root += '--hsl' + j + ': var(--hue' + cssv[0][j].hue + '), var(--sat' + cssv[0][j].sat + '), var(--lig' + cssv[0][j].lig + ');\r\n';
                    result = result.replaceAll(cssv[i][j].hsl, 'var(--' + type + j + ')');
                } else {
                    let t = i == 1 ? "hue" : i == 2 ? "sat" : i == 3 ? "lig" : '';
                    root += "--" + t + cssv[i][j] + ': ' + cssv[i][j];
                    if (i != 1) {
                        root += '%';
                    }
                    root += ';\r\n';
                }
            }
        } else if (typeof cssv[i] == 'string') {
            root += '--' + type + i + ': ' + cssv[i] + ';\r\n';
            result = result.replaceAll(cssv[i], 'var(--' + type + i + ')');
        } else {
            cssv[i].sort().reverse();
            root += '--' + type + i + ': ' + cssv[i][0] + ';\r\n';
            for (let j = 0; j < cssv[i].length; j++) {
                result = result.replaceAll(cssv[i][j], 'var(--' + type + i + ')');
            }
        }
    }

    if (sort == false) {
        let rootArr = root.trim().split(';\r\n');
        rootArr[rootArr.length - 1] = rootArr[rootArr.length - 1].slice(0, -1);
        rootArr.sort(function(a, b) {
            let aNum = a.split(': '),
                bNum = b.split(': ');
            aNum[0] = aNum[0].substring(2, 5);
            bNum[0] = bNum[0].substring(2, 5);
            if (type == 'rgb') {
                if (hexdec(aNum[1]) < hexdec(bNum[1])) {
                    return -1;
                } else {
                    return 0;
                }
            } else if (type == 'hex') {
                if (aNum[1] < bNum[1]) {
                    return -1
                } else {
                    return 0;
                }
            } else if (type == 'hsl' && aNum[0] == bNum[0]) {
                if (hexdec(aNum[1]) > hexdec(bNum[1])) {
                    return -1;
                } else {
                    return 0;
                }
            } else {
                return 0;
            }

        });
        rooty += rootArr.join(';\r\n') + ';\r\n';
    } else {
        rooty += root;
    }

    rooty += '\r\n';
    return {
        result,
        rooty
    };
}

async function getcss(url, sort) {
    fetch(url)
        .then((response) => {
            return response.text();
        })
        .then((data) => {
            const css0 = data;
            let css1 = css0;

            // regexr dot com is a life saver
            let rgb = /(?<=(rgba|rgb)\()(.*?),(.*?),(.*?)(?=(,|\)))/gi,
                hex = /#([0-9]|[a-f]){3,8}(?!.*(\n\s+{|\n\t+{|\n.{|\n{|{))/gi,
                hsl = /(?<=(hsl|hsla)\(\s*?)([0-9]*)(,|\s*|,\s*)([0-9]*)%(,|\s*|,\s*)([0-9]*)%(?=(,| |\)|\/))/gi,
                cssv = {
                    rgb: [],
                    hex: [],
                    hsl: [
                        [],
                        [],
                        [],
                        []
                    ]
                },
                rooty = '';
            css1 = replacetxt(css0, rgb, cssv.rgb, 'rgb', rooty, sort);
            css1 = replacetxt(css1.result, hex, cssv.hex, 'hex', css1.rooty, sort);
            css1 = replacetxt(css1.result, hsl, cssv.hsl, 'hsl', css1.rooty, sort);

            document.getElementById('css1').value = css1.result;
            document.getElementById('css2').value = css1.rooty;

        })
}
async function loadcss(url) {
    fetch(url)
        .then((response) => {
            return response.text();
        })
        .then((data) => {
            const css0 = data;
            document.getElementById('css1').value = css0;
        })
}

let valid = 0;

function cryingtm() {
    let url = document.getElementById("link").value,
        sort = document.getElementById("sort").checked,
        val = document.getElementById("ovver").checked;

    if (!val && (url == null || !url.match(/\.(css|html)$/gim))) {
        if (valid > 0) {
            document.getElementById('css1').value = '';
        }
        valid++;
        document.getElementById('css1').value += " > “ " + url + " ” " + " is not a valid stylesheet. (Valid extensions: *.css, *.html)\r\n";
        log();
        valid = 0;
    } else {
        getcss(url, sort, true);
        valid++;
    }
}


function cryingtmpointoh() {
    let url = document.getElementById("link").value,
        val = document.getElementById("ovver").checked;;
    if (!val && (url == null || !url.match(/\.(css|html)$/gim))) {
        if (valid > 0) {
            document.getElementById('css1').value = '';
        }
        valid++;
        document.getElementById('css1').value += " > “ " + url + " ” " + " is not a valid stylesheet. (Valid extensions: *.css, *.html)\r\n";
        log();
        valid = 0;
    } else {
        loadcss(url);
        valid++;
    }
}


function log() {
    document.getElementById('css2').value =
        ` > I'm a Utility Script made to generate CSS color variables from your stylesheets 🌸
> I support HEX, RGB, and HSL.
> ${valid>0 ? "oh noes bad link w(ﾟДﾟ)w" : "Click “Stylesheet with CSS Variables” to try me out~"}

---------------
Update ver. log
---------------

- v1.0.0, 08/09/23: Poor decisions were made. Sleep was sacrificed.
- v1.0.1: Added a load button for easier comparison between original file and changed file.
- v1.1: Made changes to sorting logic and UI.
- v1.2, 12/09/23: Added HSL.`;
}
// window.onload = () => log();

// const http = require('http');
 
// const hostname = '127.0.0.1';
// const port = 3000;
 
// const server = http.createServer((req, res) => {
//   res.statusCode = 200;
//   res.setHeader('Content-Type', 'text/plain');
//   res.end('Hello World');
// });
 
// server.listen(port, hostname, () => {
//   console.log(`Server running at https://${hostname}:${port}/`);
// });