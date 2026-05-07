# Sửa lỗi React Frontend

## Các vấn đề đã sửa

### 1. API Authentication
- Thêm routes public cho products và content structures không cần authentication
- Routes: `/api/v1/public/products` và `/api/v1/public/content-structures`
- Cập nhật axios interceptor để tự động thêm token từ localStorage

### 2. CORS Configuration
- Cập nhật `backend/config/cors.php` để cho phép cả 2 frontend:
  - Admin: `http://localhost:5173`
  - Customer: `http://localhost:5174`
- Cập nhật `SANCTUM_STATEFUL_DOMAINS` trong `.env`

### 3. Content Structures thay vì Menu tĩnh
- Cập nhật `ExploreMenu.jsx` để fetch content structures từ database
- Hiển thị danh mục dạng box với tên thay vì icon
- Thêm category "Tất cả" để hiển thị tất cả sản phẩm

### 4. Products từ Database
- Cập nhật `StoreContext.jsx` để fetch products từ API
- Map products với content structure ID làm category
- Filter chỉ hiển thị sản phẩm đã publish và còn hàng

### 5. Customer Authentication
- Sửa token key từ `customer_token` thành `customerToken` (consistent)
- Axios interceptor tự động thêm token vào mọi request
- CustomerAuth component đã hoạt động đúng

## Cấu trúc dữ liệu

### Product Response
```json
{
  "id": "uuid",
  "name": "string",
  "thumbnail": "url",
  "price": 100000,
  "quantity": 10,
  "shortDesc": "string",
  "isPublish": true,
  "contentStructureId": 1
}
```

### Content Structure Response
```json
{
  "data": [
    {
      "id": 1,
      "name": "Khách hàng",
      "slug": "customer"
    }
  ]
}
```

## Cách sử dụng

### Khởi động Backend
```bash
cd backend
php artisan serve
```

### Khởi động Frontend Customer
```bash
cd react-frontend
npm run dev
```

### Khởi động Frontend Admin
```bash
cd react-admin
npm run dev
```

## Lưu ý
- Backend chạy trên: `http://127.0.0.1:8000`
- Admin frontend: `http://localhost:5173`
- Customer frontend: `http://localhost:5174`
- Đảm bảo database đã có content structures và products
- Products phải có `publish = true` và `quantity > 0` để hiển thị
