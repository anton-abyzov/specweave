---
title: "Voice calls with a SpecWithCode coordinator"
sidebar_label: Voice calls
description: "Call a project's coordinator from the composer: you speak, it answers aloud, and you can interrupt. Speech recognition and the default voice run on your Mac; an ElevenLabs voice with your own key is optional."
---

# Voice calls

You can talk to a project's coordinator instead of typing. A phone button beside **Attach** in the coordinator's composer starts a call: you speak, the coordinator's answer is read back, and you can talk over it to interrupt. Voice calls arrived in SpecWithCode 1.0.5 and are in the current release.

## During a call

Four dots show what is happening: listening, transcribing, thinking and speaking. The call bar has **Mute**, **Stop** and **Hang up**.

## Speech stays on your Mac

A small helper bundled with the app transcribes what you say with Apple's on-device speech recognition and reads replies with the best voice installed on the Mac. No audio is uploaded and no speech subscription is needed. The usual model usage for the coordinator's turns still applies.

The first call asks three times, once each:

1. **Allow voice calls?** in the app. **Settings > Voice calls with the coordinator** turns calls off again.
2. The macOS microphone prompt.
3. A per-window gate: the microphone is granted only while that window has a call running.

## Choose a voice

Open **Voice settings**, the audio-wave icon beside the call button, while no call is running.

- Choose **Automatic** or any voice installed on the Mac, and a pace: **Relaxed**, **Natural** or **Brisk**.
- **Preview free voice** plays a sample without opening the microphone.
- Better system voices can be downloaded in macOS under **Accessibility > Read & Speak** (Spoken Content on earlier macOS). The app never downloads voices or changes system settings by itself.

## Optional: an ElevenLabs voice with your own key

Choose **ElevenLabs · Your own key**, enter your personal ElevenLabs API key and a voice ID, and save. Reply text then goes to ElevenLabs and is billed to that key's account; your microphone audio is still transcribed on the Mac.

The key is encrypted with the operating system's secure storage on that Mac and never shown again; settings with it are never synced to other clients. If secure storage is unavailable, the app refuses to save the key. Remove the key to go back to the free on-device voice. A managed premium voice is labelled **Coming soon**; there is nothing to buy today.

Reference: [Voice calls](https://github.com/anton-abyzov/specwithcode/blob/main/docs/voice-calls.md) in the SpecWithCode repository.
