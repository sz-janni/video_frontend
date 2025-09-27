# Video Box Drawing App

React application for drawing boxes over video using Konva.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Add your video file:
   - Place a video file named `sample.mp4` in `public/assets/`
   - Or update the video src path in `App.js`

3. Start the development server:
```bash
npm start
```

## Features

- Draw boxes by clicking and dragging
- Select boxes to resize and move them
- Delete selected boxes
- Save box coordinates to console

## Usage

1. Click "Add Box" and draw rectangles on the video
2. Click boxes to select them (green highlight)
3. Drag corners to resize, drag center to move
4. Use "Delete Selected" to remove boxes
5. Click "Save" to log coordinates to console

## Electron usage

### Preview in Electron
1. Build the React frontend:
```bash
npm run build
```
2. Launch the Electron shell:
```bash
npm run electron:serve
```

### Live reload during development
1. Start the React dev server:
```bash
npm start
```
2. In another terminal (Windows example), point Electron at the dev URL:
```bash
set ELECTRON_START_URL=http://localhost:3000 && electron .
```

### Windows installer
Generate an installer into `dist/`:
```bash
npm run electron:build
```
