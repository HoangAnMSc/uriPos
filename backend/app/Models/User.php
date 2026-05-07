<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar',
        'last_login_at',
        'last_seen_at',
        'last_logout_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_login_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'last_logout_at' => 'datetime',
        ];
    }

    public function roles()
    {
        return $this->belongsToMany(\App\Models\Role::class)->withTimestamps();
    }

    public function hasRole(string $roleName): bool
    {
        return $this->roles()->where('name', $roleName)->exists();
    }

    public function permissions()
    {
        return \App\Models\Permission::query()
            ->select('permissions.*')
            ->join('permission_role', 'permissions.id', '=', 'permission_role.permission_id')
            ->join('role_user', 'permission_role.role_id', '=', 'role_user.role_id')
            ->where('role_user.user_id', $this->id)
            ->distinct();
    }

    public function hasPermission(string $permissionName): bool
    {
        return $this->permissions()->where('permissions.name', $permissionName)->exists();
    }

    public function permissionNames(): array
    {
        return $this->permissions()->pluck('permissions.name')->toArray();
    }

    public function roleNames(): array
    {
        return $this->roles()->pluck('name')->toArray();
    }

}
