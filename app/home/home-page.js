const app = require("tns-core-modules/application");
const camera = require("nativescript-camera");
const imageModule = require("tns-core-modules/ui/image");
const view = require("ui/core/view");
const HomeViewModel = require("./home-view-model");
const firebase = require("nativescript-plugin-firebase");
const firebaseApp = require("nativescript-plugin-firebase/app");
const Image = require("tns-core-modules/ui/image").Image;
const imagepicker = require("nativescript-imagepicker");
const bghttp = require("nativescript-background-http");
const session = bghttp.session("file-upload");
const frameModule = require("tns-core-modules/ui/frame");
var mapbox = require("nativescript-mapbox");
var context = imagepicker.create({ mode: "multiple" }); // use "multiple" for multiple selection
const prijaveCollection = firebaseApp.firestore().collection("prijave");
const korisniciCollection = firebaseApp.firestore().collection("korisnici");
var page;
let currentPictures = [];
let pageModel = new HomeViewModel();
var mapbox;

function onMapReady(args) {
    mapbox = args.map;
    // you can tap into the native MapView objects (MGLMapView for iOS and com.mapbox.mapboxsdk.maps.MapView for Android)
    var nativeMapView = args.ios ? args.ios : args.android;
    console.log("Mapbox onMapReady for " + (args.ios ? "iOS" : "Android") + ", native object received: " + nativeMapView);

    mapbox.setViewport({
        bounds: {
            north: 44.4666,
            east: 13.1496,
            south: 45.4666,
            west: 14.2500
        },
        animated: true
    });
    mapbox.setZoomLevel({
        level: 12, // mandatory, 0-20
        animated: true // default true
    })
    mapbox.setOnMapLongClickListener((point) => {
        console.log("Map longpressed at latitude: " + point.lat + ", longitude: " + point.lng);
        mapbox.removeMarkers();
        mapbox.addMarkers([{
            lat: point.lat,
            lng: point.lng,
            title: 'Lokacija',
            selected: true, // makes the callout show immediately when the marker is added (note: only 1 marker can be selected at a time)
            onCalloutTap: function () { console.log("Odabrana lokacija za prijavu"); }
        }]);

    });
}

exports.onMapReady = onMapReady;

function onNavigatingTo(args) {
    page = args.object;
    page.bindingContext = pageModel;
    currentPictures = [];
    // openCamera();
}

function onDrawerButtonTap(args) {
    const sideDrawer = app.getRootView();
    sideDrawer.showDrawer();
}

function openCamera() {
    var options = { width: 100, height: 100 };
    camera.requestPermissions().then(
        function success() {
            // permission request accepted or already granted 
            // ... call camera.takePicture here ...
            camera.takePicture(options)
                .then(function (imageAsset) {
                    console.log("Result is an image asset instance");
                    var image = new imageModule.Image();
                    image.src = imageAsset;
                    addImage(imageAsset);
                    currentPictures.push(imageAsset.android);
                }).catch(function (err) {
                    console.log("Error -> " + err.message);
                });
        },
        function failure() {
            // permission request rejected
            // ... tell the user ...
        }
    );
}

function addImage(imageAsset) {
    var imageContainer = view.getViewById(page, "imageContainer");
    const newImage = new Image();
    newImage.src = imageAsset;
    newImage.height = 100;
    newImage.width = 100;
    newImage.className = "picture";
    newImage.stretch = "aspectFill";
    imageContainer.addChild(newImage);
}

function sendInfo() {
    var textfield = view.getViewById(page, "naziv");
    let imageNames = [];
    for (let i = 0; i < currentPictures.length; i++) {
        let imageName = generate_random_string(3) + Date.now();
        imageNames.push(imageName);
        uploadImage(currentPictures[i], imageName);
    }
    let reportInfo = {
        naziv: textfield.text,
        slike: imageNames,
    }
    getCurrentUserEmail(reportInfo);

}

function uploadImage(imagePath, imageName) {
    // now upload the file with either of the options below:
    firebase.storage.uploadFile({
        // optional, can be omitted since 6.5.0, and also be passed during init() as 'storageBucket' param so we can cache it (find it in the Firebase console)
        bucket: 'gs://eko-city.appspot.com',
        // the full path of the file in your Firebase storage (folders will be created)
        remoteFullPath: 'uploads/images/' + imageName,
        // option 1: a file-system module File object
        // localFile: fs.File.fromPath(logoPath),
        // option 2: a full file path (ignored if 'localFile' is set)
        localFullPath: imagePath,
        // get notified of file upload progress
        onProgress: function (status) {
            console.log("Uploaded fraction: " + status.fractionCompleted);
            console.log("Percentage complete: " + status.percentageCompleted);
        }
    }).then(
        function (uploadedFile) {
            console.log("File uploaded: " + JSON.stringify(uploadedFile));
        },
        function (error) {
            console.log("File upload error: " + error);
        }
    );
}

function insertReportData(reportInfo) {
    console.log('TCL: insertReportData -> reportInfo', reportInfo)
    prijaveCollection.add(reportInfo).then(documentRef => {
        console.log(`San Francisco added with auto-generated ID: ${documentRef.id}`);
    });
}

function generate_random_string(string_length) {
    let random_string = '';
    let random_ascii;
    for (let i = 0; i < string_length; i++) {
        random_ascii = Math.floor((Math.random() * 25) + 97);
        random_string += String.fromCharCode(random_ascii)
    }
    return random_string
}

function selectImages() {
    context
        .authorize()
        .then(function () {
            return context.present();
        })
        .then(function (selection) {
            selection.forEach(function (selected) {
                console.log('TCL: selectImages -> selected', selected)
                // process the selected image
                addImage(selected);
                currentPictures.push(selected.android);
            });
        }).catch(function (e) {
            // process error
        });
}

function getCityId(reportInfo) {
    let defaultId = "0";
    const query = korisniciCollection
        .where("email", "==", reportInfo.id_korisnika)

    query
        .get()
        .then(querySnapshot => {
            querySnapshot.forEach(doc => {
                defaultId = doc.data().id_grada;
            });
            reportInfo.id_grada = defaultId;
            insertReportData(reportInfo);
        });
}

function getCurrentUserEmail(reportInfo) {
    firebase.getCurrentUser()
        .then(function (user) {
            console.log("User uid: " + user.uid);
            console.log("User email: " + user.email)
            reportInfo.id_korisnika = user.email;
            getCityId(reportInfo);
        })
        .catch(function (error) {
            console.log("Trouble in paradise: " + error)
            firebase.logout();
            goToLogin();
        });
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
exports.openCamera = openCamera;
exports.sendInfo = sendInfo;
exports.selectImages = selectImages;
