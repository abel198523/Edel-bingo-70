# Chewatabingo - Multiplayer Bingo Game

## Overview
Real-time multiplayer Bingo game with wallet system, Telegram bot integration, and WebSocket-based gameplay. The project is designed for Render deployment.

## Project Structure
```
/
├── server.js           # Main Express server with WebSocket and API endpoints
├── bot.js              # Telegram bot with registration and play functionality
├── db/
│   └── database.js     # PostgreSQL database initialization
├── models/
│   ├── User.js         # User model
│   ├── Wallet.js       # Wallet model
│   └── Game.js         # Game model
├── public/
│   ├── index.html      # Main game frontend
│   ├── game.js         # Telegram WebApp integration script
│   ├── styles.css      # Game styles
│   └── script.js       # Game frontend logic
└── package.json        # Dependencies
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `RENDER_SERVER_URL` - Render deployment URL (for bot WebApp)
- `JWT_SECRET` - JWT secret key
- `PORT` - Server port (10000 for Render, 5000 for development)
- `NODE_ENV` - Environment (production/development)

## API Endpoints
- `POST /api/register` - Register user via phone number (Telegram userId + phoneNumber)
- `GET /api/wallet/:userId` - Get user wallet balance (by Telegram userId)
- `POST /api/bet` - Place a bet (userId + stakeAmount)
- `POST /api/auth/register` - Standard registration
- `POST /api/auth/login` - Standard login

## Telegram Bot Features
- `/start` - Display Register and Play buttons
- Register button - Share phone contact for registration (10 ETB bonus)
- Play button - Open WebApp for gameplay

## Database Schema
- `users` - User accounts (id SERIAL PK, telegram_id BIGINT UNIQUE, username, phone_number, is_registered)
- `wallets` - User wallet balances (references users.id)
- `transactions` - Transaction history
- `games` - Game sessions
- `game_participants` - Game participants

## Recent Changes
- December 8, 2025: Complete game flow fixes - confirm_card, phase changes, Bingo validation
- December 8, 2025: Added server-side Bingo validation (data/cards.js with validateBingo)
- December 8, 2025: Fixed frontend phase handling - now properly resets between rounds
- December 8, 2025: Added master grid rendering (75 numbers) and number tracking
- December 5, 2025: Fixed schema/model compatibility - restored serial id PK, added telegram_id BIGINT column
- December 5, 2025: Updated API endpoints to use telegram_id for lookups and wallets table for balance
- December 5, 2025: Added Telegram bot integration (bot.js)
- December 5, 2025: Added /api/register, /api/wallet/:userId, /api/bet endpoints
- December 5, 2025: Added game.js for Telegram WebApp integration

## Game Flow
1. Selection Phase (45 seconds) - Players select and confirm cards
2. Game Phase - Numbers are called every 3 seconds, players mark their cards
3. Bingo Claim - Server validates with validateBingo() function
4. Winner Display (5 seconds) - Shows winner info
5. Returns to Selection Phase for new round

## Deployment
This project is configured for Render deployment (port 10000). Do not convert to Replit hosting.
