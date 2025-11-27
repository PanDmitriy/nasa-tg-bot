#!/bin/sh
set -e

# Запускаем приложение
exec node dist/app/index.js
