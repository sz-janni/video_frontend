# Video Box Drawing App

Svelte application for drawing boxes over video using Konva.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Add your video file:
   - Place a video file named `sample.mp4` in `public/assets/`
   - Or update the video src path in `src/App.svelte`

3. Start the development server:
```bash
npm start
```

## Features

- Draw boxes by clicking and dragging
- Select boxes to resize and move them
- Delete or trim selected boxes
- Save box coordinates to a JSON file

## Usage

1. Click **Add Box** and draw rectangles on the video
2. Click boxes to select them
3. Drag handles to resize and move
4. Use **Delete Object** or **Delete Onwards** to remove
5. Click **Save** to download coordinates
