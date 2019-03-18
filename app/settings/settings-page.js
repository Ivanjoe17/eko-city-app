const app = require("tns-core-modules/application");
const frameModule = require("tns-core-modules/ui/frame");
const SettingsViewModel = require("./settings-view-model");
var firebase = require("nativescript-plugin-firebase");

function onNavigatingTo(args) {
    const page = args.object;
    page.bindingContext = new SettingsViewModel();
}

function onDrawerButtonTap(args) {
    const sideDrawer = app.getRootView();
    sideDrawer.showDrawer();
}

function logout() {
    firebase.logout();
    goToLogin();
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

exports.onNavigatingTo = onNavigatingTo;
exports.onDrawerButtonTap = onDrawerButtonTap;
exports.logout = logout;
