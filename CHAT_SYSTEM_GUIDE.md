# Hướng dẫn sử dụng hệ thống Chat

## Tổng quan
Hệ thống chat cho phép khách hàng nhắn tin trực tiếp với admin/quản trị viên.

## Tính năng

### Phía Khách hàng (react-frontend)
1. **Đăng nhập/Đăng ký**: Chỉ cần số điện thoại (10 số), không cần mật khẩu
2. **Chat widget**: Nút chat nổi ở góc phải màn hình
3. **Gửi/nhận tin nhắn**: Real-time với auto-refresh mỗi 3 giây
4. **Hiển thị trạng thái**: Hiển thị tên khách hàng trên navbar khi đã đăng nhập

### Phía Admin (react-admin)
1. **Danh sách cuộc hội thoại**: Xem tất cả khách hàng đã nhắn tin
2. **Gửi/nhận tin nhắn**: Trả lời tin nhắn từ khách hàng
3. **Đếm tin nhắn chưa đọc**: Badge hiển thị số tin nhắn mới
4. **Auto-refresh**: Tự động cập nhật mỗi 3 giây

## API Endpoints

### Customer Auth
- `POST /api/v1/customer/register` - Đăng ký (name, phone)
- `POST /api/v1/customer/login` - Đăng nhập (phone)
- `GET /api/v1/customer/me` - Lấy thông tin customer
- `POST /api/v1/customer/logout` - Đăng xuất

### Customer Chat
- `GET /api/v1/customer/conversation` - Lấy cuộc hội thoại của customer
- `GET /api/v1/customer/messages` - Lấy tin nhắn của customer
- `POST /api/v1/customer/messages` - Gửi tin nhắn (message)

### Admin Chat
- `GET /api/v1/chat/conversations` - Lấy danh sách cuộc hội thoại
- `GET /api/v1/chat/conversations/{id}/messages` - Lấy tin nhắn theo conversation
- `POST /api/v1/chat/messages` - Gửi tin nhắn (conversationId, customerId, message)
- `GET /api/v1/chat/unread-count` - Đếm tin nhắn chưa đọc

## Database Schema

### conversations
- id (uuid)
- customer_id (uuid)
- user_id (uuid, nullable)
- last_message_at (timestamp)

### messages
- id (uuid)
- conversation_id (uuid)
- sender_type (enum: 'customer', 'user')
- sender_id (uuid)
- message (text)
- is_read (boolean)
- created_at (timestamp)

## Cách sử dụng

### Khách hàng
1. Truy cập website (react-frontend)
2. Click "sign in" trên navbar
3. Nhập số điện thoại để đăng nhập/đăng ký
4. Click nút chat ở góc phải màn hình
5. Gửi tin nhắn cho admin

### Admin
1. Đăng nhập vào admin panel (react-admin)
2. Click icon "Tin nhắn" trên sidebar
3. Chọn khách hàng từ danh sách
4. Gửi tin nhắn trả lời

## Components

### Frontend Customer
- `CustomerAuth.jsx` - Component đăng nhập/đăng ký
- `CustomerChat.jsx` - Widget chat nổi
- `Navbar.jsx` - Hiển thị thông tin customer và nút logout

### Frontend Admin
- `Chat.jsx` - Trang quản lý chat
- Sidebar - Icon tin nhắn với badge

## Lưu ý
- Token được lưu trong localStorage với key `customerToken`
- Thông tin customer được lưu trong localStorage với key `customerData`
- Auto-refresh chỉ hoạt động khi chat window đang mở
- Tin nhắn tự động đánh dấu đã đọc khi xem
