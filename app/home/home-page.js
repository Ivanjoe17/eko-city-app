const app = require("tns-core-modules/application");
var dialogs = require("tns-core-modules/ui/dialogs");
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
const customDialog = require("nativescript-cfalert-dialog");
let cfalertDialogInstance = new customDialog.CFAlertDialog();
var Geolocation = require("nativescript-geolocation");
var LoadingIndicator = require("nativescript-loading-indicator-new").LoadingIndicator;
var loader = new LoadingIndicator();
var mapbox = require("nativescript-mapbox");
var context = imagepicker.create({ mode: "multiple" }); // use "multiple" for multiple selection
const prijaveCollection = firebaseApp.firestore().collection("prijave");
const korisniciCollection = firebaseApp.firestore().collection("korisnici");
var page;
let currentPictures = [];
let currentLocation=[];
let pageModel = new HomeViewModel();
var mapbox;
let opisText="";


var loadingOptions = {
    message: 'Slanje...',
    progress: 0.65,
    android: {
      indeterminate: true,
      cancelable: false,
      max: 100,
      progressNumberFormat: "%1d/%2d",
      progressPercentFormat: 0.53,
      progressStyle: 1,
      secondaryProgress: 1
    },
    /* ios: {
      details: "Additional detail note!",
      square: false,
      margin: 10,
      dimBackground: true,
      color: "#4B9ED6",
      mode: // see iOS specific options below
    } */
  }


function onNavigatingTo(args) {
    page = args.object;
    page.bindingContext = pageModel;
    currentPictures = [];
    var gotData=page.navigationContext;
    if(gotData){
        if(gotData.location){
            console.log(gotData.location);
            currentLocation=[gotData.location.lat,gotData.location.lng];
            console.log("currentLocation",currentLocation);
            pageModel.lokacijaDone=true;
            currentPictures=gotData.pictures;
            if(currentPictures.length>0){
                for(let i=0;i<currentPictures.length;i++){
                    addImage(currentPictures[i]);
                }
            }
        }
    }
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
    newImage.className = "picture addedPicture";
    newImage.stretch = "aspectFill";
    imageContainer.addChild(newImage);
}

function sendInfo() {
    let error=0;
    let txt="";
    if(currentPictures.length==0){
        error++;
        txt+="Nije priložena niti jedna slika."
    }
    if(currentLocation.length==0){
        error++;
        txt+="Nije priložena lokacija."
    }
    if(opisText.length==0){
        error++;
        txt+="Nije priložen opis."
    }
    if(error>0){
        openErrorAlert('Pogreška!',txt,'NEGATIVE');
        return;
    }
    loader.show(loadingOptions); 
    let imageNames = [];
    for (let i = 0; i < currentPictures.length; i++) {
        let imageName = generate_random_string(3) + Date.now();
        imageNames.push(imageName);
        uploadImage(currentPictures[i], imageName);
    }
    let reportInfo = {
        opis: opisText,
        lat:currentLocation[0],
        lng:currentLocation[1],
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
            resetPrijava();
            openErrorAlert('Poslano!','Prijava uspješno poslana.','POSITIVE');
            loader.hide();
        },
        function (error) {
            console.log("File upload error: " + error);
            resetPrijava();
            openErrorAlert('Poslano!','prijava uspješno poslana.','POSITIVE');
            loader.hide();
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
            console.log("Trouble in paradise: " + error);
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

function resetPage() {
    frameModule.topmost().navigate({
        moduleName: 'home/home-page',
        clearHistory: true
    });
}
function goToTakeLocation() {
    frameModule.topmost().navigate({
        moduleName: 'home/takeLocation',
        transition: {
            name: "slide",
            animated: true,
            duration: 300
        },
        context:{
            pictures:currentPictures
        },
        clearHistory:true
    });
}

function openImageAlert(){
    var options = {
        dialogStyle: customDialog.CFAlertStyle.ALERT,
        title: 'Dodaj slike',
        textAlignment: customDialog.CFAlertGravity.CENTER_HORIZONTAL,
        buttons: [
          {
            text: 'Kamera',
            buttonStyle: customDialog.CFAlertActionStyle.POSITIVE,
            buttonAlignment: customDialog.CFAlertActionAlignment.JUSTIFIED,
            onClick: function(response) {
              console.log('Inside OK Response');
              console.log(response); // Prints Okay
              openCamera();
            },
          },
          {
            text: 'Dodaj iz telefona',
            buttonStyle: customDialog.CFAlertActionStyle.DEFAULT,
            buttonAlignment: customDialog.CFAlertActionAlignment.JUSTIFIED,
            onClick: function(response) {
              console.log('Inside Nope Response');
              console.log(response); // Prints Nope
              selectImages();
            },
          },
        ],
      };
   
      cfalertDialogInstance.show(options); // That's about it ;)
}

function openLokacijaAlert(){
    var options = {
        dialogStyle: customDialog.CFAlertStyle.ALERT,
        title: 'Izaberi lokaciju',
        textAlignment: customDialog.CFAlertGravity.CENTER_HORIZONTAL,
        buttons: [
          {
            text: 'Moja trenutna lokacija',
            buttonStyle: customDialog.CFAlertActionStyle.POSITIVE,
            buttonAlignment: customDialog.CFAlertActionAlignment.JUSTIFIED,
            onClick: function(response) {
              console.log('Inside OK Response');
              console.log(response); // Prints Okay
              getCurrentPosition();
            },
          },
          {
            text: 'Odaberi na mapi',
            buttonStyle: customDialog.CFAlertActionStyle.DEFAULT,
            buttonAlignment: customDialog.CFAlertActionAlignment.JUSTIFIED,
            onClick: function(response) {
              console.log('Inside Nope Response');
              console.log(response); // Prints Nope
              goToTakeLocation();
            },
          },
        ],
      };
   
      cfalertDialogInstance.show(options); // That's about it ;)
}
function openErrorAlert(title,text,type){
    var options = {
        dialogStyle: customDialog.CFAlertStyle.ALERT,
        title: title,
        message:text,
        textAlignment: customDialog.CFAlertGravity.CENTER_HORIZONTAL,
        buttons: [
          {
            text: 'Ok',
            buttonStyle: customDialog.CFAlertActionStyle[type],
            buttonAlignment: customDialog.CFAlertActionAlignment.JUSTIFIED,
            onClick: function(response) {
              console.log('Inside OK Response');
              console.log(response); // Prints Okay
            //   getCurrentPosition();
            },
          }
        ],
      };
   
      cfalertDialogInstance.show(options); // That's about it ;)
}

function openOpis(){
    askForOpis(opisText);
}
function askForOpis(defaultText){
    // inputType property can be dialogs.inputType.password, dialogs.inputType.text, or dialogs.inputType.email.
    dialogs.prompt({
        title: "Opis",
        okButtonText: "Ok",
        defaultText:defaultText,
        inputType: dialogs.inputType.text
    }).then(function (r) {
        console.log("Dialog result: " + r.result + ", text: " + r.text);
        opisText=r.text;
        if(opisText.length>0){
            pageModel.opisDone=true;
        }
        console.log("pageModel",pageModel);
    });
}


 function getCurrentPosition(options) {
    var settings = Object.assign({
        'desiredAccuracy': 3,
        'updateDistance': 10,
        'maximumAge': 20000,
        'timeout': 20000
    }, options || {});

    var p = Promise.resolve() // Start promise chain with a resolved native Promise.
    .then(function() {
        if (!Geolocation.isEnabled()) {
            return Geolocation.enableLocationRequest(); // return a Promise
        } else {
            // No need to return anything here.
            // `undefined` will suffice at next step in the chain.
        }
    })
    .then(function() {
        if (Geolocation.isEnabled()) {
            return Geolocation.getCurrentLocation(settings); // return a Promise
        } else { // <<< necessary to handle case where Geolocation didn't enable.
            throw new Error('Geolocation could not be enabled');
        }
    })
    .then(function(loc) {
        if (loc) {
            console.log("Current location is: " + loc.latitude + ", " + loc.longitude);
            currentLocation=[loc.latitude,loc.longitude];
            console.log("currentLocation",currentLocation);
            pageModel.lokacijaDone=true;
            return loc;
        } else { // <<< necessary to handle case where loc was not derived.
            throw new Error('Geolocation enabled, but failed to derive current location');
        }
    })
    .catch(function(e) {
        console.error(e);
        throw e; // Rethrow the error otherwise it is considered caught and the promise chain will continue down its success path.
        // Alternatively, return a manually-coded default `loc` object.
    });

    // Now race `p` against a timeout in case enableLocationRequest() hangs.
    return Promise.race(p, new Promise(function(resolve, reject) {
        setTimeout(function() {
            reject(new Error('viewModel.getCurrentPosition() timed out'));
        }, settings.timeout);
    }));
}

function resetPrijava(){
    currentPictures=[];
    opisText="";
    currentLocation=[];
    pageModel.lokacijaDone=false;
    pageModel.opisDone=false;
    resetPage();
}
exports.openLokacijaAlert = openLokacijaAlert;
exports.onNavigatingTo = onNavigatingTo;
exports.onDrawerButtonTap = onDrawerButtonTap;
exports.sendInfo = sendInfo;
exports.openImageAlert = openImageAlert;
exports.openOpis = openOpis;
exports.resetPrijava = resetPrijava;