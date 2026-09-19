# Slip

A pocket kanban built for iPhone. Three lanes — To Do, Doing, Done — with cards you can add, edit, delete, and drag. Board state lives in local storage and stays in sync with anyone who joins the same room over peer-to-peer.

## Features

- To Do / Doing / Done columns with live card counts
- Add, edit, and delete cards (title + description)
- Long-press to drag a card onto another lane
- Swipe or tap to switch columns
- Invite codes so multiple people can work the same board
- Peer-to-peer live updates
- Local persistence on this device

## Getting started

```bash
npm install
npm run dev
```

Then open the app in a browser. Enter your name, start a board, and share the invite so someone else can join.

## Stack

React, TanStack Start, Tailwind, Zustand, WebRTC data channels.
