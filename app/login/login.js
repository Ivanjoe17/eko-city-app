var dialogs = require("tns-core-modules/ui/dialogs");
var frameModule = require("tns-core-modules/ui/frame");
var observableModule = require("tns-core-modules/data/observable");
const view = require("ui/core/view");
const firebase = require("nativescript-plugin-firebase");
const firebaseApp = require("nativescript-plugin-firebase/app");
const korisniciCollection = firebaseApp.firestore().collection("korisnici");
const gradoviCollection = firebaseApp.firestore().collection("gradovi");
var observable = require("data/observable");
var observableArray = require("data/observable-array");
var ValueList = require("nativescript-drop-down").ValueList;
console.log('TCL: ValueList', ValueList)
var pageData = new observableModule.fromObject({
    email: "",
    password: "",
    isLoading: false,
    isLoggingIn: true,
});
var page, email;
var executingSomething = false;
var isLoading = false,
    isLoggingIn = true;
let itemSource;
let selectedIndex = 0;

function loadDropdownItems() {
    let items = [];
    gradoviCollection.get().then(querySnapshot => {
        querySnapshot.forEach(doc => {
            let display = doc.data().naziv;
            console.log('TCL: loadDropdownItems -> display', display)
            let value = doc.id;
            console.log('TCL: loadDropdownItems -> value', value)
            items.push({ value: value, display: display });
        });
        itemSource = new ValueList(items);
        console.log('TCL: loadDropdownItems -> itemSource', items)
        pageData.set("items", itemSource);

        //postavljanje na prvi item iz baze
        pageData.set("selectedIndex", selectedIndex);
    });

}
exports.loaded = function (args) {
    page = args.object;
    page.bindingContext = pageData;
    loadDropdownItems();
};
exports.toggleDisplay = function () {
    isLoggingIn = !isLoggingIn;
    pageData.set('isLoggingIn', isLoggingIn);
};
exports.submit = function () {
    if (isLoggingIn) {
        toggleLoading();
        login();
    }
    else {
        toggleLoading();
        signUp();
    }
};

function login() {
    firebase.login({
            type: firebase.LoginType.PASSWORD,
            passwordOptions: {
                email: pageData.get("email"),
                password: pageData.get("password")
            }
        })
        .then(function (result) {
            JSON.stringify(result);
            goToHome();
        })
        .catch(function (error) {
            dialogs.alert({
                title: "Login Failed",
                message: "Wrong email or password, try again.",
                okButtonText: "OK, got it"
            })
            console.log(error)
            toggleLoading();
        });
};

function signUp() {
    firebase.createUser({
        email: pageData.get("email"),
        password: pageData.get("password")
    }).then(
        function (user) {
            dialogs.alert({
                title: "User created",
                message: "email: " + user.email,
                okButtonText: "Nice!"
            })
            korisniciCollection.add({ id_grada: itemSource.getValue(selectedIndex), email: pageData.get("email") }).then(documentRef => {
                console.log(`added: ${documentRef.id}`);
            });
        },
        function (errorMessage) {
            dialogs.alert({
                title: "No user created",
                message: errorMessage,
                okButtonText: "OK, got it"
            })
            toggleLoading();
        }
    );
};

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

function onNavigatedTo(args) {
    const page = args.object;
    page.bindingContext = page.navigationContext;
}

function toggleLoading() {
    isLoading = !isLoading;
    pageData.set("isLoading", isLoading);
}

function dropDownOpened(args) {
    console.log("Drop Down opened");
}

function dropDownClosed(args) {
    console.log("Drop Down closed");
}

function dropDownSelectedIndexChanged(args) {
    console.log(`Drop Down selected index changed from ${args.oldIndex} to ${args.newIndex}`);
    selectedIndex = args.newIndex;
}

exports.dropDownOpened = dropDownOpened;
exports.dropDownClosed = dropDownClosed;
exports.dropDownSelectedIndexChanged = dropDownSelectedIndexChanged;
