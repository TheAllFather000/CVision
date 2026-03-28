# CVision

An assistive mobile application for visually impaired users, providing real-time scene description, danger detection, and building accessibility information.

## Features

### MVP (31-hour sprint)

- **Real-time Environmental Scanning**: Continuous camera analysis for objects and obstacles
- **Directional Alerts**: Announces objects with direction (ahead, left, right) and distance
- **Priority-based Warnings**: Critical hazards announced first with haptic feedback
- **Voice Commands**: Full voice control interface with natural language
- **Accessibility Checker**: Look up building accessibility ratings via address

### Voice Commands

- "Scan" - Confirm scanning is active
- "Dangers" or "Hazards" - Focus on hazard scanning
- "Navigate to [address]" - Check building accessibility
- "Pause" - Pause scanning temporarily
- "Stop" - Stop current speech
- "Help" - List available commands

## Tech Stack

- React Native 0.73
- TypeScript
- Vision Camera (camera access)
- OpenAI GPT-4 Vision (scene analysis)
- Google Places API (accessibility data)
- React Native TTS (text-to-speech)
- React Native Voice (speech recognition)

## Project Structure

```
CVision/
├── src/
│   ├── components/    # UI components
│   │   ├── CameraView.tsx
│   │   ├── VoiceControl.tsx
│   │   └── AccessibilityBadge.tsx
│   ├── services/      # Core services
│   │   ├── visionAI.ts
│   │   ├── tts.ts
│   │   ├── accessibility.ts
│   │   └── navigation.ts
│   ├── hooks/         # React hooks
│   ├── context/       # App state
│   ├── utils/         # Helpers
│   └── constants/     # Config
├── __tests__/         # Tests
└── assets/            # Static files
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Add your API keys to `.env`

4. Run the app:

   ```bash
   # iOS
   npx react-native run-ios

   # Android
   npx react-native run-android
   ```

## Hackathon Sprint Plan

### Day 1 (8 hours)

- Camera integration
- AI vision pipeline
- Basic UI setup

### Day 2 (8 hours)

- Voice input/output
- Command processing
- Danger detection

### Day 3 (8 hours)

- Accessibility API integration
- Polish and testing
- Edge case handling

### Day 4 (7 hours)

- Final polish
- Demo preparation
- Documentation

## Accessibility

CVision follows accessibility best practices:

- Large touch targets (minimum 44x44 points)
- High contrast color scheme
- Voice feedback for all interactions
- Compatible with screen readers
- Simple gesture-based navigation
