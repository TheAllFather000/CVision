# CVision - Voice Navigation for Blind Users

**CVision** is a voice-controlled mobile app designed for blind and visually impaired users. Navigate streets hands-free, describe your surroundings with the camera, and get audio alerts for hazards - all through voice commands.

Built for the **Isazi Consulting Accessibility Hackathon**.

---

## What It Does

- **Voice Navigation**: Say "navigate to [destination]" and get turn-by-turn walking directions
- **Scene Description**: Take photos with the camera and hear what's around you
- **Hazard Alerts**: Get warnings for obstacles, stairs, poles, and other dangers
- **Location Awareness**: Instantly hear where you are

All features work completely hands-free using voice commands.

---

**Download and use the app in 2 minutes.**

---

## Install APK

1. **Download** the APK from: `android/app/build/outputs/apk/release/app-release.apk`
2. **Transfer** it to your phone
3. **Open** the APK file to install
4. **Grant** permissions when asked (microphone, camera, location)

---

## How to Use

| Say This                   | What Happens                        |
| -------------------------- | ----------------------------------- |
| "Navigate to [place]"      | Gets walking directions             |
| "Describe my surroundings" | Takes photo, describes what it sees |
| "How far"                  | Tells you remaining distance        |
| "Where am I"               | Speaks your current location        |
| "Help"                     | Lists all commands                  |
| "Stop"                     | Cancels current action              |
| "Rest"                     | Puts app to sleep                   |

**Wake the app**: Triple-tap anywhere on screen

---

## Tips

- **Navigation**: App gives turn-by-turn directions. Phone vibrates when you need to turn.
- **Camera**: Say "describe my surroundings", wait 5 seconds - it auto-captures.
- **Triple-tap**: Use anytime to wake the app.

---

## Troubleshooting

**App doesn't hear me?**

- Grant microphone and location permission
- Triple-tap to wake first

**Camera not working?**

- Grant camera permission in settings
- Use in good lighting

**"Command not recognized"?**

- Speak clearly, close to phone
- Say "help" to confirm it's listening

---

## Build from Source (Developers)

```bash
npm install
export JAVA_HOME=/opt/jdk-17
export PATH=$JAVA_HOME/bin:$PATH
cd android && ./gradlew assembleRelease
```

---

## Tech Stack

React Native + Kotlin (Android) + ML Kit + OpenRouteService

MIT License
