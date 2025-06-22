#!/bin/bash

echo "Starting Parley development servers..."

# Check if .env exists in backend
if [ ! -f backend/.env ]; then
    echo "Creating .env file from example..."
    cp backend/.env.example backend/.env
    echo "Please edit backend/.env and add your API keys!"
fi

# Start backend in background
echo "Starting backend server..."
cd backend && python -m uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend
echo "Starting frontend server..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Servers started!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait