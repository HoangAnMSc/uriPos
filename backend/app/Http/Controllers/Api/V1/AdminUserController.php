<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function index()
    {
        $users = User::with('roles')
            ->withCount([
                'tokens as admin_tokens_count' => function ($query) {
                    $query->where('name', 'admin_token');
                },
            ])
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $users->map(fn (User $user) => $this->transformUser($user)),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role_ids' => 'array',
            'role_ids.*' => 'integer|exists:roles,id',
        ]);

        $user = User::create([
            'name' => trim((string) $request->name),
            'email' => trim((string) $request->email),
            'password' => Hash::make((string) $request->password),
        ]);

        $roleIds = $request->input('role_ids', []);
        $user->roles()->sync($roleIds);

        return response()->json([
            'success' => true,
            'data' => $this->transformUser($this->reloadUser($user->id)),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'password' => 'nullable|string|min:6',
        ]);

        $payload = [
            'name' => trim((string) $validated['name']),
            'email' => trim((string) $validated['email']),
        ];

        if (!empty($validated['password'])) {
            $payload['password'] = Hash::make((string) $validated['password']);
        }

        $user->update($payload);

        return response()->json([
            'success' => true,
            'data' => $this->transformUser($this->reloadUser($user->id)),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ((int) $request->user()->id === (int) $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own account',
            ], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Deleted',
        ]);
    }

    public function updateRoles(Request $request, $id)
    {
        $validated = $request->validate([
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'integer|exists:roles,id',
        ]);

        $user = User::with('roles')->findOrFail($id);

        if ($request->user()->id === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot change your own role',
            ], 422);
        }

        $roleIds = $validated['role_ids'] ?? [];
        $user->roles()->sync($roleIds);

        return response()->json([
            'success' => true,
            'data' => $this->transformUser($this->reloadUser($user->id)),
        ]);
    }

    private function reloadUser($id): User
    {
        return User::with('roles')
            ->withCount([
                'tokens as admin_tokens_count' => function ($query) {
                    $query->where('name', 'admin_token');
                },
            ])
            ->findOrFail($id);
    }

    private function transformUser(User $user): array
    {
        $isOnline = (int) ($user->admin_tokens_count ?? 0) > 0;
        $offlineSince = $user->last_logout_at ?? $user->last_seen_at ?? $user->last_login_at;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->pluck('name')->toArray(),
            'is_online' => $isOnline,
            'last_login_at' => optional($user->last_login_at)->toISOString(),
            'last_seen_at' => optional($user->last_seen_at)->toISOString(),
            'last_logout_at' => optional($user->last_logout_at)->toISOString(),
            'offline_since' => optional($offlineSince)->toISOString(),
        ];
    }
}
