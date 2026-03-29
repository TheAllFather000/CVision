# CVision – Voice Navigation for Blind Users

**CVision** is a voice-controlled mobile application designed for blind and visually impaired users. It enables hands-free navigation and real-time environmental awareness using the phone’s camera and GPS.

---

## Overview

CVision focuses on accessibility through a fully voice-driven experience, allowing users to navigate and understand their surroundings without relying on visual interfaces.

---

## Features

### Voice Navigation
Say: `navigate to [destination]`  
- Provides turn-by-turn walking directions  
- Uses blind-friendly instructions (no compass-based directions like "head north")

### Scene Description
Say: `describe my surroundings`  
- Automatically captures an image using the camera  
- Detects and announces objects such as chairs, doors, and vehicles  

### Hazard Detection
- Provides audio warnings for nearby obstacles  
- Detects hazards such as poles, stairs, curbs, and vehicles  

### Location Awareness
Say: `where am I`  
- Instantly announces the user’s current location  

---

## Key Capabilities

- **Voice-First Design**  
  Minimal visual interface; all core functionality is speech-driven  

- **Triple-Tap Wake**  
  Tap anywhere three times to activate the app  

- **Vibration Feedback**  
  Haptic feedback indicates turn directions during navigation  

- **Auto Camera Capture**  
  5-second countdown before automatically capturing an image (no button interaction required)  

- **Free and Open APIs**  
  Built using:
  - OpenStreetMap  
  - OpenRouteService  
  - On-device ML Kit  
  No paid services required  

---

## Tech Stack

- React Native  
- TypeScript  
- Kotlin (Android Native)  
- ML Kit  
- OpenStreetMap  

---

## Built For

Developed for the **Isazi Consulting Accessibility Hackathon**.
