<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Xóa permissions cũ
        Permission::query()->delete();

        $admin = Role::firstOrCreate(['name' => 'Admin']);
        $manager = Role::firstOrCreate(['name' => 'Manager']);
        $staff = Role::firstOrCreate(['name' => 'Staff']);

        // Permissions đầy đủ - bỏ manage, chỉ giữ view/create/update/delete
        $permissionNames = [
            // Dashboard & POS
            'dashboard.view',
            'pos.access',

            // Sản phẩm
            'product.view',
            'product.create',
            'product.update',
            'product.delete',

            // Khách hàng
            'customer.view',
            'customer.create',
            'customer.update',
            'customer.delete',

            // Nội dung (Content Structures)
            'content.view',
            'content.create',
            'content.update',
            'content.delete',

            // Mã giảm giá
            'discount.view',
            'discount.create',
            'discount.update',
            'discount.delete',

            // Đơn hàng
            'order.view',
            'order.create',
            'order.update',
            'order.delete',

            // Thanh toán
            'payment.view',
            'payment.update',

            // Tin nhắn
            'chat.view',
            'chat.reply',
            'chat.delete',

            // Thông báo
            'notification.view',
            'notification.create',
            'notification.update',
            'notification.delete',

            // Người dùng
            'user.view',
            'user.create',
            'user.update',
            'user.delete',

            // Vai trò
            'role.view',
            'role.create',
            'role.update',
            'role.delete',
        ];

        $permissions = [];
        foreach ($permissionNames as $name) {
            $permissions[] = Permission::firstOrCreate(['name' => $name]);
        }

        // Admin có tất cả quyền
        $admin->permissions()->sync(collect($permissions)->pluck('id')->toArray());

        // Manager có quyền quản lý sản phẩm, đơn hàng, khách hàng, chat, nội dung
        $managerPerms = Permission::whereIn('name', [
            'dashboard.view',
            'pos.access',
            
            'product.view',
            'product.create',
            'product.update',
            'product.delete',
            
            'customer.view',
            'customer.create',
            'customer.update',
            'customer.delete',
            
            'content.view',
            'content.create',
            'content.update',
            'content.delete',
            
            'discount.view',
            'discount.create',
            'discount.update',
            
            'order.view',
            'order.create',
            'order.update',
            
            'payment.view',
            
            'chat.view',
            'chat.reply',
            
            'notification.view',
        ])->pluck('id')->toArray();
        $manager->permissions()->sync($managerPerms);

        // Staff chỉ xem và POS
        $staffPerms = Permission::whereIn('name', [
            'dashboard.view',
            'pos.access',
            'product.view',
            'customer.view',
            'order.view',
            'order.create',
            'chat.view',
            'chat.reply',
        ])->pluck('id')->toArray();
        $staff->permissions()->sync($staffPerms);
    }
}