<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Tạo admin user
        $admin = User::updateOrCreate(
            ['email' => 'hoanganmsc@gmail.com'],
            [
                'name' => 'Adrian',
                'password' => Hash::make('123456'),
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Lấy role Admin
        $adminRole = Role::where('name', 'Admin')->first();

        if ($adminRole) {
            // Gán role Admin cho user
            DB::table('role_user')->updateOrInsert(
                ['user_id' => $admin->id, 'role_id' => $adminRole->id],
                ['user_id' => $admin->id, 'role_id' => $adminRole->id]
            );

            // Đảm bảo Admin role có tất cả permissions
            $allPermissions = Permission::all()->pluck('id')->toArray();
            $adminRole->permissions()->sync($allPermissions);
        }
    }
}