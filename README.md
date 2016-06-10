# Real-time Cloud-based Home Automation (Sensor Backend)
Continuous Assessment for SG4211 Cloud Computing.
Raspberry Pi (RPi) running Johnny-five over NodeJS and Firebase.

## Setup
1. For RPi v1 and v2 (not sure about v3) install [WiringPi](wiringpi.com/download-and-install).

2. For RPi v2 and up (ARMv7), install the latest NodeJS from [NodeSource](github.com/nodesource/distributions)
following their Debian instructions. For RPi v1, install the latest ARMv6 binaries from
[NodeJS Downloads](nodejs.org/en/download).

3. Include `service-account-credentials.json` to root of app as per the Firebase API requirements.

4. Create `config.json` based on `config.json.sample`.

5. Run `npm install` at the root of the project.

6. Make sure the I2C devices required are connected before running.