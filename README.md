# Send2AppleTV

Chrome extension that adds a "Send to Apple TV" button on YouTube videos, sending them to your Apple TV via Home Assistant.

## Setup

1. **Install Extension**
   - Download and extract this repository
   - Go to `chrome://extensions/`, enable "Developer mode"
   - Click "Load unpacked" and select the `send-to-atv` folder

2. **Configure Home Assistant**
   - Add Apple TV integration in Settings → Devices & Services
   - Create a long-lived access token in your Profile → Security
   - Note your Apple TV entity ID (e.g., `media_player.living_room_apple_tv`)

3. **Configure Extension**
   - Click the extension icon in Chrome
   - Enter your Home Assistant URL, access token, and Apple TV entity ID
   - Click Save

## Usage

Go to any YouTube video and click the "Send to Apple TV" button next to Like/Share buttons.

**New in v1.2.0:** The extension now automatically turns on your Apple TV if it's powered off or in standby mode before sending the video.

## Requirements

- Apple TV with YouTube app
- Home Assistant with Apple TV integration
- Chrome browser

## License

MIT License