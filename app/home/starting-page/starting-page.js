var observableModule = require("tns-core-modules/data/observable");
const app = require("tns-core-modules/application");
var applicationSettings = require("application-settings");
var pageData = observableModule.fromObject({});
const frameModule = require("tns-core-modules/ui/frame");
var isLoggedIn = false;
var firebase = require("nativescript-plugin-firebase");

firebase.init({
    persist: true,
    // Optionally pass in properties for database, authentication and cloud messaging,
    // see their respective docs.
    onAuthStateChanged: function (data) { // optional but useful to immediately re-logon the user when he re-visits your app
        console.log(data.loggedIn ? "Logged in to firebase" : "Logged out from firebase");
        if (data.loggedIn) {
            console.log("user's email address: " + (data.user.email ? data.user.email : "N/A"));
            isLoggedIn = true;
        }
        else {
            isLoggedIn = false;
            console.log("user not logged in");
        }
    }
}).then(
    function () {
        console.log("firebase.init done");
    },
    function (error) {
        console.log("firebase.init error: " + error);
    }
);

//reseting app to new install
// applicationSettings.remove("currentDateInfo");
// applicationSettings.remove("dateHistory");
// applicationSettings.remove("firstTime");

let page;

function onLoaded(args) {
    setTimeout(function () {
        navigateApp();
    }, 800);
    page = args.object;
    page.actionBarHidden = true;
    page.bindingContext = pageData;
}

function navigateApp() {

    if (!isLoggedIn) {
        goToLogin();
    }
    else {
        goToHome();
    }
}

function goToLogin() {
    frameModule.topmost().navigate({
        moduleName: 'login/login',
        transition: {
            name: "slide",
            animated: true,
            duration: 300
        },
        clearHistory: true
    });
}

function goToHome() {
    frameModule.topmost().navigate({
        moduleName: "home/home-page",
        transition: {
            name: "slide",
            animated: true,
            duration: 200
        },
        clearHistory: true
    });
}
exports.onLoaded = onLoaded;
