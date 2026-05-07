<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use App\Models\NotificationLike;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $notifications = Notification::query()
            ->join('notification_user', 'notifications.id', '=', 'notification_user.notification_id')
            ->where('notification_user.user_id', $user->id)
            ->select([
                'notifications.*',
                'notification_user.is_read',
                'notification_user.read_at',
            ])
            ->orderBy('notifications.created_at', 'desc')
            ->get()
            ->map(function ($notification) use ($user) {
                $isLiked = DB::table('notification_likes')
                    ->where('notification_id', $notification->id)
                    ->where('user_id', $user->id)
                    ->exists();

                return [
                    'id' => $notification->id,
                    'message' => $notification->message,
                    'type' => $notification->type,
                    'isRead' => (bool) $notification->is_read,
                    'readAt' => $notification->read_at,
                    'likeCount' => (int) $notification->like_count,
                    'isLiked' => $isLiked,
                    'createdAt' => $notification->created_at->toDateTimeString(),
                ];
            });

        return response()->json(['data' => $notifications]);
    }

    public function unreadCount(Request $request)
    {
        $user = $request->user();

        $count = DB::table('notification_user')
            ->where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'count' => $count,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string',
            'type' => 'nullable|in:info,success,warning,error',
            'userIds' => 'nullable|array',
            'userIds.*' => 'exists:users,id',
            'roleIds' => 'nullable|array',
            'roleIds.*' => 'exists:roles,id',
            'sendToAll' => 'nullable|boolean',
        ]);

        $notification = Notification::create([
            'title' => '',
            'message' => $validated['message'],
            'type' => $validated['type'] ?? 'info',
            'created_by' => $request->user()->id,
        ]);

        if ($validated['sendToAll'] ?? false) {
            $userIds = User::pluck('id')->toArray();
            $recipientType = 'all';
            $recipientIds = [];
        } elseif (!empty($validated['roleIds'])) {
            $userIds = DB::table('role_user')
                ->whereIn('role_id', $validated['roleIds'])
                ->pluck('user_id')
                ->unique()
                ->toArray();
            $recipientType = 'role';
            $recipientIds = $validated['roleIds'];
        } else {
            $userIds = $validated['userIds'] ?? [];
            $recipientType = 'user';
            $recipientIds = $userIds;
        }

        $notification->update([
            'recipient_type' => $recipientType,
            'recipient_ids'  => $recipientIds,
        ]);

        if (!empty($userIds)) {
            $attachData = [];
            foreach ($userIds as $userId) {
                $attachData[$userId] = [
                    'is_read' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            $notification->users()->attach($attachData);
        }

        return response()->json([
            'message' => 'Notification created successfully',
            'data' => [
                'id' => $notification->id,
                'message' => $notification->message,
                'type' => $notification->type,
            ],
        ], 201);
    }

    public function markAsRead(Request $request, string $id)
    {
        $user = $request->user();

        $updated = DB::table('notification_user')
            ->where('notification_id', $id)
            ->where('user_id', $user->id)
            ->update([
                'is_read' => true,
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        if ($updated === 0) {
            return response()->json([
                'message' => 'Notification not found',
            ], 404);
        }

        return response()->json([
            'message' => 'Notification marked as read',
        ]);
    }

    public function markAllAsRead(Request $request)
    {
        $user = $request->user();

        DB::table('notification_user')
            ->where('user_id', $user->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json([
            'message' => 'All notifications marked as read',
        ]);
    }

    public function destroy(string $id)
    {
        $notification = Notification::findOrFail($id);
        $notification->delete();

        return response()->json(['message' => 'Notification deleted successfully']);
    }

    // Admin: xem tất cả thông báo đã tạo
    public function adminIndex(Request $request)
    {
        $notifications = Notification::orderBy('created_at', 'desc')->get()->map(function ($n) {
            $recipientCount = DB::table('notification_user')->where('notification_id', $n->id)->count();
            $readCount = DB::table('notification_user')->where('notification_id', $n->id)->where('is_read', true)->count();
            return [
                'id'            => $n->id,
                'message'       => $n->message,
                'type'          => $n->type,
                'likeCount'     => (int) $n->like_count,
                'recipientCount'=> $recipientCount,
                'readCount'     => $readCount,
                'recipientType' => $n->recipient_type ?? 'all',
                'recipientIds'  => $n->recipient_ids ?? [],
                'createdAt'     => $n->created_at->toDateTimeString(),
            ];
        });

        return response()->json(['data' => $notifications]);
    }

    // Admin: xem danh sách người đã tym
    public function likers(Request $request, string $id)
    {
        $likers = DB::table('notification_likes')
            ->join('users', 'notification_likes.user_id', '=', 'users.id')
            ->where('notification_likes.notification_id', $id)
            ->select('users.id', 'users.name', 'users.email', 'notification_likes.created_at as likedAt')
            ->orderBy('notification_likes.created_at', 'desc')
            ->get();

        return response()->json(['data' => $likers]);
    }

    // Admin: sửa thông báo (nội dung + loại + người nhận)
    public function update(Request $request, string $id)
    {
        $notification = Notification::findOrFail($id);

        $validated = $request->validate([
            'message'    => 'required|string',
            'type'       => 'nullable|in:info,success,warning,error',
            'sendToAll'  => 'nullable|boolean',
            'userIds'    => 'nullable|array',
            'userIds.*'  => 'exists:users,id',
            'roleIds'    => 'nullable|array',
            'roleIds.*'  => 'exists:roles,id',
        ]);

        $notification->update([
            'message' => $validated['message'],
            'type'    => $validated['type'] ?? $notification->type,
        ]);

        // Cập nhật người nhận nếu có truyền lên
        if (array_key_exists('sendToAll', $validated) || array_key_exists('userIds', $validated) || array_key_exists('roleIds', $validated)) {
            if ($validated['sendToAll'] ?? false) {
                $userIds = User::pluck('id')->toArray();
                $recipientType = 'all';
                $recipientIds = [];
            } elseif (!empty($validated['roleIds'])) {
                $userIds = DB::table('role_user')
                    ->whereIn('role_id', $validated['roleIds'])
                    ->pluck('user_id')
                    ->unique()
                    ->toArray();
                $recipientType = 'role';
                $recipientIds = $validated['roleIds'];
            } else {
                $userIds = $validated['userIds'] ?? [];
                $recipientType = 'user';
                $recipientIds = $userIds;
            }

            $notification->update([
                'recipient_type' => $recipientType,
                'recipient_ids'  => $recipientIds,
            ]);

            // Sync: giữ is_read của người đã có, thêm mới người chưa có, xóa người không còn trong list
            $existing = DB::table('notification_user')
                ->where('notification_id', $id)
                ->pluck('user_id')
                ->toArray();

            $toAdd    = array_diff($userIds, $existing);
            $toRemove = array_diff($existing, $userIds);

            if (!empty($toRemove)) {
                DB::table('notification_user')
                    ->where('notification_id', $id)
                    ->whereIn('user_id', $toRemove)
                    ->delete();
            }

            foreach ($toAdd as $userId) {
                DB::table('notification_user')->insert([
                    'notification_id' => $id,
                    'user_id'         => $userId,
                    'is_read'         => false,
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]);
            }
        }

        return response()->json([
            'message' => 'Updated successfully',
            'data'    => ['id' => $notification->id, 'message' => $notification->message, 'type' => $notification->type],
        ]);
    }

    public function toggleLike(Request $request, string $id)
    {
        $user = $request->user();

        $existing = DB::table('notification_likes')
            ->where('notification_id', $id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            // Bỏ tym
            DB::table('notification_likes')
                ->where('notification_id', $id)
                ->where('user_id', $user->id)
                ->delete();

            Notification::where('id', $id)->decrement('like_count');
            $isLiked = false;
        } else {
            // Thêm tym
            DB::table('notification_likes')->insert([
                'notification_id' => $id,
                'user_id' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Notification::where('id', $id)->increment('like_count');
            $isLiked = true;
        }

        $likeCount = (int) Notification::where('id', $id)->value('like_count');

        return response()->json([
            'isLiked' => $isLiked,
            'likeCount' => $likeCount,
        ]);
    }
}
