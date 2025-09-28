#!/bin/bash
echo "🌌 DRAINER COMMAND PANEL 🌌"
echo "==========================="
echo "1. Status"
echo "2. Reports" 
echo "3. Config"
echo "4. Exit"
read -p "Choice: " opt

case $opt in
    1) curl -s http://localhost:3001/c2/status | python3 -m json.tool ;;
    2) curl -s http://localhost:3001/c2/report | python3 -m json.tool ;;
    3) curl -s http://localhost:3001/c2/config | python3 -m json.tool ;;
    4) exit ;;
    *) echo "Invalid" ;;
esac
