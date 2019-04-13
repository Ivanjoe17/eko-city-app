const app = require("tns-core-modules/application");
const view = require("ui/core/view");
const frameModule = require("tns-core-modules/ui/frame");
var mapbox = require("nativescript-mapbox");
var page;
var ObservableModule = require("data/observable");
var pageModel = ObservableModule.fromObject({
    showSpremiBtn: "false",
});
var mapbox;

var currentLocation;

function onNavigatingTo(args) {
    page = args.object;
    pageModel.showSpremiBtn=false;
    page.bindingContext = pageModel;
    page.actionBarHidden = true;
}

function onDrawerButtonTap(args) {
    const sideDrawer = app.getRootView();
    sideDrawer.showDrawer();
}

function showSpremiBtn(visibility){
    console.log(visibility);
    pageModel.set("showSpremiBtn",visibility);
}

function onMapReady(args) {
    mapbox = args.map;
    // you can tap into the native MapView objects (MGLMapView for iOS and com.mapbox.mapboxsdk.maps.MapView for Android)
    var nativeMapView = args.ios ? args.ios : args.android;
    console.log("Mapbox onMapReady for " + (args.ios ? "iOS" : "Android") + ", native object received: " + nativeMapView);
    setTimeout(function(){
        mapbox.setViewport({
            bounds: {
                north: 44.4666,
                east: 13.1496,
                south: 45.4666,
                west: 14.2500
            },
            animated: true
        });
    },100)
   
    mapbox.setZoomLevel({
        level: 5, // mandatory, 0-20
        animated: true // default true
    })
    mapbox.setOnMapClickListener((point) => {
        console.log("Map longpressed at latitude: " + point.lat + ", longitude: " + point.lng);
        currentLocation=point;
        mapbox.removeMarkers();
        mapbox.addMarkers([{
            lat: point.lat,
            lng: point.lng,
            title: 'Lokacija onečišćenja',
            selected: true, // makes the callout show immediately when the marker is added (note: only 1 marker can be selected at a time)
            onCalloutTap: function () { console.log("Odabrana lokacija za prijavu"); }
        }]);
        showSpremiBtn(true);
    });
}

function goBackToPrijava() {
    frameModule.topmost().navigate({
        moduleName: 'home/home-page',
        transition: {
            name: "slide",
            animated: true,
            duration: 300
        },
        context:{
            location:currentLocation
        }
    });
}


exports.onMapReady = onMapReady;
exports.onNavigatingTo = onNavigatingTo;
exports.onDrawerButtonTap = onDrawerButtonTap;
exports.goBackToPrijava = goBackToPrijava;