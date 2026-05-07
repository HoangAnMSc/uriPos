#!/bin/bash

# Script để reset database và seed lại data
# Sử dụng: bash reset-db.sh

echo "🔄 Đang reset database..."
php artisan migrate:fresh

echo "🌱 Đang seed data..."
php artisan db:seed

echo "✅ Hoàn thành!"
echo ""
echo "📧 Admin login:"
echo "   Email: hoanganmsc@gmail.com"
echo "   Password: 123456"
echo "   Permissions: Full (23 permissions)"
