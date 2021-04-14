var arcoe3DText = (function ($scope, $element, $attrs, $timeout, localRenderer) {
    var dpr;
    var bsr;
    var pageData;
    const PIXELS_PER_METER = 3779.5275591;     //Adjustment Value for HL

    var PIXEL_RATIO = (function () {
        var ctx = document.createElement("canvas").getContext("2d");
        dpr = window.devicePixelRatio || 1;
        bsr = ctx.webkitBackingStorePixelRatio ||
            ctx.mozBackingStorePixelRatio ||
            ctx.msBackingStorePixelRatio ||
            ctx.oBackingStorePixelRatio ||
            ctx.backingStorePixelRatio || 1;
        return dpr / bsr;
    })();

    createHiDPICanvas = function (w, h) {
        ratio = PIXEL_RATIO;
        var can = document.createElement("canvas");
        //Convert width to Pixels.  Studio based in Meters
        can.width = (w * PIXELS_PER_METER) * window.devicePixelRatio;
        can.height = (h * PIXELS_PER_METER) * window.devicePixelRatio;
        return can;
    }

    $scope.parameterValidation = function (pd) {
        // Edit Checks & Defaults
        if ((pd.betweenParagraphs < 0 || pd.betweenParagraphs > 1.0) || pd.betweenParagraphs == undefined) {
            pd.betweenParagraphs = 0; //Default 
            console.log("Space between Paragraphs ('betweenParagraphs') should be between 0 & 1.  Defaulted to 0");
        }

        if (!pd.hasOwnProperty("imageScale")){
            pd["imageScale"] = 0.7      //Defaul Scale
        }

        if (!pd.hasOwnProperty("imgAlignV")){
            pd["imgAlignV"] = "center"      //Defaul Vertical Alignment
        }

        if (!pd.hasOwnProperty("imgAlignH")){
            pd["imgAlignH"] = "center"      //Defaul Horizontal Alignment
        }

        if (!pd.hasOwnProperty("paragraphSplit")){
            pd["paragraphSplit"] = "\n"
        }


        return pd;
    }

    $scope.doText = function (pd) {
        pageData = $scope.parameterValidation(pd)
        var imageBackground = new Image();
        var canvas = createHiDPICanvas(pageData.widthMeters, pageData.heightMeters)
        var ctx = canvas.getContext("2d");
        var cw = canvas.width;
        var ch = canvas.height;
        setupCanvasGraphics(ctx, cw, ch, pageData);
        setupBackgroundImage(ctx, imageBackground, cw, ch, pageData.imageSrc, pageData.imgAlignH, pageData.imgAlignV, pageData.imageScale);

        //Start of Text Work    
        var f = pageData.fontSize;
        var fntSize = f + "px";  //Ensure Font accounts for pixel adjustment
        ctx.textAlign = pageData.textAlign;
        ctx.fillStyle = rgb2hex(pageData.FontColor);
        ctx.font = fntSize + ' ' + pageData.canvasFont;
        //if center align this needs to change
        wtx = pageData.textStartX;  //X Coord of Text Start
        wty = pageData.textStartY;  //Y Coord of Text Start
        wtmw = (cw - pageData.textRightMargin);  //Max Width
        wtlh = parseInt(f * parseFloat(pageData.lineheightratio));
        if (pageData.debug) {
            //For Fun, Learning & Debugging
            var dmsg = "Max Width = " + wtmw + "\n";
            dmsg = "Pixel Ratio = " + PIXEL_RATIO + "\n" + dmsg;
            dmsg = "Canvas W & H = " + cw + " / " + ch + "\n" + dmsg;
            dmsg = "Canvas Style W & H = " + canvas.style.width + " / " + canvas.style.height + "\n" + dmsg;
            dmsg = "Font Size = " + ctx.font + "\n" + dmsg;
            dmsg = "Line Height = " + wtlh + "\n" + dmsg;
            console.log("Debug: " + dmsg);
        }
        //For Normal Processing.
        var paragraph = pageData.message;
        var sentences = paragraph.split(pageData.paragraphSplit);
        sentences.forEach(function (sentence) {
            wty = wrapText(ctx, sentence, wtx, wty, wtmw, wtlh);
            wty = wty + (wtlh + (wtlh * pageData.betweenParagraphs));
        })
        $timeout(function () { $scope.view.wdg[pageData.imageWidget][pageData.widgetsrc] = canvas.toDataURL(); }, 250);
        $timeout(function () { localRenderer.setTexture(pageData.imageWidget, canvas.toDataURL()); }, 250);
    }

    function setupBackgroundImage(ctx, ib, cw, ch, imgsrc, iah, iav, is) {
        ib.src = imgsrc;
        ib.onload = function () {
            //is = Image Scale
            var ImageScale = (Math.min(cw / ib.width, ch / ib.height) * is);
            var cpx = 0;    //Canvas Point X
            var cpy = 0;    //Canvas Point Y

            if (iah.toUpperCase() === "LEFTLEFT"){cpx = cw * .125;}
            if (iah.toUpperCase() === "LEFT"){cpx = cw * .25;}
            if (iah.toUpperCase() === "CENTER"){cpx = cw * .5;}
            if (iah.toUpperCase() === "RIGHT"){cpx = cw * .75;}
            if (iah.toUpperCase() === "RIGHTRIGHT"){cpx = cw * .875;}

            if (iav.toUpperCase() === "TOPTOP"){cpy = ch * .125;}
            if (iav.toUpperCase() === "TOP"){cpy = ch * .25;}
            if (iav.toUpperCase() === "CENTER"){cpy = ch * .5;}
            if (iav.toUpperCase() === "BOTTOM"){cpy = ch * .75;}
            if (iav.toUpperCase() === "BOTTOMBOTTOM"){cpy = ch * .875;}                        

            xpos = cpx - ((ib.width * ImageScale) / 2);
            ypos = cpy - ((ib.height * ImageScale) / 2);

            iwdh = (ib.width * ImageScale);
            ihgt = (ib.height * ImageScale);
            ctx.drawImage(ib, xpos, ypos, iwdh, ihgt);
        }
    }

    function setupCanvasGraphics(ctx, cw, ch, pageData) {
        //Use this to create custom HTML Canvas graphics
        //This can also be used to present a backgroun & Border on 
        //the canvas to provide a sense of size / position
        if (pageData.debug) {
            //The code below will add a background and Border
            ctx.fillStyle = pageData.backingcolor;
            ctx.fillRect(0, 0, cw, ch);
            //Border Code -- If needed
            ctx.strokeStyle = "black";
            ctx.lineWidth = 5;
            ctx.strokeRect(0, 0, cw, ch);
        }
    }

    function wrapText(context, text, x, y, maxWidth, lineHeight) {
        var words = text.split(' '),
            line = '',
            lineCount = 0,
            i,
            test,
            metrics;

        for (i = 0; i < words.length; i++) {
            test = words[i];
            metrics = context.measureText(test);
            while (metrics.width > maxWidth) {
                // Determine how much of the word will fit
                test = test.substring(0, test.length - 1);
                metrics = context.measureText(test);
            }
            if (words[i] != test) {
                words.splice(i + 1, 0, words[i].substr(test.length))
                words[i] = test;
            }
            test = line + words[i] + ' ';
            metrics = context.measureText(test);
            var fwdmetrics = 0;
            if (i < (words.length - 1)) {
                fwdtest = test + words[i + 1] + " ";
                fwdmetrics = context.measureText(fwdtest);
            }
            if ((metrics.width > maxWidth || fwdmetrics.width > maxWidth) && (i > 0)) {
                context.fillText(line, x, y);
                line = words[i] + ' ';
                y += lineHeight;
                lineCount++;
            } else {
                line = test;
            }
        }
        context.fillText(line, x, y);
        return y;
    }

    // Preview can only use HEX in cavas so we convert here to get same results
    function rgb2hex(rgb) {
        rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
        return (rgb && rgb.length === 4) ? "#" +
            ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
            ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
            ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
    }



});