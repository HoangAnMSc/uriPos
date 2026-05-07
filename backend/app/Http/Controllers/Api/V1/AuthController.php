<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $this->revokeAdminTokens($user);
        $this->markUserLoggedIn($user);
        $token = $user->createToken('admin_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'user' => $user->fresh(),
            'token' => $token,
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email hoac mat khau khong dung'],
            ]);
        }

        $this->revokeAdminTokens($user);
        $this->markUserLoggedIn($user);
        $token = $user->createToken('admin_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'user' => $user->fresh(),
            'token' => $token,
            'roles' => $user->roleNames(),
            'permissions' => $user->permissionNames(),
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar,
            'roles' => $user->roleNames(),
            'permissions' => $user->permissionNames(),
        ]);
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|string|max:2048',
        ]);

        $user = $request->user();
        $user->avatar = $request->avatar;
        $user->save();

        return response()->json([
            'success' => true,
            'avatar' => $user->avatar,
        ]);
    }

    public function logout(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($token = $user->currentAccessToken()) {
            $token->delete();
        }

        $hasActiveAdminToken = $user->tokens()
            ->where('name', 'admin_token')
            ->exists();

        $user->forceFill([
            'last_seen_at' => now(),
            'last_logout_at' => $hasActiveAdminToken ? null : now(),
        ])->saveQuietly();

        return response()->json([
            'success' => true,
            'message' => 'Logged out',
        ]);
    }

    private function markUserLoggedIn(User $user): void
    {
        $user->forceFill([
            'last_login_at' => now(),
            'last_seen_at' => now(),
            'last_logout_at' => null,
        ])->saveQuietly();
    }

    private function revokeAdminTokens(User $user): void
    {
        $user->tokens()
            ->where('name', 'admin_token')
            ->delete();
    }
}
