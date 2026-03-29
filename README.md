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
## Build from Source (For Developers)

### Required Software

1. **Node.js** (v18 or higher)

   - Download: https://nodejs.org

2. **Java 17 JDK**

   - Linux: `sudo apt install openjdk-17-jdk`
   - Mac: `brew install openjdk@17`
   - Windows: Download from https://adoptium.net

3. **Android SDK**
   - Download Android Studio: https://developer.android.com/studio
   - Or just the command-line tools

### Build Commands

```bash
# 1. Install dependencies
npm install

# 2. Set Java environment
# Linux:
export JAVA_HOME=/opt/jdk-17
export PATH=$JAVA_HOME/bin:$PATH

# 3. Set Android SDK (if needed)
export ANDROID_HOME=$HOME/Android/Sdk

# 4. Build the APK
cd android
./gradlew assembleRelease

# 5. APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

### Running with Metro (Development)

```bash
# Start Metro bundler
npx react-native start --port 8083

# In another terminal, install APK
adb install android/app/build/outputs/apk/release/app-release.apk
```

---
## Install APK (For Users)

### Step 1: Enable Unknown Sources

Before installing, you need to allow apps from unknown sources:

- Go to **Settings** → **Apps** → **Special access** → **Install unknown apps**
- Find your **File Manager** (or Browser) and enable "Allow from this source"

### Step 2: Get the APK

1. Download `app-release.apk` from this repository
2. Transfer the file to your phone (via USB, Google Drive, email, etc.)

### Step 3: Install

1. Open your **File Manager** app
2. Find and tap the `app-release.apk` file
3. Tap **Install** (or **Install anyway** if warned)
4. Wait for installation to complete
5. Tap **Open** to launch the app

### Step 4: Grant Permissions

When you first open the app, grant these permissions when asked:

- **Microphone** - Required for voice commands
- **Camera** - Required for describing surroundings
- **Location** - Required for navigation

### Step 5: Start Using

1. Open the **CVision** app
2. **Triple-tap** anywhere on the screen to wake it
3. Say **"Help"** to hear all available commands

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

- Grant microphone and location permission in settings
- Triple-tap to wake first
- Make sure no other app is using the microphone

**Camera not working?**

- Grant camera permission in phone settings
- Use in good lighting
- Try closing and reopening the app

**"Command not recognized"?**

- Speak clearly, close to the phone
- Say "help" to confirm it's listening

**APK won't install?**

- Make sure "Install unknown apps" is enabled for your file manager
- Uninstall previous version first from phone settings

---


## Tech Stack

- **Framework**: React Native 0.73.4
- **Language**: TypeScript + Kotlin
- **Speech**: Android SpeechRecognizer
- **TTS**: Android TextToSpeech
- **Camera**: CameraX + ML Kit
- **Maps**: OpenStreetMap + OpenRouteService

---

MIT License
