// firebase setup
var firebase = require('firebase');
const FIREBASE_TIMESTAMP = firebase.database.ServerValue.TIMESTAMP;
firebase.initializeApp({
    serviceAccount: 'service-account-credentials.json',
    databaseURL: 'https://cloud-team5.firebaseio.com'
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


// notification setup
const TEMP_THRESHOLD = 50;
var config = require('./config');
var pbConfig = config.pushbullet;
var PushBullet = require('pushbullet');
var pusher = new PushBullet(pbConfig.apiKey);
const PB_MESSAGE = `Your temperature has exceeded a dangerous level of ${TEMP_THRESHOLD}\u2103.`;
const PB_TITLE = `Temperature Sensor Alert (${TEMP_THRESHOLD}\u2103)`;
var isMessageSent = false;
var pushTempAlertMessage = pusher.note.bind(pusher, pbConfig.deviceId, PB_TITLE, PB_MESSAGE, (err, res) => {
    if (err) return console.error(err);
    console.log(res);
});


// board setup
var raspi = require('raspi-io');
var five = require('johnny-five');
var board = new five.Board({
    io: new raspi()
});

const ADC_I2C_ADDR = 0x48;
const TEMP_ADC_CTRL = 2;
const LED_PIN = 'GPIO26'; //pin 37
const BUTTON_PIN = 'GPIO19'; //pin 35

// temperature conversion
const THERMISTOR_NOMINAL = 10000;
const TEMPERATURE_NOMINAL = 25;
const B_COEFF = 3950;
const SERIES_RESISTOR = 10000;
const K_C_OFFSET = 273.15;
const ADC_MAX_VALUE = 255;

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
    this.i2cConfig(2000);

    // adc default index: custom, control, light, temp
    // set ctrl reg on 1st read and discard read from prev ctrl;
    this.i2cReadOnce(ADC_I2C_ADDR, TEMP_ADC_CTRL, 1);
    this.i2cRead(ADC_I2C_ADDR, TEMP_ADC_CTRL, 1, bytes => {
        var resistance = SERIES_RESISTOR / (ADC_MAX_VALUE / bytes[0] - 1);

        var steinhart = Math.log(resistance / THERMISTOR_NOMINAL) / B_COEFF;    // 1/B * ln(R/Ro)
        steinhart += 1 / (TEMPERATURE_NOMINAL + K_C_OFFSET);                    // + (1/To)
        steinhart = 1 / steinhart - K_C_OFFSET;                                 // Invert and convert to C

        adcRef.push({
            temp: steinhart,
            timestamp: FIREBASE_TIMESTAMP
        });

        if (steinhart < TEMP_THRESHOLD) {
            if (isMessageSent) isMessageSent = false;
            return;
        }

        // else >= TEMP_THRESHOLD
        if (isMessageSent) return;

        pushTempAlertMessage();
        isMessageSent = true;
    });
});