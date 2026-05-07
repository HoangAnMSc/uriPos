<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;

class RolePermissionController extends Controller
{
    // React: GET /roles
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => Role::with('permissions')->get()
        ]);
    }

    // React: GET /permissions
    public function permissions()
    {
        return response()->json([
            'success' => true,
            'data' => Permission::all()
        ]);
    }

    // React: POST /roles
    public function store(Request $request)
    {
        $validated = $request->validate([
            "name" => "required|string|max:50|unique:roles,name",
            "permission_ids" => "nullable|array",
            "permission_ids.*" => "integer|exists:permissions,id",
        ]);

        $role = Role::create([
            "name" => $validated["name"],
        ]);

        if (!empty($validated["permission_ids"])) {
            $role->permissions()->sync($validated["permission_ids"]);
        }

        return response()->json([
            "success" => true,
            "data" => $role->load("permissions"),
        ], 201);
    }

    // React: PUT /roles/{id}
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            "name" => "required|string|max:50|unique:roles,name," . $role->id,
            "permission_ids" => "nullable|array",
            "permission_ids.*" => "integer|exists:permissions,id",
        ]);

        $role->update([
            "name" => $validated["name"],
        ]);

        $role->permissions()->sync($validated["permission_ids"] ?? []);

        return response()->json([
            "success" => true,
            "data" => $role->load("permissions"),
        ]);
    }

    // React: DELETE /roles/{id}
    public function destroy($id)
    {
        $role = Role::findOrFail($id);

        if ($role->name === "admin") {
            return response()->json([
                "success" => false,
                "message" => "Cannot delete admin role"
            ], 422);
        }

        $role->permissions()->sync([]);
        $role->delete();

        return response()->json([
            "success" => true,
            "message" => "Role deleted"
        ]);
    }

    // Giữ lại nếu bà đang dùng chỗ khác
    public function assignRolesToUser(Request $request, $userId)
    {
        $validated = $request->validate([
            'role_ids' => 'required|array',
            'role_ids.*' => 'integer|exists:roles,id'
        ]);

        $user = User::findOrFail($userId);
        $user->roles()->sync($validated['role_ids']);

        return response()->json([
            'success' => true,
            'user' => $user,
            'roles' => $user->roleNames(),
            'permissions' => $user->permissionNames()
        ]);
    }

    public function assignPermissionsToRole(Request $request, $roleId)
    {
        $validated = $request->validate([
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'integer|exists:permissions,id'
        ]);

        $role = Role::findOrFail($roleId);
        $role->permissions()->sync($validated['permission_ids']);

        return response()->json([
            'success' => true,
            'role' => $role->name,
            'permissions' => $role->permissions()->pluck('name')->toArray()
        ]);
    }
}