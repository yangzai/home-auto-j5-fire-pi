// firebase setup
var firebase = require('firebase');
const FIREBASE_TIMESTAMP = firebase.database.ServerValue.TIMESTAMP;
firebase.initializeApp({
    serviceAccount: 'service-account-credentials.json',
    databaseURL: 'https://cloud-team5.firebaseio.com',
});
var db = firebase.database();

var isConnectedRef = db.ref('isConnected');
isConnectedRef.onDisconnect().set(false);

var connectedRef = db.ref('.info/connected');
connectedRef.on('value', snap => {
    if (!snap.val()) return;

    isConnectedRef.set(true);
});

var adcRef = db.ref('adc');

var ledRef = db.ref('led');
var toggleLedRef = ledRef.once.bind(ledRef, 'value', snap => ledRef.set(!snap.val()));


// board setup
const ADC_I2C_ADDR = 0x48;
const TEMP_ADC_CTRL = 2;
const LED_PIN = 'GPIO26'; //pin 37
const BUTTON_PIN = 'GPIO19'; //pin 35
var raspi = require('raspi-io');
var five = require('johnny-five');
var board = new five.Board({
    io: new raspi()
});

// board ready
board.on('ready', function() {
    var init = true;
    var led = new five.Led(LED_PIN);
    ledRef.on('value', snap => {
        if (init) { //workaround for init off state issue
            led.on();
            init = false;
        }

        snap.val() ? led.on() : led.off();
    });

    var button = new five.Button(BUTTON_PIN);
    button.on('press', toggleLedRef);
    
    this.repl.inject({board, led}); //for debugging
    this.i2cConfig(5000);

    // adc default index: custom, control, light, temp
    // set ctrl reg on 1st read and discard read from prev ctrl;
    this.i2cReadOnce(ADC_I2C_ADDR, TEMP_ADC_CTRL, 1);
    this.i2cRead(ADC_I2C_ADDR, 1, bytes => {
        adcRef.push({
            temp: bytes[0],
            timestamp: FIREBASE_TIMESTAMP
        });
    });
});