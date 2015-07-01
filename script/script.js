var rootUrl = 'http://example.net/'; 

var accessData = ['login', 'pass'];

// saving actual url
var current_url = false;
var fs = require('fs');

var page = require("webpage").create();
var links = read();
// if links not exist, close programm
if(!links.length) {
    close();
}

page.viewportSize = { width:1224, height:768 };
/**
 * start working
 */
page.open(rootUrl)
    .then(function(status){        
        if(status == "success") {            
            console.log('Page loaded');
            auth();
        } else {
            console.log("Sorry, the page is not loaded");
            close();
        }        
    })

/**
 * callback for exception in webpage
 * @param {string} message error
 * @param {type} stack
 */
page.onError = function(message, stack) {
    if(message.match(/ExceptionSlimerJS/i)) {
        console.log(message);
        close();
    }
    
};

/**
 * callback for loaded new page
 * @param {string} targetUrl new url
 * @returns {undefined}
 */
page.onUrlChanged = function(targetUrl) {    
    console.log('New URL: ' + targetUrl);
    current_url = targetUrl;
};

/**
 * callback for message from webpage
 * @param {string} message 
 * @param {type} line
 * @param {type} file
 */
page.onConsoleMessage = function(message, line, file) {
    console.log(message);
};

/**
 * auth user if it`s needed
 * @returns {undefined}
 */
function auth() {
    var isNotAuth = page.evaluate(function() {
        // check auth user
        var isNotAuth = document.getElementsByClassName('user-name-left').length;
        if(isNotAuth) {
            var button = document.querySelector('.sso__header__top ul li:first-child > a');
            if(!button) {
                console.log('Button Auth not found');
                return false;
            }
            button.click();
            return true;
        } else {
            // пользователь уже авторизован
            console.log('User already auth');
            return false;
        }
    });
    // if user in not auth
    if(isNotAuth) {
        insertText('dropdown_login_user_email', accessData[0]);
        insertText('dropdown_login_user_password', accessData[1]);
        slimer.wait(1000);
        page.evaluate(function() {
            // click submiton button
            document.getElementById('dropdown_login_form_sign_in').click();
        });
    }    
}
/**
 * function for controll program
 * @param {string} url current url
 */
function fabric(url) {
    console.log('url '+url);    
    try {
        if(!url) {
            return false;
        }
        // main page, after auth
        if(url.match(/dashboard\/metrics/i)) {
            openSiteExplorer();
            return true;
        }

        // page with statistics
        if(url.match(/site-explorer\/overview\/exact\?target/i)) {
            console.log('openLinksPage');
            openLinksPage();
            return true;
        } 

        // page with button export links
        if(url.match(/site-explorer\/backlinks\/external\/exact\/all/i)) {
            console.log('exportLinks');
            exportLinks();
            return true;
        }  

        // page with input field for url
        if(url.match(/site-explorer/i)) {
            runSiteExplorer();
            return true;
        }
        
        // page with input field for url
        if(url.match(/getLink/i)) {
            getLink();
            return true;
        }
        
    } catch(e) {
        console.log(e.message);
        close();
    }
}

function openSiteExplorer() {
    page.evaluate(function() {
        var countNotify = parseInt(document.getElementById('total_top_notifications').innerHTML, 10);
        if(countNotify) {
            throw 'ExceptionSlimerJS! Yoo should remove all notification';
        }
        document.querySelector('ul.sso__header__menu li:first-child > a').click();
    });
}

function openLinksPage() {    
    page.evaluate(function() {
        document.getElementById('external').click();
    });
}

var alreadyRun = false;
/**
 * create csv file for click on button
 */
function exportLinks() {
    if(alreadyRun) {
        return true;
    }
    alreadyRun = true;
    // click on button, it`s event for open pop-up
    page.evaluate(function() {
        document.getElementById('export_button').click();        
    });    
    slimer.wait(2000);
    // click for button, it`s trigger for creating .csv file
    page.evaluate(function() {
        document.getElementById('start_background_export').click();       
    });
    slimer.wait(3000);    
    // begin find new link
    getLink();
}

var linkExist = false;
/**
 * find new link on file in the page
 */
function getLink() {
    if(linkExist) {
       return false; 
    }
    linkExist = true;
    current_url = 'getLink';
    var toCsv = page.evaluate(function() {
        var timeCreated = document.querySelector('#top_notifications_files li div cite').innerHTML;
        if(!timeCreated) {
            console.log('The document for download not found');
            return false;
        }
        if(!timeCreated.match(/1 minute/i)) {
            console.log('The new document for download not found');
            return false;
        }
        
        var href = document.querySelector('#top_notifications_files li a').href;
        return href;
    }); 
    
    if(!toCsv) {
        linkExist = false;
        return false;
    }
    
    console.log('CVS_LINK '+toCsv);
    openSiteExplorer();
}

function runSiteExplorer() {
    var link = links.shift(); 
    if(!link) {
        console.log('Link ending');
        close();
    }
    // insert link to input field
    insertText('site_explorer_q', link);
    page.evaluate(function() {
        document.querySelector('.se-main-group > button').click();
        document.querySelector('.se-main-group > ul li:first-child > a').click();
    });
}

/**
 * insert text in input field
 * @param {string} inputId id input field
 * @param {sring} text will fill input field
 */
function insertText(inputId, text) {
    page.evaluate(function(inputId) {
        document.getElementById(inputId).focus();
    }, inputId);
    page.sendEvent('keypress', text);
}

/**
 * read data from files
 * @returns {Boolean|read.links}
 */
function read() {   
    var content = fs.read('\link.txt');
    var links = content.split("\n");
    if(!content || !links.length) {
        console.log('Links not found');
        return false;
    }
    return links;    
}

/**
 * close page
 */
function close() {
    page.close();
    phantom.exit();
}
/**
 * run loop 
 */
setInterval(function() {
    fabric(current_url);
}, 10000);


